/**
 * Provider registry — id → adapter construction + configured/availability checks.
 *
 * Minimal seam for P1 milestone 2: the orchestrator and the /api/ai routes both
 * resolve adapters through here so .env write-through settings apply without a
 * restart. The native Anthropic adapter is a later milestone; `anthropic` is
 * listed but not constructible yet.
 */

import { readAIConfig } from '../../utils/envConfig';
import type { AIConfig } from '../../utils/envConfig';
import type { AIProvider, AIProviderId } from './types';
import { OpenAICompatProvider } from './providers/openai-compat';
import { OpenCodeProvider } from './providers/opencode';

export const ALL_PROVIDER_IDS: AIProviderId[] = ['opencode', 'anthropic', 'openai-compat', 'mock'];

/** True when the provider has everything it needs to attempt live calls. */
export function isProviderConfigured(id: AIProviderId, config: AIConfig = readAIConfig()): boolean {
  switch (id) {
    case 'opencode':
      return Boolean(config.opencode.apiKey);
    case 'anthropic':
      return Boolean(config.anthropic.apiKey); // key stored now; adapter lands later
    case 'openai-compat':
      return Boolean(config.openaiCompat.apiKey);
    case 'mock':
      return true;
  }
}

/**
 * Construct the adapter for an id. Returns null for 'mock' (handled before the
 * provider seam), for unconfigured providers, and for 'anthropic' until its
 * native adapter exists. Throws only on unknown ids (caller validation bug).
 */
export function createProvider(
  id: AIProviderId,
  logger?: { info: (o: any, m: string) => void; warn: (o: any, m: string) => void },
  config: AIConfig = readAIConfig(),
): AIProvider | null {
  if (!isProviderConfigured(id, config)) return null;
  switch (id) {
    case 'opencode':
      return new OpenCodeProvider(
        { apiKey: config.opencode.apiKey, model: config.opencode.model || undefined },
        logger,
      );
    case 'anthropic':
      return null; // native Messages adapter = later milestone (docs/ai-provider-spec.md)
    case 'openai-compat':
      return new OpenAICompatProvider(
        {
          baseUrl: config.openaiCompat.baseUrl,
          apiKey: config.openaiCompat.apiKey,
          model: config.openaiCompat.model,
        },
        logger,
      );
    case 'mock':
      return null;
  }
}

/** Ordered live chain: active provider first, then fallbackChain entries that are configured. */
export function resolveProviderChain(config: AIConfig = readAIConfig()): AIProviderId[] {
  const chain: AIProviderId[] = [];
  if (config.activeProvider !== 'mock') chain.push(config.activeProvider);
  for (const id of config.fallbackChain) {
    if (id !== 'mock' && !chain.includes(id)) chain.push(id);
  }
  return chain.filter(id => isProviderConfigured(id, config));
}
