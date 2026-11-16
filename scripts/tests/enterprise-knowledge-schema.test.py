"""Meaningful coverage regressions: unknown is not complete; all contexts count."""
import importlib.util
from pathlib import Path
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT/'plugins/team-standards/skills/business-ontology-modeling'
spec = importlib.util.spec_from_file_location('coverage_validator', SKILL/'scripts/validate-knowledge-coverage.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SCHEMA = yaml.safe_load((SKILL/'assets/knowledge-schema/enterprise-knowledge-schema.yaml').read_text(encoding='utf-8'))

def fixture():
    rows=[]
    for scope, sections in [('erp',SCHEMA['project_views']),('production',SCHEMA['context_sections']),('sales',SCHEMA['context_sections'])]:
        for section in sections:
            rows.append(dict(scope_id=scope,section_id=section,status='covered',source_refs=['source:1'],artifact_refs=['artifact:1'],gaps=[],reason='Scoped investigation'))
    return dict(project='erp',contexts=['production','sales'],rows=rows,exploration_complete=True,unclassified_assets=[])

class SchemaTest(unittest.TestCase):
    def test_taxonomy_and_mapping_integrity(self):
        self.assertEqual([f'{n:02}' for n in range(1,9)],list(SCHEMA['project_views']))
        self.assertEqual([f'{n:02}' for n in range(1,11)],list(SCHEMA['context_sections']))
        for section in SCHEMA['context_sections'].values():
            self.assertTrue(set(section['views']) <= SCHEMA['project_views'].keys())
        self.assertEqual(set(SCHEMA['status_mapping'][s] for s in ['CANDIDATE','ACCEPTED','DEPRECATED']),{'candidate','accepted','deprecated'})
    def test_complete_structure(self):
        self.assertEqual([],module.validate_coverage(fixture(),SCHEMA))
    def test_sample_cannot_replace_other_context(self):
        data=fixture();data['rows']=[r for r in data['rows'] if r['scope_id']!='sales']
        self.assertEqual(10,len(module.validate_coverage(data,SCHEMA)))
    def test_unknown_is_valid_partial_but_not_complete(self):
        data=fixture();row=data['rows'][-1];row.update(status='not_explored',source_refs=[],artifact_refs=[],gaps=['gap:1'],reason='Source unavailable')
        self.assertTrue(module.validate_coverage(data,SCHEMA))
        data['exploration_complete']=False
        self.assertEqual([],module.validate_coverage(data,SCHEMA))
    def test_absence_requires_evidence(self):
        for state in ['covered','not_found','not_applicable']:
            data=fixture();data['rows'][0].update(status=state,source_refs=[])
            self.assertTrue(module.validate_coverage(data,SCHEMA))
    def test_duplicate_and_unclassified_rejected(self):
        data=fixture();data['rows'].append(data['rows'][0].copy())
        self.assertTrue(module.validate_coverage(data,SCHEMA))
        data=fixture();data['unclassified_assets']=['asset:unowned']
        self.assertTrue(module.validate_coverage(data,SCHEMA))

if __name__=='__main__':unittest.main()
