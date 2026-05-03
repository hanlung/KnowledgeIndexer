import { describe, expect, it } from 'vitest';
import {
  NoLlmAvailableError,
  pickClient,
} from '../../../src/summarizer/llm-factory.js';

describe('pickClient', () => {
  describe('anthropic provider', () => {
    it('throws NoLlmAvailableError when ANTHROPIC_API_KEY is missing', () => {
      expect(() =>
        pickClient({ provider: 'anthropic', modelId: 'm' }),
      ).toThrow(NoLlmAvailableError);
    });

    it('returns a working client when an API key is present', () => {
      const client = pickClient({
        provider: 'anthropic',
        apiKey: 'sk-test',
        modelId: 'm',
      });
      expect(typeof client.summarize).toBe('function');
    });
  });

  describe('openai-compatible provider', () => {
    it('throws NoLlmAvailableError when baseUrl is missing', () => {
      expect(() =>
        pickClient({
          provider: 'openai',
          baseUrl: '',
          modelId: 'm',
        }),
      ).toThrow(NoLlmAvailableError);
    });

    it('returns a working client without an apiKey (self-hosted case)', () => {
      const client = pickClient({
        provider: 'openai',
        baseUrl: 'http://localhost:11434/v1',
        modelId: 'llama3',
      });
      expect(typeof client.summarize).toBe('function');
    });

    it('returns a working client with an apiKey (hosted case)', () => {
      const client = pickClient({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-openai',
        modelId: 'gpt-4o-mini',
      });
      expect(typeof client.summarize).toBe('function');
    });
  });
});
