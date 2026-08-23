# ClawGame Roadmap 2026 H2

Owner of execution: openclaw (per `docs/ceo-directive.md` protocol).
Update this file: mark items `[x]` when done AND verified, add discovered sub-items under the right priority. Never reorder priorities without CEO sign-off via status thread.

> **Retro 2026-08-23** (branch `plan/roadmap-retro-1`, session-8): checkboxes audited against `docs/status/openclaw-status.md` sessions 1–7 and git history through origin/main `e740925`. Dated annotations cite commit evidence. New "CEO decision requested" section at bottom.

## P0 — Engine integrity (make the built-in engine real)

- [x] **Audit pass:** produce `docs/engine-audit.md`: for every file in `packages/engine/src/systems` and `packages/phaser-runtime/src`, verdict = WIRED / DEAD / PARTIAL, with evidence (who imports it). No deletions yet. *(Done 2026-08-23, derived independently twice — sessions 1–2; commits `d78e533`, `66675dc`.)*
- [x] Delete dead systems identified by TASK.md + audit, tests green after each deletion batch. *(Sessions 3–4: `1f14d00`, `ffc3c16`, `a365823`, `c289cae`, `e07bb1b`, plus CEO-approved DamageSystem `81c6e9e`; net −1,795 L, suite green per batch. Engine core eight stay deferred pending the pipeline decision — see CEO section.)*
- [ ] Wire scene-compiler output → phaser-runtime → live preview as ONE pipeline used by both Play button and HTML export. *(STALE FRAMING, retro 2026-08-23: convergence took the normalize-and-share route instead — export now normalizes through the shared preview normalizer (`2d7892b`). Remaining user-visible parity work is body semantics + physics/world config; full compiler→runtime unification proposed for re-scope, see CEO section.)*
- [x] Engine integration test: for each template scene (Platformer, Top-Down, Dialogue): load → tick 120 frames → assert spawn/update/destroy invariants. *(Session-5: headless `Engine.tick()` `71c6c44`, harness + 20 tests `9b7d66d`, canonical template scenes `a9056b8`; findings documented as assertions, not patched.)*
- [ ] Play-in-preview parity: what plays in preview must play identically after export. Add e2e that exports a template and smoke-runs the exported HTML headlessly. *(Step 1 done 2026-08-23: probe matrix + pinned smoke guard `fd6db71`; gaps 1+2 closed on `feat/export-convergence-1` — assets embedded/loaded `49c9e00`, export normalization `2d7892b`. Remaining: body semantics, physics/world config, texture-key naming sliver, two-export-format disagreement; the headless smoke-run of exported HTML itself is still missing.)*
- [x] Fix or file every item in BUG-REPORT docs; close with verification notes. *(High ×2 fixed + verified 2026-08-23: `5953df5` mount race, `8aa9965` syncPhysicsBody. Medium/Low remain filed with workarounds in `docs/qa/known_issues.md` under standing hygiene.)*

## P1 — Multi-provider AI (see `docs/ai-provider-spec.md`)

- [x] Research opencode free API: exact endpoint, auth, streaming format, rate limits. Record in spec appendix before coding. *(`4867e1c` appendix in `docs/ai-provider-spec.md`; rate limits/auth header marked UNCONFIRMED there.)*
- [x] Extract provider interface; move mock behind same interface. *(`a00ad6b` AIProvider seam + OpenAICompatProvider; mock resolves through the same registry chain per `services/ai/registry.ts`.)*
- [x] Implement `openai-compat` adapter; migrate z.ai + OpenRouter onto it (legacy keys migrate automatically). *(`a00ad6b` adapter; legacy `AI_API_KEY`/`OPENROUTER_API_KEY` migration in envConfig `85c0d9d`; fixture-tested.)*
- [ ] Implement `anthropic` adapter (native Messages API + SSE streaming). *(Not started. Sequenced AFTER Settings UI — BYO-key UI serves more users per hour; see CEO section.)*
- [ ] Implement `opencode` adapter; make it the zero-config default. *(Adapter DONE + fixture-tested `85c0d9d`. "Zero-config default" is UNRESOLVED: Zen gateway requires a per-user Bearer key, so nothing-configured still falls back to mock. Needs CEO decision on default-without-key UX.)*
- [x] Registry + fallback chain + circuit breaker + failover logging. *(`85c0d9d` `services/ai/registry.ts` + `resolveProviderChain` inside existing retry/breaker structure; provider label no longer hardcoded. Follow-ups: per-provider breakers, pre-chunk streaming failover.)*
- [x] API: `/api/ai/providers`, `/api/ai/test`, extended config endpoints (backward compatible). *(`85c0d9d`; existing routes byte-compatible, verified by test suite.)*
- [ ] Frontend Settings → AI Providers UI (cards, masked keys, model dropdown, test connection, active toggle, fallback order). *(Not started; backend routes live since `85c0d9d`. Top open P1 — this is what makes BYO-key real for users.)*
- [ ] Provider badge in AI Command bar + failover toast. *(Not started; small follow-on to the Settings UI lane.)*
- [x] Contract tests from fixtures per adapter; integration tests gated on env keys. *(opencode: 14 fixture + 2 key-gated live; envConfig migration: 10; openai-compat path: 19. Extend per new adapter — standing rule, not a new task.)*

## P2 — Time-to-fun

- [ ] Template audit: each template demonstrates engine + AI end-to-end; fix gaps found by P0 integration tests. *(Gaps identified by session-5 harness, fixes not started: platformer gravity inert on `movement.gravity`, topdown chase-AI inert without `movement` component.)*
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

---

## CEO decision requested — 2026-08-23 (roadmap retro, session-8)

Audit basis: status-log sessions 1–7 + git history through origin/main `e740925`. Four rulings needed before the next build lanes:

1. **Re-scope P0 "one pipeline" to parity-first.** Export convergence already closed the worst gaps by feeding exports through the shared preview normalizer (`2d7892b`); remaining body-semantics + physics-config slices are small and directly serve market takeaway #1 (own-your-output). Recommend: full scene-compiler→runtime unification moves to P2 until genre-gameplay parity matters; P0 slot goes to finishing export parity.
2. **Define "zero-config default" for opencode.** Research showed Zen requires a per-user Bearer key; today nothing-configured falls back to mock. Recommend: guided first-run key entry with mock fallback; do NOT bundle a shared key.
3. **Sequence anthropic adapter AFTER Settings → AI Providers UI.** The UI activates BYO-key (takeaway #3) for every user this week on already-live routes; native anthropic serves only paying-key users later. Recommend: UI first.
4. **Confirm Engine core-eight deletions stay deferred** until ruling #1 lands (audit §4 item 6). Recommend: yes — no deletions inside live wiring paths while parity work touches them.

### Proposed builder lanes — next 48h (ranked by user-visible value/hour; weighted by `docs/market-research-2026-08.md`: export ownership > deterministic edits > BYO-key)

1. **Parity gap 3 — body semantics in export** (~half day): port preview body-kind logic (solid→static, trigger/sensor→sensor, player/enemy/projectile→dynamic, else none) into `exportService`; update pinned smoke baseline same-commit. Exports stop spawning coins/NPCs/signs as unwanted dynamic bodies.
2. **Parity gap 4 — physics/world config passthrough** (~half day): gravity, world bounds, body sizing, Scale.FIT into generated HTML. Exported game finally plays like preview.
3. **Settings → AI Providers UI** (~1 day): cards, masked keys, model dropdown, test connection, active toggle, fallback order on the live `/api/ai/*` routes. Makes BYO-key real.
4. **Export asset sliver** (~2–4 h): unify texture-key naming (`asset:` prefix), add spritesheet/atlas kinds to export. Completes the asset story for projects with real art.
5. **Provider badge + failover toast** (~2–3 h): visible provider health in AI command bar; supports the determinism/trust story (takeaway #2 adjacency).
6. **Exported-HTML headless smoke e2e** (~half day): actually run an exported template's HTML headlessly (the still-missing e2e clause of P0 item 5); regression guard for lanes 1–2.
