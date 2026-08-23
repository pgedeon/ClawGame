# ClawGame CEO Directive — Standing Orders for OpenClaw Development

**Issued:** 2026-08-23 by the project CEO (acting on behalf of the owner).
**Applies to:** every openclaw work session on this repository.
**Precedence:** if any older doc (TASK.md, IMPROVEMENT-PLAN.md, improvement-request.md, clawgame.project.json) contradicts this file, THIS FILE WINS.

---

## 1. Product thesis (do not drift from this)

ClawGame is an **AI-first browser game editor**: a non-coder describes or edits a 2D game visually, AI makes precise changes on request, and the result runs in the built-in engine and exports to clean standalone Phaser 4 code. The moat is **trust and control**: deterministic AI edits with preview + rollback, bring-your-own API key, self-hostable, no vendor lock-in.

Every feature must serve one of three jobs:
1. **Make the game actually run well** — the built-in engine/preview must execute what the editor shows. A feature that looks right in the editor but doesn't play correctly is broken.
2. **Make AI editing safe and useful** — every AI action goes through the same command → plan → diff → preview → apply → undo pipeline.
3. **Reduce time-to-fun** — a new user should reach a playable, shareable game in minutes.

## 2. Non-negotiable quality gates

Before you declare ANY task done:
- `pnpm install` clean, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` all pass.
- You ran `pnpm dev` and manually exercised the affected flow in the browser (or via Playwright e2e). State in your session report WHAT you clicked/ran and what you saw.
- No regressions in existing e2e tests. If a test breaks because of intentional change, update the test AND say so explicitly.
- Never commit secrets. Never commit `.env`. Never force-push main. Never rewrite published history.
- Commit small and often with clear messages. Push to a feature branch; only merge to main when gates pass.

If gates cannot pass, STOP, write up the blocker in `docs/status/openclaw-status.md`, and end the turn. Do not ship half-working code.

## 3. Work protocol (every session)

Work in fixed one-hour increments. At the start of each session:
1. Read this file and `docs/product/roadmap-2026H2.md`.
2. Read the tail of `docs/status/openclaw-status.md` (last ~100 lines) to know where things stand.
3. Pick the highest-priority item from the roadmap that is not blocked.
4. Do the work per Section 2.
5. Append a dated section to `docs/status/openclaw-status.md`: what you did, gate results (build/type/test/lint pass-fail), manual verification performed, what's next, blockers.
6. Commit + push.

## 4. Current strategic priorities (ranked)

### P0 — Engine integrity: make the built-in engine real
The known state (from TASK.md, confirmed by audit): the Phaser runtime package throws "not mounted"/"not wired"; live game logic lives in a legacy canvas runtime inside `apps/web`; several `packages/engine` systems are unwired dead code.
- Goal: the scene editor's Play button runs the game through `packages/engine` compiled scenes via the Phaser runtime — one pipeline, editor and export identical.
- Finish or correctly scope the TASK.md cleanup: delete dead systems ONLY after confirming nothing references them (`grep` first), keep tests green.
- Add engine integration tests: load each shipped template scene, tick N frames, assert entity spawn/update/destroy invariants.
- Definition of done: template games (Platformer, Top-Down, Dialogue) all playable in preview AND correct after HTML export.

### P1 — Multi-provider AI layer
Current: OpenRouter + z.ai only (OpenAI-compatible chat completions), plus mock mode. Target architecture in `docs/ai-provider-spec.md`. Summary:
- Provider adapters behind one interface: `opencode` (free tier default), Anthropic Messages API (user key), OpenAI-compatible custom base URL (user key, covers ChatGPT/OpenRouter/z.ai/local).
- BYOK stored server-side per config as today; UI in Settings; "test connection" button per provider.
- All existing AI features (command, streaming, history) must work identically across providers. Fallback chain: primary → secondary → mock mode, never hard-fail the editor.

### P2 — Time-to-fun & UX polish
Templates that actually demonstrate engine+AI working end-to-end; onboarding that gets a user to "play my game" fast; publish/share path.

### P3 — Growth features (only after P0–P2 stable)
Community templates, asset marketplace hooks, multiplayer hooks. Don't start these without CEO sign-off in the status thread.

## 5. Explicitly out of scope

- Rewriting the frontend framework (no React replacement).
- Switching build tooling or package manager.
- Cloud/multi-tenant hosting features.
- Any change that stores user API keys client-side in localStorage.
