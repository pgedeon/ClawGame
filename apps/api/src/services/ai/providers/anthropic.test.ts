/**
 * Unit tests for the native Anthropic Messages adapter (session-13).
 * All HTTP traffic replays recorded fixtures through the injectable fetcher —
 * no live calls in CI. Live integration lives in the ANTHROPIC_API_KEY-gated
 * describe block at the bottom.
 */
import { describe, it, expect } from 'vitest';
import {
  AnthropicProvider,
  ANTHROPIC_MESSAGES_URL,
  ANTHROPIC_MODELS_URL,
  ANTHROPIC_VERSION,
} from './anthropic';
import type { FetchLike } from './openai-compat';
import { AIProviderError } from '../../ai-types';
import { createProvider, isProviderConfigured } from '../registry';
import { resolveAIConfigFromMap } from '../../../utils/envConfig';

// ── Recorded fixtures (shapes per the Anthropic Messages API wire format) ──

const COMPLETION_FIXTURE = {
  id: 'msg_fixture1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-6',
  content: [
    { type: 'text', text: 'FIXTURE_' },
    { type: 'text', text: 'COMPLETION_TEXT' },
  ],
  stop_reason: 'end_turn',
  usage: { input_tokens: 12, output_tokens: 25 },
};

const CATALOG_FIXTURE = {
  data: [
    { type: 'model', id: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6' },
    { type: 'model', id: 'claude-opus-4-1', display_name: 'Claude Opus 4.1' },
    { type: 'model', id: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5' },
  ],
  has_more: false,
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

function textDelta(text: string): string {
  return `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })}\n\n`;
}

// ── Adapter identity & construction ──

describe('AnthropicProvider identity', () => {
  it('reports id=anthropic and the Messages endpoint', () => {
    const provider = new AnthropicProvider({ apiKey: 'k-test' });
    expect(provider.id).toBe('anthropic');
    expect(provider.endpoint).toBe(ANTHROPIC_MESSAGES_URL);
    expect(ANTHROPIC_MESSAGES_URL).toBe('https://api.anthropic.com/v1/messages');
  });

  it('defaults to claude-sonnet-4-6 when none configured', async () => {
    let sentBody: any;
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    await provider.complete({ system: 's', user: 'u' });
    expect(sentBody.model).toBe('claude-sonnet-4-6');
  });

  it('passes a configured model override into the wire body', async () => {
    let sentBody: any;
    const provider = new AnthropicProvider(
      { apiKey: 'k', model: 'claude-opus-4-1' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    await provider.complete({ system: 's', user: 'u' });
    expect(sentBody.model).toBe('claude-opus-4-1');
  });

  it('honors a custom baseUrl for gateway/proxy deployments', () => {
    const provider = new AnthropicProvider({ apiKey: 'k', baseUrl: 'https://proxy.example.com/ant/' });
    expect(provider.endpoint).toBe('https://proxy.example.com/ant/v1/messages');
  });
});

// ── complete on the native Messages path ──

describe('AnthropicProvider messages path', () => {
  it('POSTs /v1/messages with x-api-key + anthropic-version headers and top-level system', async () => {
    const captured: Array<{ url: string; init?: any }> = [];
    const provider = new AnthropicProvider(
      { apiKey: 'sk-ant-test' },
      undefined,
      fixtureFetch((url, init) => {
        captured.push({ url, init });
        return jsonResponse(200, COMPLETION_FIXTURE);
      }),
    );
    const result = await provider.complete({ system: 'sys', user: 'usr', temperature: 0.2, maxTokens: 128 });

    expect(result).toEqual({ content: 'FIXTURE_COMPLETION_TEXT' });
    expect(captured[0].url).toBe(ANTHROPIC_MESSAGES_URL);
    expect(captured[0].init.method).toBe('POST');
    expect(captured[0].init.headers['x-api-key']).toBe('sk-ant-test');
    expect(captured[0].init.headers['anthropic-version']).toBe(ANTHROPIC_VERSION);
    expect(captured[0].init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(captured[0].init.body);
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([{ role: 'user', content: 'usr' }]);
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(128);
  });

  it('maps HTTP 429 rate_limit_error to rate_limited', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(429, { type: 'error', error: { type: 'rate_limit_error', message: 'Number of request tokens has exceeded your per-minute rate limit' } })),
    );
    try {
      await provider.complete({ system: '', user: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as AIProviderError).details.kind).toBe('rate_limited');
    }
  });

  it('maps HTTP 529 overloaded_error to retriable http_error', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })),
    );
    try {
      await provider.complete({ system: '', user: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      const details = (err as AIProviderError).details;
      expect(details.kind).toBe('http_error');
      expect(details.retriable).toBe(true);
    }
  });

  it('maps HTTP 401 authentication_error to non-retriable bad_response with the provider message', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'bad' },
      undefined,
      fixtureFetch(() => jsonResponse(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })),
    );
    try {
      await provider.complete({ system: '', user: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      const details = (err as AIProviderError).details;
      expect(details.kind).toBe('bad_response');
      expect(details.retriable).toBe(false);
      expect(details.message).toBe('invalid x-api-key');
    }
  });

  it('rejects a response without text content blocks as bad_response', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, { id: 'msg_x', type: 'message', content: [], stop_reason: 'max_tokens' })),
    );
    try {
      await provider.complete({ system: '', user: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as AIProviderError).details.kind).toBe('bad_response');
    }
  });
});

// ── stream over SSE content_block_delta events ──

describe('AnthropicProvider stream', () => {
  it('emits only text_delta payloads and returns the full text', async () => {
    const seen: string[] = [];
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => sseResponse([
        `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'msg_1', usage: { input_tokens: 9, output_tokens: 1 } } })}\n\n`,
        `event: ping\ndata: ${JSON.stringify({ type: 'ping' })}\n\n`,
        `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`,
        textDelta('Hel'),
        textDelta('lo'),
        `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`,
        `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 2 } })}\n\n`,
        `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
      ])),
    );
    const full = await provider.stream({ system: '', user: 'hi' }, t => seen.push(t));
    expect(seen).toEqual(['Hel', 'lo']);
    expect(full).toBe('Hello');
  });

  it('ignores thinking deltas and malformed SSE lines', async () => {
    const seen: string[] = [];
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => sseResponse([
        `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'hmm' } })}\n\n`,
        'data: not-json-at-all\n\n',
        textDelta('ok'),
      ])),
    );
    const full = await provider.stream({ system: '', user: 'hi' }, t => seen.push(t));
    expect(seen).toEqual(['ok']);
    expect(full).toBe('ok');
  });

  it('streams with x-api-key auth and stream:true in the body', async () => {
    let capturedInit: any;
    const provider = new AnthropicProvider(
      { apiKey: 'sk-ant-s' },
      undefined,
      fixtureFetch(() => sseResponse([textDelta('x')]), (_url, init) => { capturedInit = init; }),
    );
    await provider.stream({ system: 's', user: 'u' }, () => {});
    expect(capturedInit.headers['x-api-key']).toBe('sk-ant-s');
    expect(JSON.parse(capturedInit.body).stream).toBe(true);
  });
});

// ── Model catalog (GET /v1/models) ──

describe('AnthropicProvider listModels', () => {
  it('GETs the catalog with Messages auth headers and maps entries', async () => {
    const captured: Array<{ url: string; init?: any }> = [];
    const provider = new AnthropicProvider(
      { apiKey: 'sk-ant-cat' },
      undefined,
      fixtureFetch((url, init) => {
        captured.push({ url, init });
        return jsonResponse(200, CATALOG_FIXTURE);
      }),
    );
    const models = await provider.listModels();

    expect(captured[0].url).toBe(ANTHROPIC_MODELS_URL);
    expect(captured[0].init.method).toBe('GET');
    expect(captured[0].init.headers['x-api-key']).toBe('sk-ant-cat');
    expect(captured[0].init.headers['anthropic-version']).toBe(ANTHROPIC_VERSION);
    expect(models).toEqual([
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: undefined },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', contextWindow: undefined },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: undefined },
    ]);
  });

  it('accepts a bare-array catalog envelope', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, [{ id: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5' }])),
    );
    await expect(provider.listModels()).resolves.toEqual([
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: undefined },
    ]);
  });

  it('rejects an empty catalog as bad_response', async () => {
    const provider = new AnthropicProvider(
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
    const provider = new AnthropicProvider(
      { apiKey: 'bad' },
      undefined,
      fixtureFetch(() => jsonResponse(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })),
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

// ── healthCheck ──

describe('AnthropicProvider healthCheck', () => {
  it('probes the messages endpoint with max_tokens=1', async () => {
    let sentBody: any;
    const provider = new AnthropicProvider(
      { apiKey: 'k' },
      undefined,
      fixtureFetch(() => jsonResponse(200, COMPLETION_FIXTURE), (_url, init) => { sentBody = JSON.parse(init.body); }),
    );
    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(typeof health.latencyMs).toBe('number');
    expect(sentBody.max_tokens).toBe(1);
  });

  it('reports failures without throwing', async () => {
    const provider = new AnthropicProvider(
      { apiKey: 'bad' },
      undefined,
      fixtureFetch(() => jsonResponse(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })),
    );
    const health = await provider.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.error).toContain('HTTP 401');
  });
});

// ── Registry + envConfig wiring ──

describe('anthropic registry wiring', () => {
  function configFrom(entries: Record<string, string>) {
    return resolveAIConfigFromMap(new Map(Object.entries(entries)));
  }

  it('is configured exactly when an anthropic key exists', () => {
    expect(isProviderConfigured('anthropic', configFrom({ ANTHROPIC_API_KEY: 'sk-ant' }))).toBe(true);
    expect(isProviderConfigured('anthropic', configFrom({}))).toBe(false);
  });

  it('createProvider builds an AnthropicProvider reading the anthropic slot', () => {
    const config = configFrom({ ANTHROPIC_API_KEY: 'sk-reg', ANTHROPIC_MODEL: 'claude-opus-4-1' });
    const provider = createProvider('anthropic', undefined, config);
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider?.id).toBe('anthropic');
    expect((provider as AnthropicProvider).endpoint).toBe(ANTHROPIC_MESSAGES_URL);
  });

  it('createProvider returns null for unconfigured anthropic and mock', () => {
    expect(createProvider('anthropic', undefined, configFrom({}))).toBeNull();
    expect(createProvider('mock')).toBeNull();
  });
});

// ── Live integration (skipped unless ANTHROPIC_API_KEY is present — never runs in CI without a key) ──

describe.skipIf(!process.env.ANTHROPIC_API_KEY)('anthropic live integration', () => {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  it('fetches the real model catalog', async () => {
    const provider = new AnthropicProvider({ apiKey });
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.id.startsWith('claude-'))).toBe(true);
  }, 30_000);

  it('completes a tiny prompt end-to-end', async () => {
    const provider = new AnthropicProvider({ apiKey });
    const res = await provider.complete({
      system: 'You are a connectivity probe. Answer with exactly one word.',
      user: 'Say OK.',
      maxTokens: 16,
    });
    expect(res.content.trim().length).toBeGreaterThan(0);
  }, 60_000);
});
