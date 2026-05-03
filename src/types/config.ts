import type { ScanOptions } from './connector.js';

export type LlmProvider = 'anthropic' | 'openai';

export interface AnthropicLlmConfig {
  readonly provider: 'anthropic';
  readonly apiKey?: string;
  readonly authToken?: string;
  readonly baseUrl?: string;
  readonly modelId: string;
}

export interface OpenAiLlmConfig {
  readonly provider: 'openai';
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly modelId: string;
}

export type LlmConfig = AnthropicLlmConfig | OpenAiLlmConfig;

export interface KnowledgeIndexerConfig {
  readonly llm: LlmConfig;
  readonly dataDir: string;
  readonly maxConcurrentSummarizations: number;
  readonly outputFormat: 'json' | 'yaml' | 'both';
  readonly markdownOutputPath: string;
  readonly scanOptions: ScanOptions;
}
