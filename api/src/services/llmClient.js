import { LLM_CONFIG } from '../config/llm.js';

function toTextContent(content) {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
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

function safeParseJson(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    throw new Error('LLM empty response');
  }

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch?.[1]) {
      return JSON.parse(markdownMatch[1]);
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('Failed to parse LLM JSON response');
  }
}

export function isLlmConfigured() {
  return LLM_CONFIG.enabled && Boolean(LLM_CONFIG.apiKey);
}

export async function callLlmJson({ messages, temperature = 0 }) {
  if (!isLlmConfigured()) {
    throw new Error('LLM is not configured. Please set LLM_API_KEY.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_CONFIG.timeoutMs);

  try {
    const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        temperature,
        response_format: {
          type: 'json_object'
        },
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM request failed(${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const messageContent = toTextContent(data?.choices?.[0]?.message?.content);
    return safeParseJson(messageContent);
  } finally {
    clearTimeout(timer);
  }
}
