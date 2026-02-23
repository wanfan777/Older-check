import { EVIDENCE_INDEX, SOURCE_LEVEL_WEIGHT } from '../config/sources.js';

function getKeywordHitScore(text, keywords) {
  return keywords.reduce((score, keyword) => {
    if (text.includes(keyword)) {
      return score + 1;
    }

    return score;
  }, 0);
}

function rankEvidenceByClaim(claim) {
  const ranked = EVIDENCE_INDEX.map((item) => {
    const keywordScore = getKeywordHitScore(claim.claim, item.keywords);
    const topicBoost = item.topics.includes(claim.topic) ? 1 : 0;
    const credibilityScore = SOURCE_LEVEL_WEIGHT[item.credibility] || 1;
    const hasRelevance = keywordScore > 0 || topicBoost > 0;

    return {
      ...item,
      _score: hasRelevance ? keywordScore * 3 + topicBoost * 2 + credibilityScore : 0
    };
  })
    .filter((item) => item._score >= 5)
    .sort((a, b) => b._score - a._score)
    .slice(0, 4)
    .map(({ _score, ...item }) => item);

  if (ranked.length > 0) {
    return ranked;
  }

  return [
    {
      id: `fallback_${claim.id}`,
      title: '暂未命中高置信证据，请补充上下文后重试',
      source: '系统提示',
      url: '',
      publish_time: new Date().toISOString().slice(0, 10),
      credibility: 'B',
      stance: 'unrelated',
      topics: ['通用'],
      keywords: claim.keywords,
      quote: '当前没有检索到可直接支持或反驳的权威证据。'
    }
  ];
}

export function retrieveEvidence(claims) {
  const byClaim = {};
  const all = [];

  for (const claim of claims) {
    const evidences = rankEvidenceByClaim(claim);
    byClaim[claim.id] = evidences;

    for (const evidence of evidences) {
      all.push({
        claim_id: claim.id,
        ...evidence
      });
    }
  }

  return {
    byClaim,
    all
  };
}
