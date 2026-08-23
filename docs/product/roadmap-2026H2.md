# ClawGame Roadmap 2026 H2

Owner of execution: openclaw (per `docs/ceo-directive.md` protocol).
Update this file: mark items `[x]` when done AND verified, add discovered sub-items under the right priority. Never reorder priorities without CEO sign-off via status thread.

## P0 — Engine integrity (make the built-in engine real)

- [ ] **Audit pass:** produce `docs/engine-audit.md`: for every file in `packages/engine/src/systems` and `packages/phaser-runtime/src`, verdict = WIRED / DEAD / PARTIAL, with evidence (who imports it). No deletions yet.
- [ ] Delete dead systems identified by TASK.md + audit, tests green after each deletion batch.
- [ ] Wire scene-compiler output → phaser-runtime → live preview as ONE pipeline used by both Play button and HTML export.
- [ ] Engine integration test: for each template scene (Platformer, Top-Down, Dialogue): load → tick 120 frames → assert spawn/update/destroy invariants.
- [ ] Play-in-preview parity: what plays in preview must play identically after export. Add e2e that exports a template and smoke-runs the exported HTML headlessly.
- [ ] Fix or file every item in BUG-REPORT docs; close with verification notes.

## P1 — Multi-provider AI (see `docs/ai-provider-spec.md`)

- [ ] Research opencode free API: exact endpoint, auth, streaming format, rate limits. Record in spec appendix before coding.
- [ ] Extract provider interface; move mock behind same interface.
- [ ] Implement `openai-compat` adapter; migrate z.ai + OpenRouter onto it (legacy keys migrate automatically).
- [ ] Implement `anthropic` adapter (native Messages API + SSE streaming).
- [ ] Implement `opencode` adapter; make it the zero-config default.
- [ ] Registry + fallback chain + circuit breaker + failover logging.
- [ ] API: `/api/ai/providers`, `/api/ai/test`, extended config endpoints (backward compatible).
- [ ] Frontend Settings → AI Providers UI (cards, masked keys, model dropdown, test connection, active toggle, fallback order).
- [ ] Provider badge in AI Command bar + failover toast.
- [ ] Contract tests from fixtures per adapter; integration tests gated on env keys.

## P2 — Time-to-fun

- [ ] Template audit: each template demonstrates engine + AI end-to-end; fix gaps found by P0 integration tests.
- [ ] Onboarding flow: create → first AI edit applied → play, measured in clicks; reduce to minimum.
- [ ] One-click share/publish path (static export hosting or downloadable bundle with clear instructions).

## P3 — Growth (requires CEO sign-off before starting)

- [ ] Community template gallery
- [ ] Asset marketplace hooks
- [ ] Multiplayer exploration

## Standing hygiene (every session)

- Keep `docs/status/openclaw-status.md` appended per session.
- Dependency updates only when a task requires them; never mid-feature.
- Any new bug found: file into `docs/qa/known_issues.md` with repro, even if out of scope.
