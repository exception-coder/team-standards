// Only enforce a floor on an Agent's evidence-based assessment; do not classify text.
export function riskFloor({ proposed, previous = 'L1', risks = [], projectRequiresOpenSpec = false }) {
  const levels = ['L1', 'L2', 'L3'];
  const highRisk = new Set(['permission-boundary', 'data-security', 'data-integrity',
    'sensitive-data', 'irreversible-change', 'breaking-contract', 'architecture', 'major-data-model']);
  if (!levels.includes(proposed) || !levels.includes(previous) || !Array.isArray(risks)
      || risks.some(risk => !highRisk.has(risk)) || typeof projectRequiresOpenSpec !== 'boolean') {
    throw new Error('Invalid assessment: use verified risk categories and L1/L2/L3 levels');
  }
  return levels[Math.max(levels.indexOf(proposed), levels.indexOf(previous),
    risks.length || projectRequiresOpenSpec ? 2 : 0)];
}
