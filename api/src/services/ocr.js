import { callLlmJson, isLlmConfigured } from './llmClient.js';

function normalizeText(input) {
  return String(input || '')
    .replace(/[\r\t]/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/[\u200b\u00A0]/g, '')
    .trim();
}

function sanitizeImageMime(mime) {
  const value = String(mime || '').toLowerCase();
  if (value === 'image/png' || value === 'image/jpeg' || value === 'image/jpg' || value === 'image/webp') {
    return value === 'image/jpg' ? 'image/jpeg' : value;
  }

  return 'image/jpeg';
}

function fallbackRecognition({ text = '', hasImage = false }) {
  const normalized = normalizeText(text);
  const rawText = normalized || '';

  return {
    raw_text: rawText,
    clean_text: normalizeText(rawText),
    language: 'zh-CN',
    recognition_provider: hasImage ? 'fallback_no_llm' : 'user_text',
    recognition_note: hasImage && !normalized ? '图片已上传，但 LLM 识别暂不可用（未配置或调用失败）。请补充文本后重试。' : ''
  };
}

function normalizeRecognitionPayload(payload, fallbackText) {
  const rawText = normalizeText(payload?.raw_text || fallbackText || '');
  const cleanText = normalizeText(payload?.clean_text || rawText);

  return {
    raw_text: rawText,
    clean_text: cleanText,
    language: payload?.language || 'zh-CN',
    recognition_provider: 'llm_vision'
  };
}

async function extractByVisionLlm({ text, imageBase64, imageMime, retryMode = false }) {
  const mime = sanitizeImageMime(imageMime);

  return callLlmJson({
    modelType: 'vision',
    temperature: 0,
    maxTokens: retryMode ? 220 : 320,
    messages: [
      {
        role: 'system',
        content: retryMode
          ? '你是OCR助手。只允许输出严格 JSON，且仅包含 raw_text、clean_text、language 三个字段。禁止输出其他字段。'
          : '你是一个多模态文本识别助手。请从截图中提取全部可读中文文本，并清理噪声（水印、装饰符号、重复空格）。只返回 JSON。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: retryMode
              ? '仅返回：{"raw_text":"...","clean_text":"...","language":"zh-CN"}。如果无可读文字，raw_text 和 clean_text 返回空字符串。'
              : '任务：\n1) 提取截图文字到 raw_text（尽可能完整）\n2) 输出 clean_text（适合后续事实核查）\n3) 标注 language（如 zh-CN）\n如果看不清，不要编造，用[不清晰]标记。\n可选字段：notes。\n\n返回格式：{"raw_text":"...","clean_text":"...","language":"zh-CN"}'
          },
          {
            type: 'text',
            text: text ? `用户补充文本：${text}` : '用户未补充文本。'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${imageBase64}`
            }
          }
        ]
      }
    ]
  });
}

export async function extractText({ text = '', imageBase64 = '', imageMime = '' }) {
  const hasImage = Boolean(imageBase64);

  if (!hasImage) {
    return fallbackRecognition({
      text,
      hasImage: false
    });
  }

  if (!isLlmConfigured()) {
    return fallbackRecognition({
      text,
      hasImage: true
    });
  }

  try {
    const parsed = await extractByVisionLlm({
      text,
      imageBase64,
      imageMime,
      retryMode: false
    });

    return normalizeRecognitionPayload(parsed, text);
  } catch (_firstError) {
    try {
      const retried = await extractByVisionLlm({
        text,
        imageBase64,
        imageMime,
        retryMode: true
      });
      return normalizeRecognitionPayload(retried, text);
    } catch (_secondError) {
      return fallbackRecognition({
        text,
        hasImage: true
      });
    }
  }
}
