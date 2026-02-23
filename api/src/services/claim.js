import { callLlmJson, isLlmConfigured } from './llmClient.js';

const CLAIM_TRIGGER_REGEX = /(可以|能够|必须|马上|立刻|官方宣布|100%|包治百病|治愈|治疗|新规|紧急通知|保本|高收益|验证码|转账|封城|停售|禁用)/;

const TOPIC_KEYWORDS = {
  健康: ['高血压', '血糖', '癌症', '治愈', '治疗', '偏方', '保健品', '疫苗'],
  诈骗: ['转账', '验证码', '客服', '银行卡', '退款', '扫码'],
  金融: ['保本', '高收益', '稳赚', '理财', '投资群'],
  政策: ['官方宣布', '新规', '通知', '政策', '法规'],
  公共安全: ['灾害', '爆炸', '封城', '紧急', '全城']
};

const HIGH_RISK_TOPICS = new Set(['健康', '诈骗', '金融', '公共安全', '政策']);

function splitSentences(text) {
  return text
    .split(/[。！？!\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectTopic(sentence) {
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((keyword) => sentence.includes(keyword))) {
      return topic;
    }
  }

  return '通用';
}

function normalizeKeywords(seedText) {
  return Array.from(
    new Set(
      String(seedText || '')
        .replace(/[，,；;：:、]/g, ' ')
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  ).slice(0, 6);
}

function normalizeClaimItem(item, index) {
  const claimText = String(item?.claim || '').trim();
  if (!claimText) {
    return null;
  }

  const topic = item?.topic && TOPIC_KEYWORDS[item.topic] ? item.topic : detectTopic(claimText);
  const riskLevel = item?.risk_level || (HIGH_RISK_TOPICS.has(topic) ? 'high' : 'medium');
  const keywords = Array.isArray(item?.keywords) && item.keywords.length
    ? item.keywords.map((word) => String(word).trim()).filter(Boolean).slice(0, 6)
    : normalizeKeywords(claimText);

  return {
    id: `c${index + 1}`,
    claim: claimText,
    topic,
    risk_level: riskLevel,
    keywords
  };
}

function extractClaimsByRule(cleanText) {
  const sentences = splitSentences(cleanText);
  if (!sentences.length) {
    return [];
  }

  const candidates = sentences.filter((sentence) => CLAIM_TRIGGER_REGEX.test(sentence));
  const selected = (candidates.length ? candidates : sentences).slice(0, 3);

  return selected.map((sentence, index) => {
    const topic = detectTopic(sentence);
    return {
      id: `c${index + 1}`,
      claim: sentence,
      topic,
      risk_level: HIGH_RISK_TOPICS.has(topic) ? 'high' : 'medium',
      keywords: normalizeKeywords(sentence)
    };
  });
}

async function extractClaimsByLlm(cleanText) {
  const parsed = await callLlmJson({
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          '你是事实核查助手，负责从输入文本提取可验证主张。只返回 JSON，不要额外解释。'
      },
      {
        role: 'user',
        content:
          `请从下面文本提取 1-3 条可验证主张，并输出字段 claims。` +
          `每条必须包含 claim, topic, risk_level, keywords。` +
          `topic 只能是：健康/诈骗/金融/政策/公共安全/通用。` +
          `risk_level 只能是：high/medium/low。` +
          `\n\n文本：\n${cleanText}\n\n` +
          `返回格式：{"claims":[{"claim":"...","topic":"健康","risk_level":"high","keywords":["词1","词2"]}]}`
      }
    ]
  });

  const claims = Array.isArray(parsed?.claims) ? parsed.claims : [];
  return claims.map((item, index) => normalizeClaimItem(item, index)).filter(Boolean).slice(0, 3);
}

export async function extractClaims(cleanText) {
  const normalized = String(cleanText || '').trim();
  if (!normalized) {
    return [];
  }

  if (!isLlmConfigured()) {
    return extractClaimsByRule(normalized);
  }

  try {
    const llmClaims = await extractClaimsByLlm(normalized);
    if (llmClaims.length > 0) {
      return llmClaims;
    }

    return extractClaimsByRule(normalized);
  } catch (_error) {
    return extractClaimsByRule(normalized);
  }
}
