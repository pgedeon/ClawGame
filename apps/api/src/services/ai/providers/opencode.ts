/**
 * OpenCode Zen provider — ClawGame's zero-config default.
 *
 * Built on OpenAICompatProvider per docs/ai-provider-spec.md appendix:
 * Zen is multi-protocol and every currently-free model is served on the
 * OpenAI-compatible `/chat/completions` path, so the wire format is
 * byte-identical to what OpenAICompatProvider already speaks.
 *
 * Gateway root: https://opencode.ai/zen/v1
 *   POST {root}/chat/completions  Bearer <key>   (complete/stream/health)
 *   GET  {root}/models            Bearer <key>   (full catalog metadata)
 *
 * Auth: key from https://opencode.ai/auth, sent as `Authorization: Bearer`.
 * Rate limits: UNCONFIRMED in docs — standard HTTP 429 semantics assumed,
 * routed through the shared rate_limited classification.
 */

import { AIProviderError } from '../../ai-types';
import type { AIProviderId, ProviderModel } from '../types';
import {
  OpenAICompatProvider,
  createResponseError,
  normalizeError,
  safeJsonParse,
} from './openai-compat';
import type { FetchLike } from './openai-compat';

export const OPENCODE_GATEWAY_ROOT = 'https://opencode.ai/zen/v1';
export const OPENCODE_CHAT_COMPLETIONS_URL = `${OPENCODE_GATEWAY_ROOT}/chat/completions`;
export const OPENCODE_MODELS_URL = `${OPENCODE_GATEWAY_ROOT}/models`;

/**
 * Free-tier model IDs recorded in the research appendix (2026-08-23).
 * All free tiers are limited-time — the live catalog (`listModels`) is the
 * source of truth at activation time; this list only marks `free: true`
 * on catalog entries and seeds the last-resort default below.
 */
export const OPENCODE_FREE_MODEL_IDS = [
  'big-pickle',
  'x-preview-f-free',
  'mimo-v2.5-free',
  'hy3-free',
  'nemotron-3-ultra-free',
  'nemotron-3.5-lightning-free',
] as const;

/** Last-resort default when no catalog is reachable and none configured. */
export const OPENCODE_DEFAULT_MODEL = 'big-pickle';

export interface OpenCodeConfig {
  apiKey: string;
  model?: string;
}

export class OpenCodeProvider extends OpenAICompatProvider {
  readonly id: AIProviderId = 'opencode';

  private readonly modelsUrl: string;
  private readonly zenFetcher: FetchLike;

  constructor(
    config: OpenCodeConfig,
    logger?: { info: (o: any, m: string) => void; warn: (o: any, m: string) => void },
    fetcher: FetchLike = fetch,
  ) {
    super(
      {
        baseUrl: OPENCODE_CHAT_COMPLETIONS_URL,
        apiKey: config.apiKey,
        model: config.model || OPENCODE_DEFAULT_MODEL,
      },
      logger,
      fetcher,
    );
    this.modelsUrl = OPENCODE_MODELS_URL;
    this.zenFetcher = fetcher;
  }

  /** Zen gateway root (exposed for diagnostics/tests). */
  get gatewayRoot(): string {
    return OPENCODE_GATEWAY_ROOT;
  }

  /**
   * Live catalog from GET /zen/v1/models. Tolerates both an OpenAI-style
   * `{ data: [...] }` envelope and a bare JSON array. Entries are marked
   * free via known free IDs, a `-free` id suffix, or zero input+output pricing.
   */
  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await this.zenFetcher(this.modelsUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });
      if (!response.ok) {
        throw await createResponseError(response);
      }
      const parsed = safeJsonParse(await response.text());
      const entries: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];
      if (entries.length === 0) {
        throw new AIProviderError({
          kind: 'bad_response',
          message: 'Malformed opencode catalog response: no model entries.',
          retriable: false,
        });
      }
      return entries.map(entry => ({
        id: String(entry.id ?? entry.model ?? entry.name),
        name: entry.name && entry.name !== entry.id ? String(entry.name) : undefined,
        contextWindow: typeof entry.context_length === 'number'
          ? entry.context_length
          : (typeof entry.context_window === 'number' ? entry.context_window : undefined),
        free: isOpenCodeFreeModel(String(entry.id ?? entry.model ?? entry.name), entry.pricing),
      }));
    } catch (err) {
      throw normalizeError(err);
    }
  }
}

/** Free-tier detection for catalog entries (appendix list, -free suffix, or $0 pricing). */
export function isOpenCodeFreeModel(modelId: string, pricing?: any): boolean {
  if ((OPENCODE_FREE_MODEL_IDS as readonly string[]).includes(modelId)) return true;
  if (modelId.endsWith('-free')) return true;
  if (pricing && typeof pricing === 'object') {
    const input = Number(pricing.prompt ?? pricing.input);
    const output = Number(pricing.completion ?? pricing.output);
    if (Number.isFinite(input) && Number.isFinite(output)) return input === 0 && output === 0;
  }
  return false;
}
