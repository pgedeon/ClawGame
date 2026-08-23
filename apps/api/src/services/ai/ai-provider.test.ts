/**
 * Unit tests for the AI provider seam (P1 milestone 1).
 * Interface conformance + pure wire-format helpers only — no live HTTP.
 */
import { describe, it, expect } from 'vitest';
import { AIProviderError } from '../ai-types';
import {
  OpenAICompatProvider,
  assertCompletionPayload,
  createResponseError,
  extractProviderCode,
  extractProviderMessage,
  isRateLimitText,
  normalizeError,
  parseRetryAfter,
  safeJsonParse,
} from './providers/openai-compat';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  ProviderHealth,
  ProviderModel,
} from './types';

describe('AIProvider interface conformance', () => {
  it('OpenAICompatProvider satisfies AIProvider', () => {
    const provider: AIProvider = new OpenAICompatProvider({
      baseUrl: 'https://example.invalid/chat/completions',
      apiKey: 'k-test',
      model: 'test-model',
    });
    expect(provider.id).toBe('openai-compat');
  });

  it('exposes configured endpoint for diagnostics', () => {
    const provider = new OpenAICompatProvider({
      baseUrl: 'https://example.invalid/chat/completions',
      apiKey: 'k',
      model: 'm',
    });
    expect(provider.endpoint).toBe('https://example.invalid/chat/completions');
  });

  it('listModels reports the configured model until catalog endpoints are wired', async () => {
    const provider = new OpenAICompatProvider({ baseUrl: 'x', apiKey: 'k', model: 'glm-4.5-flash' });
    await expect(provider.listModels()).resolves.toEqual([{ id: 'glm-4.5-flash' }]);
  });

  it('a minimal custom adapter can implement the interface', async () => {
    class StubProvider implements AIProvider {
      readonly id = 'mock' as const;
      async listModels(): Promise<ProviderModel[]> { return [{ id: 'stub', free: true }]; }
      async complete(req: CompletionRequest): Promise<CompletionResponse> {
        return { content: `${req.system}|${req.user}` };
      }
      async stream(_req: CompletionRequest, onChunk: (text: string) => void): Promise<string> {
        onChunk('chunk');
        return 'chunk';
      }
      async healthCheck(): Promise<ProviderHealth> { return { ok: true, latencyMs: 1 }; }
    }
    const stub = new StubProvider();
    await expect(stub.complete({ system: 's', user: 'u' })).resolves.toEqual({ content: 's|u' });
    const seen: string[] = [];
    await expect(stub.stream({ system: '', user: '' }, t => seen.push(t))).resolves.toBe('chunk');
    expect(seen).toEqual(['chunk']);
    await expect(stub.healthCheck()).resolves.toEqual({ ok: true, latencyMs: 1 });
  });
});

describe('wire-format helpers', () => {
  it('assertCompletionPayload accepts a well-formed completion', () => {
    expect(() => assertCompletionPayload({ choices: [{ message: { content: 'hello' } }] })).not.toThrow();
  });

  it('assertCompletionPayload rejects missing content as bad_response', () => {
    try {
      assertCompletionPayload({ choices: [] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as AIProviderError).details.kind).toBe('bad_response');
    }
  });

  it('assertCompletionPayload maps provider code 1302 to rate_limited preserving response status', () => {
    const response = new Response(null, { status: 200 });
    try {
      assertCompletionPayload({ code: 1302, choices: [] }, response);
      expect.unreachable('should have thrown');
    } catch (err) {
      const details = (err as AIProviderError).details;
      expect(details.kind).toBe('rate_limited');
      expect(details.statusCode).toBe(200);
      expect(details.providerCode).toBe('1302');
    }
  });

  it('assertCompletionPayload maps rate-limit text to rate_limited', () => {
    try {
      assertCompletionPayload({ error: { message: 'Too many requests, please slow down' } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as AIProviderError).details.kind).toBe('rate_limited');
    }
  });

  it('createResponseError classifies 5xx as retriable http_error', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'upstream boom' } }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
    const err = await createResponseError(response);
    expect(err.details.kind).toBe('http_error');
    expect(err.details.retriable).toBe(true);
    expect(err.details.message).toBe('upstream boom');
  });

  it('createResponseError classifies 429 as rate_limited with Retry-After', async () => {
    const response = new Response('{"error":{"message":"slow down"}}', {
      status: 429,
      headers: { 'retry-after': '30' },
    });
    const err = await createResponseError(response);
    expect(err.details.kind).toBe('rate_limited');
    expect(err.details.retryAfterSeconds).toBe(30);
    expect(err.details.retriable).toBe(false);
  });

  it('createResponseError treats 4xx as non-retriable bad_response', async () => {
    const response = new Response('nope', { status: 401 });
    const err = await createResponseError(response);
    expect(err.details.kind).toBe('bad_response');
    expect(err.details.retriable).toBe(false);
  });

  it('extractProviderCode handles string and object shapes', () => {
    expect(extractProviderCode('error 1302 happened')).toBe('1302');
    expect(extractProviderCode({ code: 7 })).toBe('7');
    expect(extractProviderCode({ error: { error_code: 'x1' } })).toBe('x1');
    expect(extractProviderCode(undefined)).toBeUndefined();
    expect(extractProviderCode({})).toBeUndefined();
  });

  it('extractProviderMessage digs nested fields', () => {
    expect(extractProviderMessage({ error: { message: 'a' } })).toBe('a');
    expect(extractProviderMessage({ message: 'b' })).toBe('b');
    expect(extractProviderMessage({ error: { details: 'c' } })).toBe('c');
    expect(extractProviderMessage('raw')).toBe('raw');
    expect(extractProviderMessage(null)).toBeUndefined();
  });

  it('isRateLimitText matches known phrasings incl. z.ai Chinese string', () => {
    expect(isRateLimitText('Rate limit exceeded')).toBe(true);
    expect(isRateLimitText('访问频率过高')).toBe(true);
    expect(isRateLimitText('all good')).toBe(false);
    expect(isRateLimitText(undefined)).toBe(false);
  });

  it('parseRetryAfter parses finite seconds only', () => {
    expect(parseRetryAfter('15')).toBe(15);
    expect(parseRetryAfter('abc')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it('safeJsonParse never throws', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('{broken')).toBeNull();
    expect(safeJsonParse('')).toBeNull();
  });

  it('normalizeError passes AIProviderError through untouched', () => {
    const original = new AIProviderError({ kind: 'timeout', message: 't', retriable: false });
    expect(normalizeError(original)).toBe(original);
  });

  it('normalizeError converts AbortError-shaped objects to timeout AIProviderError', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const out = normalizeError(abort) as AIProviderError;
    expect(out).toBeInstanceOf(AIProviderError);
    expect(out.details.kind).toBe('timeout');
  });

  it('normalizeError leaves unrelated errors alone', () => {
    const plain = new Error('network down');
    expect(normalizeError(plain)).toBe(plain);
  });
});
