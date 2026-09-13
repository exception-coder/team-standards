const { read, hash } = require('./files');

function declaredGraph(contract) {
  const nodes = new Map();
  const links = [];
  for (const dimension of contract.dimensions) {
    for (const value of dimension.values) {
      const id = `state:${dimension.id}:${value.code}`;
      nodes.set(id, { id, kind: 'state', dimension: dimension.id, ...value });
    }
  }
  for (const action of contract.actions) nodes.set(`action:${action.id}`, { ...action, id: `action:${action.id}`, kind: 'action' });
  for (const binding of contract.bindings) {
    const source = `source:${binding.file}`;
    nodes.set(source, { id: source, kind: 'source', source_file: binding.file });
    for (const code of binding.values) links.push({ source, target: `state:${binding.dimension}:${code}`,
      relation: binding.role, anchor: binding.anchor, evidence: 'DECLARED_SOURCE_CHECKED' });
    for (const action of binding.actions) links.push({ source, target: `action:${action}`,
      relation: binding.role, anchor: binding.anchor, evidence: 'DECLARED_SOURCE_CHECKED' });
  }
  return { nodes: [...nodes.values()], links };
}

// Graphify is an optional source locator. Never write back or upgrade candidate edges to facts.
function graphView(root, contract, graphPath) {
  const declared = declaredGraph(contract);
  if (!graphPath) return { status: 'UNAVAILABLE', declared, candidates: [], limitation: 'Source scan only; no graph completeness claim' };
  const raw = read(root, graphPath);
  const graph = JSON.parse(raw);
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.links)) throw new Error('Unsupported Graphify nodes/links format');
  const files = new Set(contract.bindings.map(binding => binding.file));
  const selected = graph.nodes.filter(node => files.has(node.source_file));
  const ids = new Set(selected.map(node => node.id));
  return {
    status: 'CANDIDATE', digest: hash(raw), declared,
    candidates: selected,
    links: graph.links.filter(link => ids.has(link.source) || ids.has(link.target)),
    limitation: 'Graph freshness and semantic completeness are not proven; inspect source and graph provenance',
  };
}
module.exports = { graphView };
