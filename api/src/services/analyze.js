import { extractText } from './ocr.js';
import { extractClaims } from './claim.js';
import { retrieveEvidence } from './retrieval.js';
import { scoreClaims } from './scoring.js';
import { generateExplanation } from './explainer.js';

export async function analyzeInput({ text = '', imageBase64 = '', imageMime = '' }) {
  const ocrResult = await extractText({ text, imageBase64, imageMime });
  const claims = await extractClaims(ocrResult.clean_text);
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
