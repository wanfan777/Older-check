function getLabelText(label) {
  if (label === 'trusted') {
    return '可信';
  }
  if (label === 'untrusted') {
    return '不可信';
  }
  return '证据不足';
}

function getSummaryByLabel(label) {
  if (label === 'trusted') {
    return '当前检索到的权威信息与该说法大体一致。';
  }
  if (label === 'untrusted') {
    return '当前检索到的权威信息与该说法存在明显冲突。';
  }
  return '当前尚未检索到足够权威证据，暂无法下结论。';
}

function getNextSteps(label) {
  if (label === 'trusted') {
    return [
      '优先查看证据卡中的官方来源发布时间，避免转发旧闻。',
      '如涉及个人决策（医疗/金融），请再咨询专业机构。'
    ];
  }

  if (label === 'untrusted') {
    return [
      '不要继续转发该内容，避免误导他人。',
      '将关键信息回到官方渠道二次核对。',
      '若涉及诈骗线索，保留截图并及时报警。'
    ];
  }

  return [
    '补充更完整上下文（原视频标题/发布时间/来源）后重试。',
    '优先搜索政府官网、权威机构或官方媒体的同主题说明。'
  ];
}

export function generateExplanation({ label, claims, reasons }) {
  const topClaim = claims[0]?.claim || '该内容';
  const summary = getSummaryByLabel(label);
  const reasonsText = reasons.slice(0, 2).join('；');

  return {
    label_text: getLabelText(label),
    summary,
    plain_explanation: `${topClaim}。${summary}${reasonsText ? ` 主要依据：${reasonsText}。` : ''}`,
    next_steps: getNextSteps(label),
    disclaimer:
      '本结果基于当前可检索证据自动生成，不构成医疗、法律或投资建议。请以官方最新发布为准。'
  };
}
