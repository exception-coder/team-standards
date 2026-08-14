const REQUIRED_BODY_SECTIONS = ['改动', '原因', '结果'];

function buildStructuredBody({ change, reason, result }) {
  return `【改动】${change || ''}\n【原因】${reason || ''}\n【结果】${result || ''}`;
}

function validateCommitBody(body) {
  const normalizedBody = (body || '').trim();
  if (!normalizedBody) return '缺少变更说明正文';

  const matches = [...normalizedBody.matchAll(/^【(改动|原因|结果)】\s*(.*)$/gm)];
  const labels = matches.map((match) => match[1]);
  if (labels.join(',') !== REQUIRED_BODY_SECTIONS.join(',')) {
    return '正文必须按顺序包含【改动】【原因】【结果】三段';
  }

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length - matches[index][2].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalizedBody.length;
    const content = normalizedBody.slice(start, end).trim();
    if (!/[\u3400-\u9fff]/.test(content)) {
      return `【${matches[index][1]}】必须包含中文说明`;
    }
  }

  return null;
}

module.exports = { REQUIRED_BODY_SECTIONS, buildStructuredBody, validateCommitBody };
