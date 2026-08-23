/**
 * Unit tests for the OpenCode Zen adapter (P1 milestone 2).
 * All HTTP traffic replays recorded fixtures through the injectable fetcher —
 * no live calls in CI. Live integration lives in the OPENCODE_API_KEY-gated
 * describe block at the bottom.
 */
import { describe, it, expect } from 'vitest';
import {
  OpenCodeProvider,
  OPENCODE_CHAT_COMPLETIONS_URL,
  OPENCODE_MODELS_URL,
  OPENCODE_DEFAULT_MODEL,
  isOpenCodeFreeModel,
} from './opencode';
import type { FetchLike } from './openai-compat';
import { AIProviderError } from '../../ai-types';

// ── Recorded fixtures (shapes captured from opencode Zen docs / OpenAI-compat wire format) ──

const COMPLETION_FIXTURE = {
  id: 'chatcmpl-fixture-1',
  object: 'chat.completion',
  model: 'big-pickle',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'FIXTURE_COMPLETION_TEXT' },
      finish_reason: 'stop',
    },
  ],
};

const CATALOG_FIXTURE = {
  data: [
    { id: 'big-pickle', name: 'Big Pickle', context_length: 200000, pricing: { prompt: '0', completion: '0' } },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', context_length: 200000, pricing: { prompt: '3', completion: '15' } },
    { id: 'nemotron-3.5-lightning-free', context_length: 128000 },
  ],
};

function fixtureFetch(
  respond: (url: string, init?: any) => Response,
  capture?: (url: string, init?: any) => void,
): FetchLike {
  return (async (url: any, init?: any) => {
    capture?.(String(url), init);
    return respond(String(url), init);
  }) as unknown as FetchLike;
}

function jsonResponse(status: number, body: any): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function sseResponse(sseLines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of sseLines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

function deltaChunk(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

// ── Adapter identity & construction ──

describe('OpenCodeProvider identity', () => {
  it('reports id=opencode and the Zen chat-completions endpoint', () => {
    const provider = new OpenCodeProvider({ apiKey: 'k-test' });
    expect(provider.id).toBe('opencode');
    expect(provider.endpoint).toBe(OPENCODE_CHAT_COMPLETIONS_URL);
    expect(provider.gatewayRoot).toBe('https://opencode.ai/zen/v1');
  });

  it('defaults to the appendix free model when none configured', async () => {
    let sentBody: any;
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    await provider.complete({ system: 's', user: 'u' });
    expect(OPENCODE_DEFAULT_MODEL).toBe('big-pickle');
    expect(sentBody.model).toBe('big-pickle');
  });

  it('passes a configured model override into the wire body', async () => {
    let sentBody: any;
    const provider = new OpenCodeProvider(
      { apiKey: 'k', model: 'x-preview-f-free' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    await provider.complete({ system: 's', user: 'u' });
    expect(sentBody.model).toBe('x-preview-f-free');
  });
});

// ── complete / stream / healthCheck on the OpenAI-compat path ──

describe('OpenCodeProvider chat-completions path', () => {
  it('POSTs to the Zen gateway with Bearer auth and parses choices[0].message.content', async () => {
    const captured: Array<{ url: string; init?: any }> = [];
    const provider = new OpenCodeProvider(
      { apiKey: 'k-zen' },
      undefined,
      fixtureFetch((url, init) => {
        captured.push({ url, init });
        return jsonResponse(200, COMPLETION_FIXTURE);
      }),
    );
    const result = await provider.complete({ system: 'sys', user: 'usr', temperature: 0.2, maxTokens: 128 });

    expect(result).toEqual({ content: 'FIXTURE_COMPLETION_TEXT' });
    expect(captured[0].url).toBe('https://opencode.ai/zen/v1/chat/completions');
    expect(captured[0].init.method).toBe('POST');
    expect(captured[0].init.headers.Authorization).toBe('Bearer k-zen');
    const body = JSON.parse(captured[0].init.body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' },
    ]);
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(128);
  });

  it('streams SSE deltas and stops at [DONE]', async () => {
    const seen: string[] = [];
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => sseResponse([
        deltaChunk('Hel'),
        deltaChunk('lo'),
        'data: [DONE]\n\n',
      ])),
    );
    const full = await provider.stream({ system: '', user: 'hi' }, t => seen.push(t));
    expect(seen).toEqual(['Hel', 'lo']);
    expect(full).toBe('Hello');
  });

  it('maps HTTP 429 to rate_limited', async () => {
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(429, { error: { message: 'Too many requests' } })),
    );
    try {
      await provider.complete({ system: '', user: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as AIProviderError).details.kind).toBe('rate_limited');
    }
  });

  it('healthCheck probes the chat endpoint with max_tokens=1', async () => {
    let sentBody: any;
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(typeof health.latencyMs).toBe('number');
    expect(sentBody.max_tokens).toBe(1);
  });
});

// ── Model catalog (GET /zen/v1/models) ──

describe('OpenCodeProvider listModels', () => {
  it('GETs the catalog with Bearer auth and maps entries incl. free flags', async () => {
    const captured: Array<{ url: string; init?: any }> = [];
    const provider = new OpenCodeProvider(
      { apiKey: 'k-cat' },
      undefined,
      fixtureFetch((url, init) => {
        captured.push({ url, init });
        return jsonResponse(200, CATALOG_FIXTURE);
      }),
    );
    const models = await provider.listModels();

    expect(captured[0].url).toBe(OPENCODE_MODELS_URL);
    expect(captured[0].init.headers.Authorization).toBe('Bearer k-cat');
    expect(models).toEqual([
      { id: 'big-pickle', name: 'Big Pickle', contextWindow: 200000, free: true },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000, free: false },
      { id: 'nemotron-3.5-lightning-free', name: undefined, contextWindow: 128000, free: true },
    ]);
  });

  it('accepts a bare-array catalog envelope', async () => {
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, [{ id: 'mimo-v2.5-free' }])),
    );
    await expect(provider.listModels()).resolves.toEqual([
      { id: 'mimo-v2.5-free', name: undefined, contextWindow: undefined, free: true },
    ]);
  });

  it('rejects an empty catalog as bad_response', async () => {
    const provider = new OpenCodeProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, { data: [] })),
    );
    try {
      await provider.listModels();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as AIProviderError).details.kind).toBe('bad_response');
    }
  });

  it('maps catalog auth failures to non-retriable bad_response', async () => {
    const provider = new OpenCodeProvider(
      { apiKey: 'bad' },
      undefined,
      fixtureFetch(() => jsonResponse(401, { error: { message: 'invalid api key' } })),
    );
    try {
      await provider.listModels();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      const details = (err as AIProviderError).details;
      expect(details.kind).toBe('bad_response');
      expect(details.retriable).toBe(false);
    }
  });
});

describe('isOpenCodeFreeModel', () => {
  it('flags appendix free IDs, -free suffixes, and zero pricing', () => {
    expect(isOpenCodeFreeModel('big-pickle')).toBe(true);
    expect(isOpenCodeFreeModel('hy3-free')).toBe(true);
    expect(isOpenCodeFreeModel('some-new-stealth-free')).toBe(true);
    expect(isOpenCodeFreeModel('claude-sonnet-4-6')).toBe(false);
    expect(isOpenCodeFreeModel('paid-model', { prompt: '0', completion: '0' })).toBe(true);
    expect(isOpenCodeFreeModel('paid-model', { prompt: '3', completion: '0' })).toBe(false);
  });
});

// ── Live integration (skipped unless OPENCODE_API_KEY is present — never runs in CI without a key) ──

describe.skipIf(!process.env.OPENCODE_API_KEY)('opencode live integration', () => {
  const apiKey = process.env.OPENCODE_API_KEY!;

  it('fetches the real Zen catalog', async () => {
    const provider = new OpenCodeProvider({ apiKey });
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.free)).toBe(true);
  }, 30_000);

  it('completes a tiny prompt on a free model end-to-end', async () => {
    const provider = new OpenCodeProvider({ apiKey, model: 'big-pickle' });
    const res = await provider.complete({
      system: 'You are a connectivity probe. Answer with exactly one word.',
      user: 'Say OK.',
      maxTokens: 16,
    });
    expect(res.content.trim().length).toBeGreaterThan(0);
  }, 60_000);
});
