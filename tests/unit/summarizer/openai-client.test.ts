import { describe, expect, it, vi } from 'vitest';
import { createOpenAiClient } from '../../../src/summarizer/openai-client.js';

interface CapturedRequest {
  readonly url: string;
  readonly method?: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, {
    status,
    headers: { 'content-type': 'text/plain' },
  });
}

function recordingFetch(
  responses: readonly Response[],
): { fetchImpl: typeof fetch; calls: CapturedRequest[] } {
  const calls: CapturedRequest[] = [];
  let i = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const headersInit = init?.headers ?? {};
    const headers: Record<string, string> = {};
    if (headersInit instanceof Headers) {
      headersInit.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(headersInit)) {
      for (const [k, v] of headersInit) headers[k.toLowerCase()] = v;
    } else {
      for (const [k, v] of Object.entries(headersInit)) {
        headers[k.toLowerCase()] = String(v);
      }
    }
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method: init?.method, headers, body });
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return next;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe('createOpenAiClient', () => {
  it('posts a chat-completions request and returns the message content', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({
        choices: [{ message: { content: 'a summary' } }],
      }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3',
      fetchImpl,
    });

    const out = await client.summarize('summarize this', 256);

    expect(out).toBe('a summary');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(calls[0].headers.authorization).toBeUndefined();
    expect(calls[0].body).toEqual({
      model: 'llama3',
      max_tokens: 256,
      messages: [{ role: 'user', content: 'summarize this' }],
      stream: false,
    });
  });

  it('sends a Bearer authorization header when apiKey is provided', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o-mini',
      apiKey: 'sk-openai',
      fetchImpl,
    });

    await client.summarize('hi');

    expect(calls[0].headers.authorization).toBe('Bearer sk-openai');
  });

  it('does not duplicate /chat/completions when baseUrl already includes it', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:8000/v1/chat/completions',
      modelId: 'm',
      fetchImpl,
    });

    await client.summarize('hi');

    expect(calls[0].url).toBe('http://localhost:8000/v1/chat/completions');
  });

  it('strips trailing slashes from baseUrl', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1///',
      modelId: 'm',
      fetchImpl,
    });

    await client.summarize('hi');

    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('uses the default maxTokens when none is provided', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'm',
      fetchImpl,
    });

    await client.summarize('hi');

    expect(calls[0].body).toMatchObject({ max_tokens: 1024 });
  });

  it('throws when the response has no choices', async () => {
    const { fetchImpl } = recordingFetch([jsonResponse({ choices: [] })]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'm',
      fetchImpl,
      maxRetries: 1,
    });

    await expect(client.summarize('hi')).rejects.toThrow(/No content/);
  });

  it('throws after exhausting retries on non-OK HTTP responses', async () => {
    vi.useFakeTimers();
    const { fetchImpl, calls } = recordingFetch([
      textResponse('rate limited', 429),
      textResponse('rate limited', 429),
      textResponse('rate limited', 429),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'm',
      fetchImpl,
      maxRetries: 3,
    });

    const promise = client.summarize('hi');
    promise.catch(() => {}); // attach early to swallow unhandled rejection
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow(/failed after 3 attempts/);
    expect(calls).toHaveLength(3);
    vi.useRealTimers();
  });

  it('forwards extra headers', async () => {
    const { fetchImpl, calls } = recordingFetch([
      jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    ]);

    const client = createOpenAiClient({
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'm',
      headers: { 'x-custom': 'yes' },
      fetchImpl,
    });

    await client.summarize('hi');

    expect(calls[0].headers['x-custom']).toBe('yes');
  });
});
