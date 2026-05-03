import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { DEFAULT_MAX_TOKENS, type LlmClient } from './llm-client.js';

export interface DirectClientOptions {
  readonly apiKey?: string;
  readonly authToken?: string;
  readonly baseUrl?: string;
  readonly modelId: string;
  readonly maxRetries?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export function createDirectClient(options: DirectClientOptions): LlmClient {
  const clientOptions: Record<string, unknown> = {};
  if (options.apiKey) clientOptions.apiKey = options.apiKey;
  if (options.authToken) clientOptions.authToken = options.authToken;
  if (options.baseUrl) clientOptions.baseURL = options.baseUrl;
  const client = new Anthropic(clientOptions as ConstructorParameters<typeof Anthropic>[0]);
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  return {
    async summarize(prompt: string, maxTokens?: number): Promise<string> {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await client.messages.create({
            model: options.modelId,
            max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
            messages: [{ role: 'user', content: prompt }],
          });

          const textBlock = response.content.find((b) => b.type === 'text');
          if (!textBlock || textBlock.type !== 'text') {
            throw new Error('No text content in Claude response');
          }

          return textBlock.text;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Claude API attempt ${attempt + 1} failed`, {
            error: lastError.message,
          });

          if (attempt < maxRetries - 1) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(
        `Claude API failed after ${maxRetries} attempts: ${lastError?.message}`,
      );
    },
  };
}
