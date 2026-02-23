import { SOURCE_LEVEL_WEIGHT } from '../config/sources.js';

function getClaimScore(evidences) {
  let supportWeight = 0;
  let refuteWeight = 0;

  for (const evidence of evidences) {
    const weight = SOURCE_LEVEL_WEIGHT[evidence.credibility] || 1;
    if (evidence.stance === 'support') {
      supportWeight += weight;
    }
    if (evidence.stance === 'refute') {
      refuteWeight += weight;
    }
  }

  if (refuteWeight >= 3) {
    return {
      label: 'untrusted',
      score: Math.max(5, 30 - Math.min(refuteWeight * 2, 15)),
      reason: '命中权威反驳证据'
    };
  }

  if (supportWeight >= 4 && refuteWeight === 0) {
    return {
      label: 'trusted',
      score: Math.min(95, 70 + supportWeight * 3),
      reason: '存在多条高等级支持证据'
    };
  }

  return {
    label: 'insufficient',
    score: 55,
    reason: '证据不充分或存在冲突'
  };
}

function buildRiskAlerts(claims) {
  const topics = new Set(claims.map((item) => item.topic));
  const alerts = [];

  if (topics.has('健康')) {
    alerts.push('医疗健康信息仅供参考，出现症状请及时就医并遵循医生建议。');
  }
  if (topics.has('诈骗') || topics.has('金融')) {
    alerts.push('涉及转账、验证码、投资收益等内容时，请先联系官方客服并保留证据。');
  }
  if (topics.has('政策')) {
    alerts.push('政策法规类信息请以政府官网或官方公报为准。');
  }
  if (topics.has('公共安全')) {
    alerts.push('公共安全类消息建议核对当地应急管理部门通告。');
  }

  return alerts;
}

export function scoreClaims({ claims, evidenceByClaim }) {
  if (!claims.length) {
    return {
      label: 'insufficient',
      score: 50,
      reasons: ['未提取到可验证主张'],
      risk_alerts: [],
      evidence_grade: 'B',
      per_claim: []
    };
  }

  const perClaim = claims.map((claim) => {
    const evidences = evidenceByClaim[claim.id] || [];
    const scored = getClaimScore(evidences);
    return {
      claim_id: claim.id,
      ...scored
    };
  });

  const hasUntrusted = perClaim.some((item) => item.label === 'untrusted');
  const allTrusted = perClaim.every((item) => item.label === 'trusted');

  let label = 'insufficient';
  if (hasUntrusted) {
    label = 'untrusted';
  } else if (allTrusted) {
    label = 'trusted';
  }

  const average = Math.round(
    perClaim.reduce((sum, item) => sum + item.score, 0) / perClaim.length
  );

  const reasons = Array.from(new Set(perClaim.map((item) => item.reason))).slice(0, 3);

  const evidenceGrade = hasUntrusted || allTrusted ? 'A' : 'B';

  return {
    label,
    score: average,
    reasons,
    risk_alerts: buildRiskAlerts(claims),
    evidence_grade: evidenceGrade,
    per_claim: perClaim
  };
}
