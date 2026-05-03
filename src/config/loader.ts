import { z } from 'zod';
import type { KnowledgeIndexerConfig, LlmConfig } from '../types/config.js';
import {
  DEFAULT_ANTHROPIC_MODEL_ID,
  DEFAULT_CONFIG,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL_ID,
} from './defaults.js';

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const envSchema = z.object({
  // Provider selection. If unset we infer from which keys/URLs are present
  // (see resolveLlmConfig below).
  KI_LLM_PROVIDER: z.enum(['anthropic', 'openai']).optional(),

  // Anthropic
  ANTHROPIC_API_KEY: optionalString,
  KI_MODEL_ID: optionalString, // legacy: Anthropic model id
  KI_ANTHROPIC_MODEL_ID: optionalString,

  // OpenAI-compatible (works for OpenAI proper, Ollama, vLLM, LM Studio,
  // OpenRouter, Together, Groq, etc.)
  OPENAI_API_KEY: optionalString,
  OPENAI_BASE_URL: optionalString,
  OPENAI_MODEL_ID: optionalString,
  KI_OPENAI_MODEL_ID: optionalString,

  // Pipeline
  KI_DATA_DIR: optionalString,
  KI_MAX_CONCURRENT: z.coerce.number().positive().optional(),
  KI_OUTPUT_FORMAT: z.enum(['json', 'yaml', 'both']).optional(),
  KI_MARKDOWN_PATH: optionalString,
});

type ParsedEnv = z.infer<typeof envSchema>;

function resolveLlmConfig(parsed: ParsedEnv): LlmConfig {
  const explicit = parsed.KI_LLM_PROVIDER;
  // Infer when not explicit: prefer OpenAI if its base URL or key is set,
  // otherwise default to Anthropic. A self-hosted server (Ollama et al.)
  // typically has OPENAI_BASE_URL set but no OPENAI_API_KEY — that's fine.
  const provider =
    explicit ??
    (parsed.OPENAI_BASE_URL || parsed.OPENAI_API_KEY ? 'openai' : 'anthropic');

  if (provider === 'openai') {
    return {
      provider: 'openai',
      apiKey: parsed.OPENAI_API_KEY,
      baseUrl: parsed.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
      modelId:
        parsed.KI_OPENAI_MODEL_ID ??
        parsed.OPENAI_MODEL_ID ??
        DEFAULT_OPENAI_MODEL_ID,
    };
  }

  return {
    provider: 'anthropic',
    apiKey: parsed.ANTHROPIC_API_KEY,
    modelId:
      parsed.KI_ANTHROPIC_MODEL_ID ??
      parsed.KI_MODEL_ID ??
      DEFAULT_ANTHROPIC_MODEL_ID,
  };
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): KnowledgeIndexerConfig {
  const parsed = envSchema.parse(env);

  return {
    ...DEFAULT_CONFIG,
    llm: resolveLlmConfig(parsed),
    dataDir: parsed.KI_DATA_DIR ?? DEFAULT_CONFIG.dataDir,
    maxConcurrentSummarizations:
      parsed.KI_MAX_CONCURRENT ?? DEFAULT_CONFIG.maxConcurrentSummarizations,
    outputFormat: parsed.KI_OUTPUT_FORMAT ?? DEFAULT_CONFIG.outputFormat,
    markdownOutputPath:
      parsed.KI_MARKDOWN_PATH ?? DEFAULT_CONFIG.markdownOutputPath,
  };
}
