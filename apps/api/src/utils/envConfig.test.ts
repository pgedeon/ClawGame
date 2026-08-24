/**
 * Unit tests for envConfig multi-provider resolution (P1 milestone 2).
 * Pure-logic tests over resolveAIConfigFromMap — no filesystem access, so the
 * real apps/api/.env is never touched. Legacy-key migration must be lossless:
 * a working z.ai / OpenRouter key always surfaces in the openaiCompat preset.
 */
import { describe, it, expect } from 'vitest';
import { resolveAIConfigFromMap } from './envConfig';

function envMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('resolveAIConfigFromMap — legacy migration', () => {
  it('legacy z.ai key migrates into the openaiCompat preset without losing the key', () => {
    const config = resolveAIConfigFromMap(envMap({
      AI_API_URL: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
      AI_API_KEY: 'zai-secret',
      AI_MODEL: 'glm-4.5-flash',
      USE_REAL_AI: 'true',
    }));

    expect(config.provider).toBe('zai');
    expect(config.zaiApiKey).toBe('zai-secret');
    expect(config.openaiCompat.apiKey).toBe('zai-secret');           // migrated view
    expect(config.openaiCompat.baseUrl).toBe('https://api.z.ai/api/coding/paas/v4/chat/completions');
    expect(config.openaiCompat.model).toBe('glm-4.5-flash');
    expect(config.activeProvider).toBe('openai-compat');             // first configured provider wins
    expect(config.fallbackChain).toEqual([]);                        // nothing else configured
    expect(config.useRealAI).toBe(true);
  });

  it('legacy OpenRouter key migrates into the preset (URL-detected provider)', () => {
    const config = resolveAIConfigFromMap(envMap({
      AI_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
      OPENROUTER_API_KEY: 'or-secret',
      AI_MODEL: 'anthropic/claude-sonnet-4.6',
    }));

    expect(config.provider).toBe('openrouter');
    expect(config.openrouterApiKey).toBe('or-secret');
    expect(config.openaiCompat.apiKey).toBe('or-secret');
    expect(config.openaiCompat.baseUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(config.activeProvider).toBe('openai-compat');
  });

  it('explicit OPENAI_COMPAT_* keys win over migrated legacy values', () => {
    const config = resolveAIConfigFromMap(envMap({
      AI_API_KEY: 'zai-secret',
      OPENAI_COMPAT_API_KEY: 'custom-secret',
      OPENAI_COMPAT_BASE_URL: 'https://my-host/v1/chat/completions',
      OPENAI_COMPAT_MODEL: 'llama-3',
    }));

    expect(config.openaiCompat).toEqual({
      baseUrl: 'https://my-host/v1/chat/completions',
      apiKey: 'custom-secret',
      model: 'llama-3',
    });
    // legacy fields untouched
    expect(config.zaiApiKey).toBe('zai-secret');
  });

  it('never loses either legacy key when both are stored', () => {
    const config = resolveAIConfigFromMap(envMap({
      AI_API_URL: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
      AI_API_KEY: 'zai-secret',
      OPENROUTER_API_KEY: 'or-secret',
    }));

    expect(config.zaiApiKey).toBe('zai-secret');
    expect(config.openrouterApiKey).toBe('or-secret');
    expect(config.apiKey).toBe('zai-secret'); // active per URL detection
  });
});

describe('resolveAIConfigFromMap — activeProvider & fallbackChain', () => {
  it('opencode key present → active opencode with openai-compat as fallback', () => {
    const config = resolveAIConfigFromMap(envMap({
      OPENCODE_API_KEY: 'zen-secret',
      AI_API_KEY: 'zai-secret',
    }));

    expect(config.activeProvider).toBe('opencode');
    expect(config.opencode.apiKey).toBe('zen-secret');
    expect(config.fallbackChain).toEqual(['openai-compat']);
  });

  it('explicit AI_ACTIVE_PROVIDER wins over auto-detection; mock forces no live chain', () => {
    const config = resolveAIConfigFromMap(envMap({
      OPENCODE_API_KEY: 'zen-secret',
      AI_ACTIVE_PROVIDER: 'mock',
    }));
    expect(config.activeProvider).toBe('mock');
    expect(config.fallbackChain).toEqual(['opencode']);
  });

  it('invalid active provider values fall back to auto-detection', () => {
    const config = resolveAIConfigFromMap(envMap({
      AI_API_KEY: 'zai-secret',
      AI_ACTIVE_PROVIDER: 'bogus-provider',
    }));
    expect(config.activeProvider).toBe('openai-compat');
  });

  it('parses explicit AI_FALLBACK_CHAIN, dropping mock and unknown ids', () => {
    const config = resolveAIConfigFromMap(envMap({
      OPENCODE_API_KEY: 'zen-secret',
      AI_ACTIVE_PROVIDER: 'opencode',
      AI_FALLBACK_CHAIN: 'mock, bogus, openai-compat, anthropic',
    }));
    expect(config.fallbackChain).toEqual(['openai-compat', 'anthropic']);
  });

  it('nothing configured → mock with empty chain', () => {
    const config = resolveAIConfigFromMap(envMap({}));
    expect(config.activeProvider).toBe('mock');
    expect(config.fallbackChain).toEqual([]);
    expect(config.openaiCompat.apiKey).toBe('');
    expect(config.useRealAI).toBe(false);
  });

  it('anthropic defaults to claude-sonnet-4-6 and stores its key independently', () => {
    const config = resolveAIConfigFromMap(envMap({
      ANTHROPIC_API_KEY: 'sk-ant',
    }));
    expect(config.anthropic).toEqual({ apiKey: 'sk-ant', model: 'claude-sonnet-4-6' });
    // native adapter landed (session-13) → a stored key auto-selects anthropic
    expect(config.activeProvider).toBe('anthropic');
    expect(config.fallbackChain).toEqual([]);
  });

  it('anthropic joins the default chain behind opencode when both are configured', () => {
    const config = resolveAIConfigFromMap(envMap({
      OPENCODE_API_KEY: 'zen-secret',
      ANTHROPIC_API_KEY: 'sk-ant',
      OPENAI_COMPAT_API_KEY: 'compat-secret',
    }));
    expect(config.activeProvider).toBe('opencode');
    expect(config.fallbackChain).toEqual(['anthropic', 'openai-compat']);
  });

  it('explicit AI_ACTIVE_PROVIDER=anthropic wins over auto-detection', () => {
    const config = resolveAIConfigFromMap(envMap({
      OPENCODE_API_KEY: 'zen-secret',
      ANTHROPIC_API_KEY: 'sk-ant',
      AI_ACTIVE_PROVIDER: 'anthropic',
    }));
    expect(config.activeProvider).toBe('anthropic');
    expect(config.fallbackChain).toEqual(['opencode']);
  });
});
