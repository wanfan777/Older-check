function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export const LLM_CONFIG = {
  enabled: parseBoolean(process.env.LLM_ENABLED, true),
  apiKey: process.env.LLM_API_KEY || '',
  baseUrl: (
    process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  ).replace(/\/$/, ''),
  model: process.env.LLM_MODEL || '',
  textModel: process.env.LLM_MODEL_TEXT || process.env.LLM_MODEL || 'qwen-plus-latest',
  visionModel: process.env.LLM_MODEL_VISION || process.env.LLM_MODEL || 'qwen-vl-ocr-latest',
  jsonResponseFormat: parseBoolean(process.env.LLM_JSON_RESPONSE_FORMAT, true),
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 30000)
};
