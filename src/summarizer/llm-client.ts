export interface LlmClient {
  summarize(prompt: string, maxTokens?: number): Promise<string>;
}

export const DEFAULT_MAX_TOKENS = 1024;
