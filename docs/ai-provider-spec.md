# ClawGame AI Provider Specification

**Status:** Approved by CEO 2026-08-23. Implementation owned by openclaw.
**Related:** `docs/ceo-directive.md` §4 P1.

## Goals

1. `opencode` free coding API works out of the box — zero-config first run.
2. User can add their own Anthropic API key (native Messages API, not OpenAI-compat shim).
3. User can add any custom OpenAI-compatible endpoint (ChatGPT/OpenRouter/z.ai/Ollama/LM Studio/self-hosted).
4. All existing AI surfaces (command processing, streaming SSE, history, health) work identically regardless of provider.
5. Graceful fallback chain; the editor never hard-fails because a provider is down.

## Architecture

```
apps/api/src/services/ai/
├── types.ts            # AIProvider interface + shared types
├── registry.ts         # provider id → adapter factory, config resolution
├── providers/
│   ├── opencode.ts     # opencode free API adapter (default)
│   ├── anthropic.ts    # native Anthropic Messages API adapter
│   └── openai-compat.ts# any base URL + key + model (covers openrouter/zai/custom)
├── realAIService.ts    # orchestrator: routes via registry, owns fallback chain
└── mockAIService.ts    # moved from services/aiService.ts (unchanged behavior)
```

### Provider interface (draft — refine during implementation)

```ts
interface AIProvider {
  readonly id: 'opencode' | 'anthropic' | 'openai-compat' | 'mock';
  listModels(): Promise<ProviderModel[]>;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  stream(req: CompletionRequest, onChunk: (s: string) => void): Promise<CompletionResponse>;
  healthCheck(): Promise<{ ok: boolean; latencyMs?: number; error?: string }>;
}
```

`CompletionRequest` carries: system prompt (game context + scene JSON schema), user command, optional project context, temperature/max tokens. Adapters translate to wire format:
- **opencode**: per its published API. If opencode exposes an Anthropic-compatible or OpenAI-compatible endpoint, implement on top of the matching adapter and note it here. Research the current official docs FIRST and record findings in this file before coding.
- **anthropic**: `POST {base}/v1/messages`, `x-api-key` + `anthropic-version` headers, `system` top-level field, content blocks response. Streaming = SSE `content_block_delta`.
- **openai-compat**: `POST {baseUrl}/chat/completions`, Bearer auth. Streaming = SSE `choices[0].delta.content`.

### Config & storage

- Extend `apps/api/src/utils/envConfig.ts` `AIConfig`:
  ```ts
  {
    activeProvider: 'opencode' | 'anthropic' | 'openai-compat' | 'mock';
    fallbackChain: ProviderId[];           // ordered; mock is implicit last
    opencode:   { model?: string };
    anthropic:  { apiKey?: string; model?: string };   // default model: claude-sonnet-4-6
    openaiCompat: { baseUrl?: string; apiKey?: string; model?: string };
  }
  ```
- Keep `.env` write-through behavior that exists today so nothing regresses.
- Legacy keys (`zaiApiKey`, `openrouterApiKey`) migrate into `openaiCompat` presets on first load — never lose a working user key.
- `USE_REAL_AI=true|false` remains the master switch; when false, mock mode answers.

### API surface changes (`apps/api/src/routes/aiRoutes.ts`)

- `GET /api/ai/providers` — available providers + which are configured (key present or free tier) + health.
- `GET /api/ai/config` / `PUT /api/ai/config` — extended for the new shape (keep backward compat for old fields).
- `POST /api/ai/test` `{ provider }` — one-shot connectivity test used by Settings UI "Test connection".
- `GET /api/ai/models?provider=` — keep, extend to new adapters.
- Existing `/api/projects/:id/ai/command` unchanged from the client's perspective.

### Frontend (`apps/web`)

- Settings → AI Providers page: provider cards (opencode / Anthropic / custom), key input (write-only, masked readback), model dropdown fed by `/models`, Test Connection button with result, set-active toggle, drag-order fallback chain.
- AI Command bar shows active provider badge; if primary fails over, surface a non-blocking toast ("switched to fallback provider X").
- First-run experience: if no provider configured, prompt once for opencode activation; skip entirely when opencode works with zero input.

## Fallback policy

Order: active provider → remaining configured providers in chain → mock mode. Log every failover (pino) with reason. Circuit breaker per provider (reuse existing breaker logic in realAIService.ts where possible): 3 consecutive failures opens circuit 5 min.

## Quality gates (same as directive §2)

Plus specifically:
- Contract tests against recorded HTTP fixtures for each adapter (no live calls in unit tests).
- One integration test per provider gated behind env var presence (skips when no key).
- Mock mode output byte-identical to today's (snapshot).

## Out of scope

- OAuth flows for provider accounts. API keys only.
- Server-side key sharing between users / multi-tenant.
- Image/SFX generation providers (separate services already exist; leave them).
