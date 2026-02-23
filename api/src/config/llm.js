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
  baseUrl: (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  model: process.env.LLM_MODEL || 'gpt-4.1-mini',
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 30000)
};
