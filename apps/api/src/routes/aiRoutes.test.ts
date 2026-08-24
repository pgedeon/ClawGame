/**
 * Route tests for the aiRoutes placeholder fixes (session-14, lane A Unit 1).
 *
 * Covers the three session-6 placeholders flagged by the anthropic-adapter lane:
 *   - GET /api/ai/providers reports anthropic availability from the registry
 *     (no "adapter pending" note — every registry id has a native adapter).
 *   - POST /api/ai/test no longer carries the dead null-branch message.
 *   - GET /api/ai/models?provider=anthropic calls the live listModels instead
 *     of returning a static catalog.
 *
 * All provider construction is stubbed at the registry seam and config comes
 * from a mocked readAIConfig — no network, no .env dependency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const readAIConfigMock = vi.fn();
vi.mock('../utils/envConfig', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    readAIConfig: (...args: unknown[]) => readAIConfigMock(...args),
  };
});

const createProviderMock = vi.fn();
vi.mock('../services/ai/registry', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createProvider: (...args: unknown[]) => createProviderMock(...args),
  };
});

import { aiRoutes } from './aiRoutes';
import { resolveAIConfigFromMap } from '../utils/envConfig';
import type { AIProviderId } from '../services/ai/types';

function configFromEnv(entries: Record<string, string>) {
  return resolveAIConfigFromMap(new Map(Object.entries(entries)));
}

function stubProvider(overrides: Partial<{ health: any; models: any[]; failWith: Error }> = {}) {
  return {
    id: 'stub' as AIProviderId,
    healthCheck: overrides.failWith
      ? vi.fn(async () => { throw overrides.failWith; })
      : vi.fn(async () => overrides.health ?? { ok: true, latencyMs: 5 }),
    listModels: vi.fn(async () => {
      if (overrides.failWith) throw overrides.failWith;
      return overrides.models ?? [];
    }),
    complete: vi.fn(),
    stream: vi.fn(),
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(aiRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  createProviderMock.mockReset();
  // Default: unconfigured everything (registry isProviderConfigured reads this).
  readAIConfigMock.mockImplementation(() => configFromEnv({}));
});

describe('GET /api/ai/providers', () => {
  it('reports anthropic available from the registry with no adapter-pending note', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ai/providers' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const anthropic = body.providers.find((p: any) => p.id === 'anthropic');
    expect(anthropic.available).toBe(true);
    expect(anthropic.note).toBeUndefined();
    await app.close();
  });

  it('probes live health for configured providers', async () => {
    readAIConfigMock.mockImplementation(() => configFromEnv({ ANTHROPIC_API_KEY: 'sk-test' }));
    const stub = stubProvider({ health: { ok: true, latencyMs: 7 } });
    createProviderMock.mockImplementation((id: AIProviderId) => (id === 'anthropic' ? stub : null));

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ai/providers' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const anthropic = body.providers.find((p: any) => p.id === 'anthropic');
    expect(anthropic.configured).toBe(true);
    expect(anthropic.health).toEqual({ ok: true, latencyMs: 7 });
    expect(stub.healthCheck).toHaveBeenCalled();
    // Unconfigured providers skip the probe entirely.
    const opencode = body.providers.find((p: any) => p.id === 'opencode');
    expect(opencode.configured).toBe(false);
    expect(opencode.health).toBeNull();
    await app.close();
  });
});

describe('POST /api/ai/test', () => {
  it('returns 400 not-configured for anthropic without a key (dead branch removed)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/test',
      payload: { provider: 'anthropic' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('not configured');
    expect(body.error).not.toContain('not implemented');
    expect(createProviderMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('health-checks the configured anthropic adapter through the registry', async () => {
    readAIConfigMock.mockImplementation(() => configFromEnv({ ANTHROPIC_API_KEY: 'sk-test' }));
    const stub = stubProvider({ health: { ok: false, latencyMs: 12, error: 'HTTP 401: invalid x-api-key' } });
    createProviderMock.mockReturnValue(stub);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/test',
      payload: { provider: 'anthropic' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ provider: 'anthropic', ok: false, latencyMs: 12, error: 'HTTP 401: invalid x-api-key' });
    expect(createProviderMock).toHaveBeenCalledWith('anthropic');
    await app.close();
  });
});

describe('GET /api/ai/models?provider=anthropic', () => {
  it('calls the live listModels instead of returning a static catalog', async () => {
    readAIConfigMock.mockImplementation(() => configFromEnv({ ANTHROPIC_API_KEY: 'sk-test' }));
    const stub = stubProvider({
      models: [
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
        { id: 'claude-haiku-4-5' },
      ],
    });
    createProviderMock.mockReturnValue(stub);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ai/models?provider=anthropic' });
    expect(res.statusCode).toBe(200);
    expect(stub.listModels).toHaveBeenCalledTimes(1);
    expect(res.json()).toEqual({
      models: [
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
        { id: 'claude-haiku-4-5' },
      ],
    });
    await app.close();
  });

  it('returns 400 when no Anthropic key is configured', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ai/models?provider=anthropic' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('Anthropic API key not configured');
    expect(createProviderMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('maps catalog fetch failures to 502', async () => {
    readAIConfigMock.mockImplementation(() => configFromEnv({ ANTHROPIC_API_KEY: 'sk-test' }));
    createProviderMock.mockReturnValue(stubProvider({ failWith: new Error('HTTP 429: rate limited') }));

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ai/models?provider=anthropic' });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toContain('Failed to fetch Anthropic catalog');
    expect(res.json().error).toContain('HTTP 429');
    await app.close();
  });
});
