/**
 * AI Provider seam — shared types.
 *
 * P1 milestone 1 (docs/ai-provider-spec.md): every adapter implements AIProvider.
 * The orchestrator (realAIService.ts) routes through this interface; mock mode
 * stays outside the interface (USE_REAL_AI=false answers before any provider runs).
 */

export type AIProviderId = 'opencode' | 'anthropic' | 'openai-compat' | 'mock';

export interface ProviderModel {
  id: string;
  name?: string;
  contextWindow?: number;
  /** true when the provider lists the model at $0 (e.g. opencode Zen free tier) */
  free?: boolean;
}

/** Normalized completion input. Adapters translate to their wire format. */
export interface CompletionRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  content: string;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Shared contract for all live providers.
 * - `complete` resolves with the full text or throws AIProviderError.
 * - `stream` emits incremental deltas via onChunk and resolves with the full text.
 */
export interface AIProvider {
  readonly id: AIProviderId;
  listModels(): Promise<ProviderModel[]>;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  stream(req: CompletionRequest, onChunk: (text: string) => void): Promise<string>;
  healthCheck(): Promise<ProviderHealth>;
}

/** Config for any OpenAI Chat Completions compatible endpoint (z.ai, OpenRouter, opencode Zen, self-hosted). */
export interface OpenAICompatConfig {
  /** Full chat-completions endpoint, e.g. https://api.z.ai/api/coding/paas/v4/chat/completions */
  baseUrl: string;
  apiKey: string;
  model: string;
}
