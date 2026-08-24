/**
 * .env file reader/writer for AI configuration.
 * Reads/writes apps/api/.env directly so dashboard can persist settings.
 * Supports separate API keys per provider.
 *
 * P1 milestone 2 (docs/ai-provider-spec.md): extended with the multi-provider
 * shape (activeProvider + fallbackChain + per-provider settings). Legacy keys
 * (`AI_API_KEY`, `OPENROUTER_API_KEY`, `AI_API_URL`, `AI_MODEL`) are migrated
 * into the `openaiCompat` preset view on every load and are never deleted or
 * rewritten, so an existing working key keeps working in both shapes.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env');

export type AIProviderIdValue = 'opencode' | 'anthropic' | 'openai-compat' | 'mock';

export interface AIConfig {
  // ── Legacy shape (kept for backward compatibility — routes/clients depend on it) ──
  provider: 'openrouter' | 'zai';
  apiUrl: string;
  model: string;
  apiKey: string;           // active key for current provider
  openrouterApiKey: string; // stored OpenRouter key (may differ from active)
  zaiApiKey: string;        // stored z.ai key
  useRealAI: boolean;

  // ── Multi-provider shape (docs/ai-provider-spec.md §Config & storage) ──
  activeProvider: AIProviderIdValue;
  /** Ordered fallback after the active provider; mock is implicit last (never stored). */
  fallbackChain: AIProviderIdValue[];
  opencode: { apiKey: string; model: string };
  anthropic: { apiKey: string; model: string };
  openaiCompat: { baseUrl: string; apiKey: string; model: string };
}

export interface AIConfigUpdates {
  // legacy fields
  provider?: 'openrouter' | 'zai';
  apiUrl?: string;
  model?: string;
  apiKey?: string;
  useRealAI?: boolean;
  // multi-provider fields
  activeProvider?: AIProviderIdValue;
  fallbackChain?: AIProviderIdValue[];
  opencode?: { apiKey?: string; model?: string };
  anthropic?: { apiKey?: string; model?: string };
  openaiCompat?: { baseUrl?: string; apiKey?: string; model?: string };
}

/** Canonical defaults */
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6';
const LEGACY_DEFAULT_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const LEGACY_DEFAULT_MODEL = 'glm-4.5-flash';
const VALID_PROVIDER_IDS: AIProviderIdValue[] = ['opencode', 'anthropic', 'openai-compat', 'mock'];

/** Parse KEY=VALUE lines, ignore comments and blanks */
function parseEnv(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      map.set(trimmed.slice(0, eqIdx), trimmed.slice(eqIdx + 1));
    }
  }
  return map;
}

/** Serialize back, preserving comment lines from original content */
function serializeEnv(original: string, updates: Map<string, string>): string {
  const lines = original.split('\n');
  const updated = new Set<string>();

  const result = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx);
      if (updates.has(key)) {
        updated.add(key);
        return `${key}=${updates.get(key)}`;
      }
    }
    return line;
  });

  // Append any new keys
  for (const [key, value] of updates) {
    if (!updated.has(key)) {
      result.push(`${key}=${value}`);
    }
  }

  return result.join('\n');
}

/** Detect provider from URL */
export function detectProvider(url: string): 'openrouter' | 'zai' {
  if (url.includes('openrouter')) return 'openrouter';
  return 'zai';
}

/**
 * Pure config resolution from a parsed .env map.
 *
 * Legacy migration (idempotent, lossless): the z.ai / OpenRouter keys and URL
 * surface as the `openaiCompat` preset unless explicit OPENAI_COMPAT_* keys
 * exist. Legacy lines are never modified by this function.
 */
export function resolveAIConfigFromMap(map: Map<string, string>): AIConfig {
  const apiUrl = map.get('AI_API_URL') || LEGACY_DEFAULT_URL;
  const provider = detectProvider(apiUrl);
  const zaiKey = map.get('AI_API_KEY') || '';
  const orKey = map.get('OPENROUTER_API_KEY') || '';
  const legacyActiveKey = provider === 'openrouter' ? orKey : zaiKey;

  const opencode = {
    apiKey: map.get('OPENCODE_API_KEY') || '',
    model: map.get('OPENCODE_MODEL') || '',
  };
  const anthropic = {
    apiKey: map.get('ANTHROPIC_API_KEY') || '',
    model: map.get('ANTHROPIC_MODEL') || ANTHROPIC_DEFAULT_MODEL,
  };
  const openaiCompat = {
    baseUrl: map.get('OPENAI_COMPAT_BASE_URL') || apiUrl,
    apiKey: map.get('OPENAI_COMPAT_API_KEY') || legacyActiveKey,
    model: map.get('OPENAI_COMPAT_MODEL') || map.get('AI_MODEL') || LEGACY_DEFAULT_MODEL,
  };

  // Active provider: explicit setting wins; else first configured zero-config-capable provider.
  let activeProvider: AIProviderIdValue = 'mock';
  const explicit = map.get('AI_ACTIVE_PROVIDER');
  if (explicit && (VALID_PROVIDER_IDS as string[]).includes(explicit)) {
    activeProvider = explicit as AIProviderIdValue;
  } else if (opencode.apiKey) {
    activeProvider = 'opencode';
  } else if (anthropic.apiKey) {
    activeProvider = 'anthropic';
  } else if (openaiCompat.apiKey) {
    activeProvider = 'openai-compat';
  }

  // Fallback chain: explicit list wins (validated); else configured providers minus active.
  let fallbackChain: AIProviderIdValue[] = [];
  const rawChain = map.get('AI_FALLBACK_CHAIN');
  if (rawChain !== undefined) {
    fallbackChain = rawChain
      .split(',')
      .map(s => s.trim())
      .filter((s): s is AIProviderIdValue => (VALID_PROVIDER_IDS as string[]).includes(s))
      .filter(id => id !== 'mock');
  } else {
    const configured: AIProviderIdValue[] = [];
    if (opencode.apiKey) configured.push('opencode');
    if (anthropic.apiKey) configured.push('anthropic');
    if (openaiCompat.apiKey) configured.push('openai-compat');
    fallbackChain = configured.filter(id => id !== activeProvider);
  }

  return {
    provider,
    apiUrl,
    model: map.get('AI_MODEL') || LEGACY_DEFAULT_MODEL,
    apiKey: legacyActiveKey,
    openrouterApiKey: orKey,
    zaiApiKey: zaiKey,
    useRealAI: map.get('USE_REAL_AI') === 'true' || map.get('USE_REAL_AI') === '1',
    activeProvider,
    fallbackChain,
    opencode,
    anthropic,
    openaiCompat,
  };
}

/** Read current AI config from .env file */
export function readAIConfig(): AIConfig {
  let content = '';
  try {
    content = readFileSync(ENV_PATH, 'utf-8');
  } catch {
    // .env doesn't exist yet
  }
  return resolveAIConfigFromMap(parseEnv(content));
}

/** Get API key for a specific provider */
export function getApiKeyForProvider(provider: 'openrouter' | 'zai'): string {
  const config = readAIConfig();
  return provider === 'openrouter' ? config.openrouterApiKey : config.zaiApiKey;
}

/** Write AI config updates to .env and process.env */
export function writeAIConfig(updates: AIConfigUpdates): AIConfig {
  let content = '';
  try {
    content = readFileSync(ENV_PATH, 'utf-8');
  } catch {
    // Will create new file
  }

  const envUpdates = new Map<string, string>();

  if (updates.provider !== undefined) {
    // When switching provider, update the URL too
    if (updates.provider === 'openrouter' && !updates.apiUrl) {
      const config = readAIConfig();
      if (!config.apiUrl.includes('openrouter')) {
        envUpdates.set('AI_API_URL', 'https://openrouter.ai/api/v1/chat/completions');
        process.env.AI_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
      }
    } else if (updates.provider === 'zai' && !updates.apiUrl) {
      const config = readAIConfig();
      if (!config.apiUrl.includes('z.ai')) {
        envUpdates.set('AI_API_URL', 'https://api.z.ai/api/coding/paas/v4/chat/completions');
        process.env.AI_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
      }
    }
  }

  if (updates.apiUrl !== undefined) {
    envUpdates.set('AI_API_URL', updates.apiUrl);
    process.env.AI_API_URL = updates.apiUrl;
  }

  if (updates.apiKey !== undefined) {
    const config = readAIConfig();
    const targetProvider = updates.provider || config.provider;
    if (targetProvider === 'openrouter') {
      envUpdates.set('OPENROUTER_API_KEY', updates.apiKey);
      process.env.OPENROUTER_API_KEY = updates.apiKey;
    } else {
      envUpdates.set('AI_API_KEY', updates.apiKey);
      process.env.AI_API_KEY = updates.apiKey;
    }
  }

  if (updates.model !== undefined) {
    envUpdates.set('AI_MODEL', updates.model);
    process.env.AI_MODEL = updates.model;
  }

  if (updates.useRealAI !== undefined) {
    const val = updates.useRealAI ? 'true' : 'false';
    envUpdates.set('USE_REAL_AI', val);
    process.env.USE_REAL_AI = val;
  }

  // ── Multi-provider fields ──

  if (updates.activeProvider !== undefined) {
    envUpdates.set('AI_ACTIVE_PROVIDER', updates.activeProvider);
    process.env.AI_ACTIVE_PROVIDER = updates.activeProvider;
  }

  if (updates.fallbackChain !== undefined) {
    const val = updates.fallbackChain.filter(id => id !== 'mock').join(',');
    envUpdates.set('AI_FALLBACK_CHAIN', val);
    process.env.AI_FALLBACK_CHAIN = val;
  }

  if (updates.opencode?.apiKey !== undefined) {
    envUpdates.set('OPENCODE_API_KEY', updates.opencode.apiKey);
    process.env.OPENCODE_API_KEY = updates.opencode.apiKey;
  }
  if (updates.opencode?.model !== undefined) {
    envUpdates.set('OPENCODE_MODEL', updates.opencode.model);
    process.env.OPENCODE_MODEL = updates.opencode.model;
  }

  if (updates.anthropic?.apiKey !== undefined) {
    envUpdates.set('ANTHROPIC_API_KEY', updates.anthropic.apiKey);
    process.env.ANTHROPIC_API_KEY = updates.anthropic.apiKey;
  }
  if (updates.anthropic?.model !== undefined) {
    envUpdates.set('ANTHROPIC_MODEL', updates.anthropic.model);
    process.env.ANTHROPIC_MODEL = updates.anthropic.model;
  }

  if (updates.openaiCompat?.baseUrl !== undefined) {
    envUpdates.set('OPENAI_COMPAT_BASE_URL', updates.openaiCompat.baseUrl);
    process.env.OPENAI_COMPAT_BASE_URL = updates.openaiCompat.baseUrl;
  }
  if (updates.openaiCompat?.apiKey !== undefined) {
    envUpdates.set('OPENAI_COMPAT_API_KEY', updates.openaiCompat.apiKey);
    process.env.OPENAI_COMPAT_API_KEY = updates.openaiCompat.apiKey;
  }
  if (updates.openaiCompat?.model !== undefined) {
    envUpdates.set('OPENAI_COMPAT_MODEL', updates.openaiCompat.model);
    process.env.OPENAI_COMPAT_MODEL = updates.openaiCompat.model;
  }

  const newContent = serializeEnv(content, envUpdates);
  writeFileSync(ENV_PATH, newContent, 'utf-8');

  return readAIConfig();
}

/** Mask API key for display (show last 4 chars) */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return key ? '****' : '';
  return '****' + key.slice(-4);
}
