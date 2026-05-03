import type { KnowledgeIndexerConfig } from '../types/config.js';

export const INDEX_VERSION = '1.0.0';

export const DEFAULT_ANTHROPIC_MODEL_ID = 'claude-sonnet-4-20250514';
export const DEFAULT_OPENAI_MODEL_ID = 'gpt-4o-mini';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export const DEFAULT_CONFIG: Omit<KnowledgeIndexerConfig, 'llm'> = {
  dataDir: '.data/indices',
  maxConcurrentSummarizations: 5,
  outputFormat: 'json',
  markdownOutputPath: 'KNOWLEDGE.md',
  scanOptions: {
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '__pycache__',
      '.venv',
      'vendor',
    ],
  },
};

export const SUPPORTED_LANGUAGES: ReadonlyMap<string, readonly string[]> =
  new Map([
    ['typescript', ['.ts', '.tsx']],
    ['javascript', ['.js', '.jsx', '.mjs', '.cjs']],
    ['python', ['.py']],
    ['go', ['.go']],
    ['rust', ['.rs']],
    ['java', ['.java']],
    ['ruby', ['.rb']],
    ['dart', ['.dart']],
  ]);
