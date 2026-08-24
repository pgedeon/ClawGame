/**
 * Failover-demotion surfacing tests (session-14 lane A Unit 2).
 *
 * Spec (docs/ai-provider-spec.md §Frontend): "if primary fails over, surface a
 * non-blocking toast ('switched to fallback provider X')". The web can only do
 * that if the command response reports which chain entry ACTUALLY served and
 * whether earlier entries were exhausted. These tests pin that contract:
 *   - primary exhausts retries → secondary serves → providerStatus carries
 *     { provider: <secondary label>, failedOver: true }.
 *   - primary serves directly → failedOver stays false/absent.
 *
 * Registry + config stubbed at the module seam; project context stubbed on the
 * prototype — no network, no filesystem.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readAIConfigMock = vi.fn();
vi.mock('../utils/envConfig', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    readAIConfig: (...args: unknown[]) => readAIConfigMock(...args),
  };
});

const createProviderMock = vi.fn();
const resolveProviderChainMock = vi.fn();
vi.mock('./ai/registry', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createProvider: (...args: unknown[]) => createProviderMock(...args),
    resolveProviderChain: (...args: unknown[]) => resolveProviderChainMock(...args),
  };
});

import { RealAIService } from './realAIService';
import type { AIProviderId } from './ai/types';

function fakeLogger(): any {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, trace: noop, child: () => fakeLogger() };
}

function providerStub(behavior: { failTimes?: number; content?: string }) {
  let calls = 0;
  return {
    id: 'stub' as AIProviderId,
    complete: vi.fn(async () => {
      calls++;
      if (behavior.failTimes && calls <= behavior.failTimes) {
        throw Object.assign(new Error('HTTP 503'), { name: 'AIProviderError' });
      }
      return { content: behavior.content ?? 'OK_CONTENT' };
    }),
    stream: vi.fn(),
    listModels: vi.fn(),
    healthCheck: vi.fn(),
  };
}

function baseConfig(activeProvider: AIProviderId) {
  return {
    activeProvider,
    fallbackChain: [] as AIProviderId[],
    useRealAI: true,
    apiUrl: 'https://api.z.ai/api/paas/v4/chat/completions',
    model: 'test-model',
    opencode: { apiKey: '', model: '' },
    anthropic: { apiKey: '', model: '' },
    openaiCompat: { baseUrl: '', apiKey: '', model: '' },
  } as any;
}

describe('RealAIService failover demotion reporting', () => {
  const originalEnv = process.env.USE_REAL_AI;

  beforeEach(() => {
    process.env.USE_REAL_AI = 'true';
    vi.spyOn(RealAIService.prototype as any, 'getProjectContext').mockResolvedValue({ name: 'P' });
    vi.spyOn(RealAIService.prototype as any, 'buildUserPrompt').mockResolvedValue('prompt');
    readAIConfigMock.mockImplementation(() => baseConfig('opencode'));
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.USE_REAL_AI;
    else process.env.USE_REAL_AI = originalEnv;
    vi.restoreAllMocks();
  });

  it('reports failedOver + serving provider when the primary is demoted', async () => {
    resolveProviderChainMock.mockReturnValue(['opencode', 'anthropic']);
    const primary = providerStub({ failTimes: 99 }); // exhausts retries
    const secondary = providerStub({ content: 'SECONDARY_SERVED' });
    createProviderMock.mockImplementation((id: AIProviderId) => (id === 'opencode' ? primary : secondary));

    const service = new RealAIService(fakeLogger());
    const response = await service.processCommand({ projectId: 'p1', command: 'do a thing' });

    expect(response.content).toContain('SECONDARY_SERVED');
    expect(response.providerStatus?.state).toBe('ready');
    expect(response.providerStatus?.provider).toBe('anthropic');
    expect(response.providerStatus?.failedOver).toBe(true);
  });

  it('keeps failedOver false when the active provider serves directly', async () => {
    resolveProviderChainMock.mockReturnValue(['opencode']);
    const primary = providerStub({ content: 'PRIMARY_SERVED' });
    createProviderMock.mockReturnValue(primary);

    const service = new RealAIService(fakeLogger());
    const response = await service.processCommand({ projectId: 'p1', command: 'do a thing' });

    expect(response.content).toContain('PRIMARY_SERVED');
    expect(response.providerStatus?.provider).toBe('opencode');
    expect(response.providerStatus?.failedOver).toBe(false);
  });
});
