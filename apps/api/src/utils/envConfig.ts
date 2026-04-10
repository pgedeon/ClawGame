/**
 * .env file reader/writer for AI configuration.
 * Reads/writes apps/api/.env directly so dashboard can persist settings.
 * Supports separate API keys per provider.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env');

export interface AIConfig {
  provider: 'openrouter' | 'zai';
  apiUrl: string;
  model: string;
  apiKey: string;           // active key for current provider
  openrouterApiKey: string; // stored OpenRouter key (may differ from active)
  zaiApiKey: string;        // stored z.ai key
  useRealAI: boolean;
}

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

/** Read current AI config from .env file */
export function readAIConfig(): AIConfig {
  let content = '';
  try {
    content = readFileSync(ENV_PATH, 'utf-8');
  } catch {
    // .env doesn't exist yet
  }
  const map = parseEnv(content);
  const apiUrl = map.get('AI_API_URL') || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  const provider = detectProvider(apiUrl);
  const zaiKey = map.get('AI_API_KEY') || '';
  const orKey = map.get('OPENROUTER_API_KEY') || '';

  return {
    provider,
    apiUrl,
    model: map.get('AI_MODEL') || 'glm-4.5-flash',
    apiKey: provider === 'openrouter' ? orKey : zaiKey,
    openrouterApiKey: orKey,
    zaiApiKey: zaiKey,
    useRealAI: map.get('USE_REAL_AI') === 'true' || map.get('USE_REAL_AI') === '1',
  };
}

/** Get API key for a specific provider */
export function getApiKeyForProvider(provider: 'openrouter' | 'zai'): string {
  const config = readAIConfig();
  return provider === 'openrouter' ? config.openrouterApiKey : config.zaiApiKey;
}

/** Write AI config updates to .env and process.env */
export function writeAIConfig(updates: Partial<AIConfig>): AIConfig {
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

  const newContent = serializeEnv(content, envUpdates);
  writeFileSync(ENV_PATH, newContent, 'utf-8');

  return readAIConfig();
}

/** Mask API key for display (show last 4 chars) */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return key ? '****' : '';
  return '****' + key.slice(-4);
}
