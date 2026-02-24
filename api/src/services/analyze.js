import { extractText } from './ocr.js';
import { createClaimsFromTexts, extractClaims } from './claim.js';
import { retrieveEvidence } from './retrieval.js';
import { scoreClaims } from './scoring.js';
import { generateExplanation } from './explainer.js';

function normalizeOverrideText(value = '') {
  return String(value || '').trim();
}

function reorderByPrimaryClaim(claims = [], primaryClaimIndex = 0) {
  const index = Number(primaryClaimIndex);
  if (!Array.isArray(claims) || claims.length <= 1) {
    return claims;
  }
  if (!Number.isInteger(index) || index <= 0 || index >= claims.length) {
    return claims;
  }

  const selected = claims[index];
  return [selected, ...claims.filter((_item, itemIndex) => itemIndex !== index)].map((item, itemIndex) => ({
    ...item,
    id: `c${itemIndex + 1}`
  }));
}

export async function analyzeInput({
  text = '',
  imageBase64 = '',
  imageMime = '',
  cleanTextOverride = '',
  claimOverrides = [],
  primaryClaimIndex = 0
}) {
  const normalizedOverride = normalizeOverrideText(cleanTextOverride);
  const ocrResult = normalizedOverride
    ? {
        raw_text: normalizedOverride,
        clean_text: normalizedOverride,
        language: 'zh-CN',
        recognition_provider: 'user_confirmed',
        recognition_note: ''
      }
    : await extractText({ text, imageBase64, imageMime });

  let claims = Array.isArray(claimOverrides) && claimOverrides.length
    ? createClaimsFromTexts(claimOverrides)
    : await extractClaims(ocrResult.clean_text);

  claims = reorderByPrimaryClaim(claims, primaryClaimIndex);
  const evidence = retrieveEvidence(claims);
  const score = scoreClaims({
    claims,
    evidenceByClaim: evidence.byClaim
  });
  const explain = generateExplanation({
    label: score.label,
    claims,
    reasons: score.reasons
  });

  return {
    raw_text: ocrResult.raw_text,
    clean_text: ocrResult.clean_text,
    language: ocrResult.language,
    recognition_provider: ocrResult.recognition_provider || 'unknown',
    recognition_note: ocrResult.recognition_note || '',
    claims,
    label: score.label,
    score: score.score,
    reasons: score.reasons,
    evidences: evidence.all,
    risk_alerts: score.risk_alerts,
    evidence_grade: score.evidence_grade,
    summary: explain.summary,
    explanation: explain.plain_explanation,
    next_steps: explain.next_steps,
    disclaimer: explain.disclaimer,
    analyzed_at: new Date().toISOString()
  };
}
