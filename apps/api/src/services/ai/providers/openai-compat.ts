/**
 * OpenAI Chat Completions compatible provider.
 *
 * Covers z.ai, OpenRouter, opencode Zen (/v1/chat/completions), and any
 * custom base URL — they share the same wire format:
 *   POST {baseUrl}  {model, messages[], temperature?, max_tokens?, stream?}
 *   → {choices[0].message.content}  |  SSE data: {choices[0].delta.content}
 *
 * Extracted verbatim from realAIService.ts (P1 milestone 1): wire format and
 * behavior byte-identical to the previous inline implementation.
 */

import {
  AIProviderError,
} from '../../ai-types';
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
  OpenAICompatConfig,
  ProviderHealth,
  ProviderModel,
} from '../types';

const REQUEST_TIMEOUT_MS = 30_000;
const STREAM_IDLE_TIMEOUT_MS = 20_000;
const STREAM_MAX_DURATION_MS = 90_000;

export class OpenAICompatProvider implements AIProvider {
  readonly id = 'openai-compat' as const;

  constructor(
    private config: OpenAICompatConfig,
    private logger?: { info: (o: any, m: string) => void; warn: (o: any, m: string) => void },
  ) {}

  /** Full chat-completions endpoint this provider calls (exposed for health/diagnostics). */
  get endpoint(): string {
    return this.config.baseUrl;
  }

  async listModels(): Promise<ProviderModel[]> {
    // No universal /models contract across OpenAI-compatible backends;
    // the orchestrator surfaces the configured model until per-provider
    // catalog endpoints are wired (opencode Zen exposes GET /zen/v1/models).
    return [{ id: this.config.model }];
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      this.logger?.info({ model: this.config.model }, 'AI API call starting');

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }

      const data = await response.json() as any;
      assertCompletionPayload(data, response);
      this.logger?.info({ chars: data.choices[0].message.content.length }, 'AI API call succeeded');
      return { content: data.choices[0].message.content };
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

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
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
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk(delta);
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
        const response = await fetch(this.config.baseUrl, {
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
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
      'X-Title': 'ClawGame AI-Powered Game Engine',
    };
  }
}

// ── Wire-format helpers (moved from realAIService.ts, behavior identical) ──

export function assertCompletionPayload(data: any, response?: Response): void {
  const providerMessage = extractProviderMessage(data);
  const providerCode = extractProviderCode(data);
  if (
    (response !== undefined && response.status === 429)
    || providerCode === '1302'
    || isRateLimitText(providerMessage)
  ) {
    throw new AIProviderError({
      kind: 'rate_limited',
      message: providerMessage || 'z.ai is currently rate limiting requests.',
      statusCode: response?.status || 429,
      providerCode,
      retryAfterSeconds: response ? parseRetryAfter(response.headers.get('retry-after')) : undefined,
      retriable: false,
    });
  }

  if (!data.choices?.[0]?.message?.content) {
    throw new AIProviderError({
      kind: 'bad_response',
      message: 'Malformed AI response: missing choices[0].message.content.',
      retriable: false,
    });
  }
}

export async function createResponseError(response: Response): Promise<AIProviderError> {
  const rawBody = await response.text().catch(() => '');
  const parsedBody = safeJsonParse(rawBody);
  const providerCode = extractProviderCode(parsedBody) || extractProviderCode(rawBody);
  const providerMessage = extractProviderMessage(parsedBody) || rawBody.slice(0, 300) || `API returned ${response.status}`;
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'));
  const isRateLimited = response.status === 429 || providerCode === '1302' || isRateLimitText(providerMessage);

  return new AIProviderError({
    kind: isRateLimited ? 'rate_limited' : (response.status >= 500 ? 'http_error' : 'bad_response'),
    message: providerMessage,
    statusCode: response.status,
    providerCode,
    retryAfterSeconds,
    retriable: response.status >= 500 && response.status < 600,
  });
}

export function normalizeError(error: unknown): unknown {
  if (error instanceof AIProviderError) return error;

  if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError') {
    return new AIProviderError({
      kind: 'timeout',
      message: 'Live AI timed out before returning a response.',
      retriable: false,
    });
  }

  return error;
}

export function safeJsonParse(value: string): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractProviderCode(value: any): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    const match = value.match(/\b1302\b/);
    return match ? match[0] : undefined;
  }

  const candidates = [
    value.code,
    value.error?.code,
    value.error_code,
    value.error?.error_code,
  ];
  const found = candidates.find(candidate => candidate !== undefined && candidate !== null);
  return found !== undefined && found !== null ? String(found) : undefined;
}

export function extractProviderMessage(value: any): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') return value;

  return value.error?.message || value.message || value.error?.details;
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const retryAfterSeconds = Number(value);
  return Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined;
}

export function isRateLimitText(message?: string): boolean {
  if (!message) return false;

  const normalized = message.toLowerCase();
  return normalized.includes('rate limit')
    || normalized.includes('too many requests')
    || normalized.includes('frequency')
    || normalized.includes('访问频率');
}
