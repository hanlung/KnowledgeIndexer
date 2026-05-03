import { logger } from '../utils/logger.js';
import { DEFAULT_MAX_TOKENS, type LlmClient } from './llm-client.js';

export interface OpenAiClientOptions {
  readonly baseUrl: string;
  readonly modelId: string;
  readonly apiKey?: string;
  readonly maxRetries?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetchImpl?: typeof fetch;
}

interface ChatChoice {
  readonly message?: { readonly content?: string | null };
}

interface ChatCompletionResponse {
  readonly choices?: readonly ChatChoice[];
  readonly error?: { readonly message?: string };
}

const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function trimSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildEndpoint(baseUrl: string): string {
  const trimmed = trimSlashes(baseUrl);
  return trimmed.endsWith('/chat/completions')
    ? trimmed
    : `${trimmed}/chat/completions`;
}

export function createOpenAiClient(options: OpenAiClientOptions): LlmClient {
  const endpoint = buildEndpoint(options.baseUrl);
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const doFetch = options.fetchImpl ?? fetch;

  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...options.headers,
  };
  if (options.apiKey) {
    baseHeaders.authorization = `Bearer ${options.apiKey}`;
  }

  return {
    async summarize(prompt: string, maxTokens?: number): Promise<string> {
      const body = JSON.stringify({
        model: options.modelId,
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      });

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await doFetch(endpoint, {
            method: 'POST',
            headers: baseHeaders,
            body,
          });

          if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(
              `OpenAI-compatible endpoint ${response.status}: ${text || response.statusText}`,
            );
          }

          const json = (await response.json()) as ChatCompletionResponse;
          if (json.error?.message) {
            throw new Error(`OpenAI-compatible error: ${json.error.message}`);
          }

          const content = json.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || content.length === 0) {
            throw new Error('No content in OpenAI-compatible response');
          }

          return content;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`OpenAI-compatible attempt ${attempt + 1} failed`, {
            endpoint,
            error: lastError.message,
          });

          if (attempt < maxRetries - 1) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(
        `OpenAI-compatible endpoint failed after ${maxRetries} attempts: ${lastError?.message}`,
      );
    },
  };
}
