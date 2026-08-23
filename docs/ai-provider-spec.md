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

---

## Appendix: opencode research (P1 milestone 1, 2026-08-23)

Sources: https://opencode.ai/docs/zen/ (official docs, fetched 2026-08-23), https://opencode.ai/zen (landing). Note: "opencode" is two things — the open-source terminal coding agent (`sst/opencode`) and **OpenCode Zen**, the team's hosted AI gateway. ClawGame's zero-config target is **Zen**, specifically its free-tier models.

### Base URLs & endpoints

Gateway root: `https://opencode.ai/zen/v1`

Zen is **multi-protocol** — the URL path selects the wire protocol (official endpoint table maps each model to an AI SDK package):

| Path | Protocol | Official SDK mapping |
|---|---|---|
| `/v1/chat/completions` | OpenAI Chat Completions compatible | `@ai-sdk/openai-compatible` |
| `/v1/messages` | Anthropic Messages compatible | `@ai-sdk/anthropic` |
| `/v1/responses` | OpenAI Responses API | `@ai-sdk/openai` |
| `/v1/models/{model}` | Google Generative Language style | `@ai-sdk/google` |
| `GET /v1/models` | full model catalog metadata | — |

**Adapter decision: build the default `opencode` provider on our `openai-compat` adapter** — `POST https://opencode.ai/zen/v1/chat/completions`, Bearer key, SSE `choices[0].delta.content`. Every currently-free model is served on the chat/completions path, and this is byte-for-byte the wire format our existing z.ai/OpenRouter path already speaks. Claude-family models remain reachable later via the Anthropic-compatible `/v1/messages`, matching our planned native `anthropic` adapter.

### Auth

API key issued at https://opencode.ai/auth (sign in → billing → copy key). Sent as `Authorization: Bearer <key>` — inferred from the official `@ai-sdk/openai-compatible` mapping (that SDK always emits Bearer). **UNCONFIRMED:** no official curl example publishes the header explicitly.

### Models

Catalog: `GET https://opencode.ai/zen/v1/models` (official).

Free models ($0 input/output/cached): `big-pickle`, `x-preview-f-free` (Ox Alpha Free), `mimo-v2.5-free`, `hy3-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free` — all on `/chat/completions`; plus `muse-spark-1.2-contributor-free` on `/responses`. All free tiers are **limited-time** and can end without notice. Default first-run model should be picked from `/v1/models` at activation time, not hardcoded.

### Request/response schemas

- `/chat/completions`: standard OpenAI schema — `{model, messages[], temperature?, max_tokens?, stream?}` → `{choices[0].message.content}`; streaming = SSE `data:` lines carrying `choices[0].delta.content`, terminated by `data: [DONE]`.
- `/messages`: standard Anthropic Messages schema — top-level `system`, content blocks, SSE `content_block_delta`.

### Rate limits

**UNCONFIRMED** — no published numbers. Expect standard HTTP 429 semantics; route through existing `rate_limited` handling.

### Pricing / license / usage terms

- Pay-as-you-go credits, optional auto-reload, workspace monthly spend caps; teams beta currently free.
- Privacy: US-hosted; providers generally zero-retention / no training. Exceptions: Big Pickle, MiMo-V2.5 Free, Hy3 Free may train on submitted data during their free period; Nemotron free endpoints run under NVIDIA trial terms (logged, no confidential data); Muse Spark Contributor Free trades steep discount for training rights; OpenAI/Anthropic upstream retain requests 30 days.
- Product implication: Settings copy must surface the free-model training caveat before users send project code through a free stealth model.

### Confidence summary

Confirmed via official docs: base URL, multi-protocol paths, model IDs, free-tier existence, pricing, privacy terms, `/v1/models` catalog. UNCONFIRMED: exact auth header example, rate-limit numbers, long-term availability of any specific free model ID.
