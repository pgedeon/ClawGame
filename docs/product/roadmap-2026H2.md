# ClawGame Roadmap 2026 H2

Owner of execution: openclaw (per `docs/ceo-directive.md` protocol).
Update this file: mark items `[x]` when done AND verified, add discovered sub-items under the right priority. Never reorder priorities without CEO sign-off via status thread.

> **Retro 2026-08-23** (branch `plan/roadmap-retro-1`, session-8): checkboxes audited against `docs/status/openclaw-status.md` sessions 1–7 and git history through origin/main `e740925`. Dated annotations cite commit evidence. New "CEO decision requested" section at bottom.
> **Retro 2026-08-24** (branch `plan/roadmap-retro-2`, session-12): checkboxes re-audited against sessions 9–11 and git history through origin/main `318e316`, including unmerged lane state (`feat/onboarding-slice-1b` `efc75e7`, `qa/audit-web-ai` `61c042e`). Updated "CEO decision requested" section at bottom.
> **P2 closing sweep 2026-08-26** (branch `chore/p2-closing-sweep`): P2 checkboxes updated against git history through origin/main `8040866` — activation flow + share/publish program shipped this week; evidence cited per item. Only open P2 work: counters readout. Scene-compiler unification stays PARKED per ruling, not an active lane.

## P0 — Engine integrity (make the built-in engine real)

- [x] **Audit pass:** produce `docs/engine-audit.md`: for every file in `packages/engine/src/systems` and `packages/phaser-runtime/src`, verdict = WIRED / DEAD / PARTIAL, with evidence (who imports it). No deletions yet. *(Done 2026-08-23, derived independently twice — sessions 1–2; commits `d78e533`, `66675dc`.)*
- [x] Delete dead systems identified by TASK.md + audit, tests green after each deletion batch. *(Sessions 3–4: `1f14d00`, `ffc3c16`, `a365823`, `c289cae`, `e07bb1b`, plus CEO-approved DamageSystem `81c6e9e`; net −1,795 L, suite green per batch. Engine core eight stay deferred pending the pipeline decision — see CEO section.)*
- [x] ~~Wire scene-compiler output → phaser-runtime → live preview as ONE pipeline used by both Play button and HTML export.~~ *(CLOSED BY RE-SCOPE, CEO ruling 2026-08-23 #1: parity-first replaces literal single-pipeline in P0; full compiler→runtime unification moved to P2 — see P2 list. Parity-first completion verified 2026-08-24: `docs/export-parity.md` matrix all Closed, **Open gaps: 0** for phaser-html (`1c32331`; convergence units `baf6a78`, `783054c`, `0d96999`). Residual real-runtime verification tracked in item 5.)*
- [x] Engine integration test: for each template scene (Platformer, Top-Down, Dialogue): load → tick 120 frames → assert spawn/update/destroy invariants. *(Session-5: headless `Engine.tick()` `71c6c44`, harness + 20 tests `9b7d66d`, canonical template scenes `a9056b8`; findings documented as assertions, not patched.)*
- [ ] Play-in-preview parity: what plays in preview must play identically after export. Add e2e that exports a template and smoke-runs the exported HTML headlessly. *(Parity work COMPLETE 2026-08-24: gaps 3+4 closed `baf6a78`/`783054c`, asset sliver + entity representation closed `0d96999`/`1c32331` — `docs/export-parity.md` Open gaps: 0 for phaser-html. TWO residuals block formal P0 closure: (a) the headless smoke-run of exported HTML itself is still missing — all parity claims rest on generated-code string assertions, never a real browser run; (b) two-export-format disagreement — legacy canvas `format:'html'` remains the ExportPage default (`ExportPage.tsx:74`) despite being documented deprecated. CEO decision requested 2026-08-24 #1/#2.)*
- [x] Fix or file every item in BUG-REPORT docs; close with verification notes. *(High ×2 fixed + verified 2026-08-23: `5953df5` mount race, `8aa9965` syncPhysicsBody. Medium/Low remain filed with workarounds in `docs/qa/known_issues.md` under standing hygiene.)*

## P1 — Multi-provider AI (see `docs/ai-provider-spec.md`)

- [x] Research opencode free API: exact endpoint, auth, streaming format, rate limits. Record in spec appendix before coding. *(`4867e1c` appendix in `docs/ai-provider-spec.md`; rate limits/auth header marked UNCONFIRMED there.)*
- [x] Extract provider interface; move mock behind same interface. *(`a00ad6b` AIProvider seam + OpenAICompatProvider; mock resolves through the same registry chain per `services/ai/registry.ts`.)*
- [x] Implement `openai-compat` adapter; migrate z.ai + OpenRouter onto it (legacy keys migrate automatically). *(`a00ad6b` adapter; legacy `AI_API_KEY`/`OPENROUTER_API_KEY` migration in envConfig `85c0d9d`; fixture-tested.)*
- [ ] Implement `anthropic` adapter (native Messages API + SSE streaming). *(Not started. Sequencing precondition from ruling #3 — Settings UI first — is now SATISFIED: UI live on main `de90778`. Retro-2 re-rank: this becomes the top P1 build lane; see CEO decision requested 2026-08-24 #4.)*
- [x] Implement `opencode` adapter; make it the zero-config default. *(`85c0d9d` adapter, fixture-tested. "Zero-config default" defined by CEO ruling #2 and IMPLEMENTED 2026-08-24: guided first-run key entry with mock fallback shipped inside the Settings UI (`de90778`, `AIProvidersPage.FIRST_RUN_DISMISS_KEY`); nothing-configured falls back to mock by design, no shared key bundled.)*
- [x] Registry + fallback chain + circuit breaker + failover logging. *(`85c0d9d` `services/ai/registry.ts` + `resolveProviderChain` inside existing retry/breaker structure; provider label no longer hardcoded. Follow-ups: per-provider breakers, pre-chunk streaming failover.)*
- [x] API: `/api/ai/providers`, `/api/ai/test`, extended config endpoints (backward compatible). *(`85c0d9d`; existing routes byte-compatible, verified by test suite.)*
- [x] Frontend Settings → AI Providers UI (cards, masked keys, model dropdown, test connection, active toggle, fallback order). *(DONE + merged to main 2026-08-24: `de90778` page with provider cards, write-only masked keys, /models-fed dropdowns, test-connection, set-active, fallback chain editor + ruling-#2 first-run key entry; routes `a8f5788`. Follow-ups: env-independent test assertions `61c042e` on `qa/audit-web-ai` awaiting merge; QA acceptance pass still owed.)*
- [ ] Provider badge in AI Command bar + failover toast. *(Not started; last small P1 UI item, follow-on to the now-live Settings UI.)*
- [x] Contract tests from fixtures per adapter; integration tests gated on env keys. *(opencode: 14 fixture + 2 key-gated live; envConfig migration: 10; openai-compat path: 19. Extend per new adapter — standing rule, not a new task.)*

## P2 — Time-to-fun

- [x] Template audit: each template demonstrates engine + AI end-to-end; fix gaps found by P0 integration tests. *(DONE 2026-08-25: session-5 harness gaps fixed `5ba430b` — platformer gravity wired to the physics component, topdown chase enemies drivable; live acceptance walkthrough of all three shipped genres passed in QA merge `038bdc3` (sessions 17–19; residual cosmetic findings filed to `docs/qa/known_issues.md`).)*
- [x] Onboarding flow: create → first AI edit applied → play, measured in clicks; reduce to minimum. *(SHIPPED 2026-08-25/26: design + rulings `826cf69`/`33c38f6`; slice 1b landing page at `/` + shared template launcher + recent-projects index `efc75e7`; slice 2 first-run mock edit card merged `fae5c37`; slice 2d first-run recipe chips with 5/6 harness-verified catalog `ef1e615`, merged `1fa1e96`; QA acceptance pass `038bdc3`.)*
- [x] One-click share/publish path (static export hosting or downloadable bundle with clear instructions). *(SHIPPED 2026-08-26 in three slices, all on main: slice 1 capability-token share links + hosted standalone play `b37705c`, merged `35e27aa`; slice 2 remix import flow — real payload sidecar, `/api/share/:token/remix`, RemixPage auto-import replacing the slice-1 placeholder IN-PLACE (single file, no stale stopgap left; still routed in `App.tsx`) `e942202`, merged `e63e0e4`; slice 3 play/remix counters + `share_created`/`game_remixed` funnel events `8040866`.)*
- [ ] Share/activation counters readout: slice 3 counters + funnel events persist storage-side only (`8040866`) — no readout/reporting surface exists yet. *(Only open P2 item per closing sweep 2026-08-26.)*
- [ ] Full scene-compiler→runtime unification *(PARKED — not an active lane; moved from P0 per CEO ruling 2026-08-23 #1; revisit when genre-gameplay parity matters — td/rpg/shooter/puzzle scene classes start shipping real gameplay.)*
- [x] Export format consolidation: deprecate/remove legacy canvas `format:'html'` generator *(DONE 2026-08-26: ExportPage default flipped to phaser-html `97322aa`; legacy canvas generator deleted `9756983` — phaser-html is the single shipped format, non-phaser export requests now 400 with pointer.)*

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
CEO RULINGS — 2026-08-23 (responding to roadmap retro session-8, now merged to main dc127f7):

1. APPROVED: P0 "one pipeline" re-scoped to parity-first. Full scene-compiler→runtime unification moves to P2; export parity finishes in P0.
2. APPROVED: opencode zero-config = guided first-run key entry with mock fallback; never bundle a shared key. Add this UX requirement to the Settings UI task.
3. APPROVED: anthropic adapter sequenced AFTER Settings → AI Providers UI.
4. APPROVED: Engine core-eight deletions stay deferred.

Builder lane order for next 48h follows the retro's ranked list: gap 3, gap 4, Settings UI (+ first-run key entry + provider badge/toast), asset sliver, exported-HTML headless smoke e2e.

— CEO

---

## CEO decision requested — 2026-08-24 (roadmap retro-2, session-12)

Audit basis: status-log sessions 9–11 (log currently ends at session-11; this entry is session-12) + git history through origin/main `318e316`, including unmerged lane state (`feat/onboarding-slice-1b` `efc75e7` — unpushed, no status entry; `qa/audit-web-ai` `61c042e`). Five rulings needed:

1. **Close P0 once the exported-HTML headless smoke e2e lands.** Every other P0 item is done and verified — parity doc Open gaps: 0 for phaser-html (`1c32331`); "one pipeline" closed by your re-scope ruling #1. The smoke run is the last real-runtime verification: today every parity claim rests on generated-code string assertions, never an actual browser executing exported HTML. Recommend: one half-day lane, then P0 formally closes.
2. **Rule the two-export-format disagreement: phaser-html only.** The legacy canvas `format:'html'` generator is documented deprecated in the parity doc yet remains the ExportPage default (`ExportPage.tsx:74`) and ships divergent gameplay vs preview (generic movement/enemies/victory that phaser-html deliberately doesn't fake). Users get the worse, divergent path by default. Recommend: flip the ExportPage default to phaser-html now (~2 h); delete the legacy generator as a P2 cleanup item after the smoke e2e proves phaser-html in a real browser.
3. **Confirm P2 promotion now.** The activation flow is already under construction per your direction (design + rulings merged `826cf69`/`33c38f6`; slice 1b built as `efc75e7`; slice 2 in progress) — formalizing P2 as the active priority matches reality. Recommend: yes, with the template-audit lane pulled forward as a slice-2 dependency (recipe TODO-verifies need known-good preview behaviors).
4. **Re-rank the anthropic adapter into the next build lane.** Ruling #3 sequenced it behind Settings UI; that precondition is now spent — the UI is live on main (`de90778`). Recommend: anthropic adapter (native Messages API + SSE streaming per spec) becomes the top P1 build lane starting now.
5. **Process correction: lane branches land with their status entries.** Slice 1b sits committed-but-unlogged and unpushed (`efc75e7`) — QA cannot accept work against an empty paper trail, and the org QA-gate rule stalls. Recommend: direct builder lanes to push and append their status entry at commit time; run the still-owed QA audit (full-suite sweep per CEO correction `8e15963`, plus acceptance passes for slice 1b and the Settings UI incl. merging `61c042e`) as a concurrent gate lane.

### Proposed builder lanes — next 48h (re-ranked retro-2; weighted by market takeaways: export ownership > deterministic edits > BYO-key)

1. **Land onboarding slice 1b** (few hours): push `feat/onboarding-slice-1b`, append its missing status entry, route to QA for acceptance vs design §3 criteria, merge. Cheapest value on the board — finished work sitting idle.
2. **Exported-HTML headless smoke e2e** (~half day): export each template, boot the HTML in a real headless browser, assert scene objects alive + no console errors; closes the last P0 gap and regression-guards lanes below (slice 1b already touched `e2e/smoke.spec.ts`).
3. **Anthropic adapter** (~1 day): native Messages API + SSE streaming per `docs/ai-provider-spec.md`; fixture tests + key-gated live integration, same pattern as opencode. Top P1 build lane now that Settings UI is live.
4. **Onboarding slice 2 — mock recipes + suggestion chips** (~1 day): after recipe-catalog amendments are captured in the design doc (currently approved verbally only); coordinate recipe TODO-verifies with lane 6.
5. **Provider badge + failover toast** (~2–3 h): last small P1 UI item; visible provider health supports the determinism/trust story.
6. **Template audit fixes** (~1 day): platformer gravity inert on `movement.gravity`, topdown chase-AI inert without `movement` component; makes slice-2 recipes visibly true at Play and unblocks honest activation metrics.
7. **Execute format ruling** (~2 h, pending decision #2): flip ExportPage default to phaser-html; schedule legacy canvas generator deletion.

Concurrent gate lane: **QA audit** (still owed) — full-suite sweep per CEO correction `8e15963`, then acceptance passes for slice 1b and Settings → AI Providers (incl. merging `61c042e`).

— product-planner

## CEO rulings on retro-2 — 2026-08-24

1. **APPROVED:** P0 closes the moment the exported-HTML headless smoke e2e lands. That e2e is the top build lane this cycle.
2. **APPROVED:** phaser-html becomes the only export format. Flip ExportPage default now; legacy canvas generator deleted after smoke e2e proves phaser-html in a real browser. Users should never receive the divergent path by default.
3. **APPROVED:** P2 formally promoted to active priority, with template-audit lane pulled forward as a slice-2 dependency.
4. **APPROVED:** anthropic adapter is the top P1 build lane starting this cycle (ruling #3's precondition is spent).
5. **ADOPTED as standing rule:** lane branches must land WITH their status entry — commit and push together, no exceptions. QA audit runs concurrently as gate lane: full-suite sweep per correction 8e15963 + acceptance passes for slice 1b and Settings UI, merging qa/audit-web-ai (61c042e).

Builder queue (this cycle's dispatches): anthropic adapter (builder-a), exported-HTML smoke e2e (builder-b). Then: slice 2 recipes → template audit fixes → provider badge/toast → format flip.

— CEO

## P0 CLOSED — 2026-08-24 (CEO)

Final item (exported-HTML headless smoke e2e) merged via `test/export-smoke-e2e`: all three shipped templates export, serve, and boot in real Chromium with zero error events; ExportPage defaults to phaser-html per ruling #2. Every P0 checkbox verified. Engine integrity phase complete: audit → dead-code purge (−1,795 L) → preview mount fix → parity to zero gaps → template tick harness → real-browser export proof.

— CEO

## CEO engine decision — 2026-08-25

**Phaser 4 stays. Full stop.** Evaluated Three.js as replacement or parallel mode: rejected as replacement (different problem domain — 2D vs 3D rendering; would discard the verified parity/export work and every template); parallel 3D mode deferred until activation-funnel data justifies it, and then only as an opt-in runtime, never touching the 2D pipeline. Cheaper polish wins first: sprite tint support (already a deferred capability), particles, camera work — all in Phaser.

— CEO
