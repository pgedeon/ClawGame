/**
 * Native Anthropic Messages API provider.
 *
 * NOT built on OpenAICompatProvider — the Messages wire format differs
 * fundamentally (docs/ai-provider-spec.md §Wire formats):
 *   POST {base}/v1/messages   {model, system (top-level), messages[], temperature?, max_tokens?, stream?}
 *   → {content: [{type:'text', text}]}  |  SSE `content_block_delta` events
 *
 * Auth: `x-api-key` header + `anthropic-version` (no Bearer).
 * Errors reuse the shared classification helpers: Anthropic error bodies are
 * `{type:'error', error:{type, message}}`, which extractProviderMessage digs
 * into; HTTP 429 maps to rate_limited, 4xx to non-retriable bad_response,
 * 5xx/529 (overloaded_error) to retriable http_error.
 */

import { AIProviderError } from '../../ai-types';
import { ANTHROPIC_DEFAULT_MODEL } from '../../../utils/envConfig';
import type {
  AIProvider,
  AIProviderId,
  CompletionRequest,
  CompletionResponse,
  ProviderHealth,
  ProviderModel,
} from '../types';
import {
  createResponseError,
  normalizeError,
  safeJsonParse,
} from './openai-compat';
import type { FetchLike } from './openai-compat';

export const ANTHROPIC_API_ROOT = 'https://api.anthropic.com';
export const ANTHROPIC_MESSAGES_URL = `${ANTHROPIC_API_ROOT}/v1/messages`;
export const ANTHROPIC_MODELS_URL = `${ANTHROPIC_API_ROOT}/v1/models`;

/** Pin of the long-stable Messages API version (per docs/ai-provider-spec.md). */
export const ANTHROPIC_VERSION = '2023-06-01';

const REQUEST_TIMEOUT_MS = 30_000;
const STREAM_IDLE_TIMEOUT_MS = 20_000;
const STREAM_MAX_DURATION_MS = 90_000;

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  /** API root without trailing slash; override for gateways/proxies. */
  baseUrl?: string;
}

export class AnthropicProvider implements AIProvider {
  readonly id: AIProviderId = 'anthropic';

  private config: AnthropicConfig;

  private readonly messagesUrl: string;
  private readonly modelsUrl: string;

  constructor(
    config: AnthropicConfig,
    private logger?: { info: (o: any, m: string) => void; warn: (o: any, m: string) => void },
    private fetcher: FetchLike = fetch,
  ) {
    // Last-resort default mirrors OpenCodeProvider so a bare { apiKey } works.
    this.config = { ...config, model: config.model || ANTHROPIC_DEFAULT_MODEL };
    const root = (config.baseUrl || ANTHROPIC_API_ROOT).replace(/\/+$/, '');
    this.messagesUrl = `${root}/v1/messages`;
    this.modelsUrl = `${root}/v1/models`;
  }

  /** Full messages endpoint this provider calls (exposed for health/diagnostics). */
  get endpoint(): string {
    return this.messagesUrl;
  }

  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await this.fetcher(this.modelsUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
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
          message: 'Malformed Anthropic catalog response: no model entries.',
          retriable: false,
        });
      }
      return entries.map(entry => ({
        id: String(entry.id ?? entry.name),
        name: entry.display_name && entry.display_name !== entry.id ? String(entry.display_name) : undefined,
        contextWindow: typeof entry.context_window === 'number' ? entry.context_window : undefined,
      }));
    } catch (err) {
      throw normalizeError(err);
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      this.logger?.info({ model: this.config.model }, 'AI API call starting');

      const response = await this.fetcher(this.messagesUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          system: req.system,
          messages: [{ role: 'user', content: req.user }],
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }

      const data = await response.json() as any;
      assertMessagesPayload(data);
      const content = extractTextContent(data.content);
      this.logger?.info({ chars: content.length }, 'AI API call succeeded');
      return { content };
    } catch (err) {
      throw normalizeError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  async stream(req: CompletionRequest, onChunk: (text: string) => void): Promise<string> {
    const controller = new AbortController();
    let timeoutReason: string = 'idle';
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        timeoutReason = 'idle';
        controller.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };
    const maxTimer = setTimeout(() => {
      timeoutReason = 'max';
      controller.abort();
    }, STREAM_MAX_DURATION_MS);

    try {
      resetIdleTimer();

      const response = await this.fetcher(this.messagesUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          system: req.system,
          messages: [{ role: 'user', content: req.user }],
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 4096,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIProviderError({
          kind: 'bad_response',
          message: 'AI provider did not return a readable stream.',
          retriable: false,
        });
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetIdleTimer();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            // Only text deltas carry user-visible content; thinking/ping/
            // block lifecycle events are intentionally ignored.
            if (parsed?.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta.text) {
              fullText += parsed.delta.text;
              onChunk(parsed.delta.text);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      return fullText;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError({
          kind: 'timeout',
          message: timeoutReason === 'max'
            ? 'Live AI response took too long to complete.'
            : 'Live AI response stalled before completing.',
          retriable: false,
        });
      }
      throw err;
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
      clearTimeout(maxTimer);
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await this.fetcher(this.messagesUrl, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify({
            model: this.config.model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}` };
        }
        return { ok: true, latencyMs: Date.now() - start };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs: Date.now() - start, error: message };
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    };
  }
}

// ── Wire-format helpers ──

/** Messages responses must carry at least one text content block. */
export function assertMessagesPayload(data: any): void {
  const hasTextBlock = Array.isArray(data?.content)
    && data.content.some((block: any) => block?.type === 'text' && typeof block.text === 'string');
  if (!hasTextBlock) {
    throw new AIProviderError({
      kind: 'bad_response',
      message: 'Malformed AI response: missing text content block.',
      retriable: false,
    });
  }
}

/** Join all text blocks (thinking/tool_use blocks are excluded upstream). */
export function extractTextContent(content: any[]): string {
  return content
    .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
    .map((block: any) => block.text)
    .join('');
}
