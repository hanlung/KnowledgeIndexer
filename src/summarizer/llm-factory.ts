import type { LlmConfig } from '../types/config.js';
import type { LlmClient } from './llm-client.js';
import { createDirectClient } from './direct-client.js';
import { createOpenAiClient } from './openai-client.js';

export class NoLlmAvailableError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'No LLM available: configure ANTHROPIC_API_KEY (provider=anthropic) or OPENAI_BASE_URL/OPENAI_API_KEY (provider=openai).',
    );
    this.name = 'NoLlmAvailableError';
  }
}

// The indexer always uses its own server-side LLM. There is no MCP-sampling
// fallback: the host's LLM is never invoked for indexing.
export function pickClient(llm: LlmConfig): LlmClient {
  if (llm.provider === 'anthropic') {
    if (!llm.apiKey) {
      throw new NoLlmAvailableError(
        'Anthropic provider selected but ANTHROPIC_API_KEY is not set.',
      );
    }
    return createDirectClient({ apiKey: llm.apiKey, modelId: llm.modelId });
  }

  // OpenAI-compatible. A baseUrl is always required; an apiKey is only
  // required by hosted providers (OpenAI, OpenRouter, …) — self-hosted
  // servers like Ollama/vLLM/LM Studio typically accept requests without one.
  if (!llm.baseUrl) {
    throw new NoLlmAvailableError(
      'OpenAI-compatible provider selected but OPENAI_BASE_URL is not set.',
    );
  }
  return createOpenAiClient({
    baseUrl: llm.baseUrl,
    modelId: llm.modelId,
    apiKey: llm.apiKey,
  });
}
