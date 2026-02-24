import { LLM_CONFIG } from '../config/llm.js';

function toTextContent(content) {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (part?.type === 'text') {
        return part.text || '';
      }

      return '';
    })
    .join('\n');
}

function normalizeJsonLikeText(raw) {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function tryParseJson(rawText) {
  return JSON.parse(normalizeJsonLikeText(rawText));
}

function safeParseJson(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    throw new Error('LLM empty response');
  }

  try {
    return tryParseJson(trimmed);
  } catch (_error) {
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch?.[1]) {
      try {
        return tryParseJson(markdownMatch[1]);
      } catch (_innerError) {}
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParseJson(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('Failed to parse LLM JSON response');
  }
}

export function isLlmConfigured() {
  return LLM_CONFIG.enabled && Boolean(LLM_CONFIG.apiKey);
}

function getModelName({ modelType, model }) {
  if (model) {
    return model;
  }

  if (modelType === 'vision') {
    return LLM_CONFIG.visionModel;
  }

  return LLM_CONFIG.textModel;
}

function createRequestPayload({ model, messages, temperature, useJsonResponseFormat, maxTokens }) {
  const payload = {
    model,
    temperature,
    messages
  };

  if (useJsonResponseFormat) {
    payload.response_format = {
      type: 'json_object'
    };
  }

  if (typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0) {
    payload.max_tokens = Math.floor(maxTokens);
  }

  return payload;
}

function shouldRetryWithoutJsonMode(status, errorText) {
  if (status !== 400) {
    return false;
  }

  const lower = String(errorText || '').toLowerCase();
  return (
    lower.includes('response_format') ||
    lower.includes('json_object') ||
    lower.includes('json schema') ||
    lower.includes('invalid parameter') ||
    lower.includes('unknown parameter')
  );
}

async function requestChatCompletions({
  model,
  messages,
  temperature,
  useJsonResponseFormat,
  maxTokens,
  signal
}) {
  return fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      createRequestPayload({
        model,
        messages,
        temperature,
        useJsonResponseFormat,
        maxTokens
      })
    ),
    signal
  });
}

export async function callLlmJson({
  messages,
  temperature = 0,
  modelType = 'text',
  model = '',
  maxTokens
}) {
  if (!isLlmConfigured()) {
    throw new Error('LLM is not configured. Please set LLM_API_KEY.');
  }

  const modelName = getModelName({ modelType, model });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_CONFIG.timeoutMs);

  try {
    let response = await requestChatCompletions({
      model: modelName,
      messages,
      temperature,
      useJsonResponseFormat: LLM_CONFIG.jsonResponseFormat,
      maxTokens,
      signal: controller.signal
    });

    if (!response.ok) {
      const firstErrorText = await response.text();
      if (LLM_CONFIG.jsonResponseFormat && shouldRetryWithoutJsonMode(response.status, firstErrorText)) {
        response = await requestChatCompletions({
          model: modelName,
          messages,
          temperature,
          useJsonResponseFormat: false,
          maxTokens,
          signal: controller.signal
        });
      } else {
        throw new Error(`LLM request failed(${response.status}): ${firstErrorText.slice(0, 200)}`);
      }
    }

    if (!response.ok) {
      const retryErrorText = await response.text();
      throw new Error(`LLM request failed(${response.status}): ${retryErrorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const messageContent = toTextContent(data?.choices?.[0]?.message?.content);
    return safeParseJson(messageContent);
  } finally {
    clearTimeout(timer);
  }
}
