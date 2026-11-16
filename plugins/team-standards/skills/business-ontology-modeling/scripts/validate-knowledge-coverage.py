"""Validate coverage records, not business truth. Requires PyYAML; writes nothing."""
import argparse
import json
from pathlib import Path
import yaml

SCHEMA = Path(__file__).resolve().parents[1] / 'assets/knowledge-schema/enterprise-knowledge-schema.yaml'

def validate_coverage(data, schema):
    errors = []
    project = data.get('project')
    contexts = data.get('contexts', [])
    if not isinstance(project, str) or not project:
        return ['project must be a nonempty stable ID']
    if not isinstance(contexts, list) or any(not isinstance(c, str) or not c for c in contexts):
        return ['contexts must be a list of stable IDs']
    if len(set(contexts)) != len(contexts) or project in contexts:
        return ['duplicate project/context identity']
    expected = {(project, key) for key in schema['project_views']}
    expected.update((c, key) for c in contexts for key in schema['context_sections'])
    rows = data.get('rows', [])
    if not isinstance(rows, list):
        return ['rows must be a list']
    seen = set()
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f'row {i}: expected object'); continue
        missing = set(schema['coverage']['row_fields']) - row.keys()
        if missing:
            errors.append(f'row {i}: missing {sorted(missing)}'); continue
        if not isinstance(row['scope_id'], str) or not isinstance(row['section_id'], str):
            errors.append(f'row {i}: IDs must be strings'); continue
        key = (row['scope_id'], row['section_id'])
        if key not in expected or key in seen:
            errors.append(f'row {i}: unknown or duplicate scope/section {key}')
        seen.add(key)
        state = row['status']
        if state not in schema['coverage']['statuses']:
            errors.append(f'row {i}: invalid status')
        for field in ['source_refs', 'artifact_refs', 'gaps']:
            if not isinstance(row[field], list) or any(not isinstance(v, str) or not v.strip() for v in row[field]):
                errors.append(f'row {i}: {field} must contain nonempty reference strings')
        if not isinstance(row['reason'], str):
            errors.append(f'row {i}: reason must be text')
        if state in ['covered', 'not_found', 'not_applicable'] and not row['source_refs']:
            errors.append(f'row {i}: evidence required for {state}')
        if state == 'covered' and (not row['artifact_refs'] or row['gaps']):
            errors.append(f'row {i}: covered requires output and no unresolved gaps')
        if state != 'covered' and not str(row['reason']).strip():
            errors.append(f'row {i}: explicit reason required')
        if state in ['not_explored', 'partial', 'blocked'] and not row['gaps']:
            errors.append(f'row {i}: explicit gap required')
    for key in sorted(expected-seen):
        errors.append(f'missing coverage: {key}')
    if data.get('exploration_complete'):
        if not contexts or data.get('unclassified_assets'):
            errors.append('complete requires discovered contexts and no unclassified assets')
        if any(r.get('status') not in ['covered','not_found','not_applicable'] for r in rows if isinstance(r,dict)):
            errors.append('partial/blocked/not_explored cannot be complete')
    return errors

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('coverage', type=Path)
    parser.add_argument('--schema', type=Path, default=SCHEMA)
    args = parser.parse_args()
    schema = yaml.safe_load(args.schema.read_text(encoding='utf-8'))
    errors = validate_coverage(json.loads(args.coverage.read_text(encoding='utf-8')), schema)
    print(json.dumps({'valid': not errors, 'errors': errors, 'scope': 'coverage structure only'}, ensure_ascii=False))
    raise SystemExit(bool(errors))
