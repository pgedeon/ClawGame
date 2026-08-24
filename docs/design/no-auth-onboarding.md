# Design: No-Auth Onboarding & Activation Flow (P2 time-to-fun)

- **Status:** PROPOSED — ready to build; no further product decisions required from builders except items in §5.
- **Author:** product-planner (strategy lane, acting CEO task 2026-08-24)
- **Branch:** `design/onboarding` (off `main` `2e606f5`)
- **Inputs:**
  - `docs/market-research-2026-08.md` → "Research addendum 2026-08-24", ranked implications **1** (no-auth before first playable, local-first projects), **3** (template gallery default, prompt bar beside it), **4** (value demo before key/auth friction — mock AI edit first), **5** (define + instrument the activation event now).
  - `docs/product/roadmap-2026H2.md` P2: "Onboarding flow: create → first AI edit applied → play, measured in clicks; reduce to minimum."
  - **CEO ruling #2 (2026-08-23):** opencode zero-config = guided first-run key entry with mock fallback; never bundle a shared key.
- **Scope guard:** this design covers the onboarding/activation flow only. Template demonstrativeness fixes are the separate P2 "template audit" lane (roadmap) and are a **hard dependency for measuring the funnel** (implication 2), not part of this design. Share/publish links are explicitly out of scope (P2 item 3, later).

---

## 1. User stories & acceptance criteria

### Click-counting convention (binding for QA)

A **click** = one intentional user interaction on the primary path (mouse click or required keystroke such as Enter). App-driven navigations, loading states, and auto-created artifacts do **not** count. Scrolling does not count. Typing counts only when the user is *required* to type.

**Target (from implication 1 / roadmap P2): landing → playable template in ≤ 3 clicks.**

Planned budget: click 1 = template card on landing → app auto-creates project and navigates to preview → click 2 = **Start Game**. Total **2 clicks** (1 spare).

### Activation event definition (binding for instrumentation)

> **Activated** = first `play_started` event (browser-local) fired for a project that has ≥ 1 applied edit.

- `play_started` fires when the user actually starts the game in preview (`handleStartGame()` in `apps/web/src/hooks/useGamePreview.ts`), not merely when the preview page opens.
- "Applied edit" = any successful file write to the project after creation via (a) applying an AI response change (`api.writeFile` of a `changes[]` entry — existing path in `AICommandPage.tsx` `handleApplyChange`) or (b) a manual editor save. Both paths emit `edit_applied`.
- The event is derived client-side from the storage-only event log (§4); no server, no account, no telemetry network call.
- This matches research implication 5 ("first Play pressed on a project the user edited") and makes the P2 chain *create → first AI edit applied → play* measurable end-to-end.

### US-1: First-time visitor (no projects, no API key)

**Story:** As a first-time visitor I open ClawGame cold, pick something fun-looking, and am playing it within seconds — without an account, without an API key, without filling a form.

**Acceptance criteria:**
1. Opening `/` shows the template gallery as the primary content with one card per shipped template (platformer, topdown, dialogue), each stating in one line what it demonstrates (GDevelop-style, e.g. "2D side-view platformer — run, jump, collect coins, stomp enemies"). *(Implication 3: gallery default.)*
2. An AI prompt input is visible on the same first screen, beside — not above or instead of — the gallery. *(Implication 3: parallel entries, Rosebud pattern.)*
3. No auth, no signup, no API-key modal, no wizard steps appear anywhere before first Play. The existing `OnboardingTour` welcome modal must NOT appear on the landing→playable path (see §3.4).
4. Clicking a template card creates a project with zero required form input (auto-generated name, template defaults) and lands on `/project/:id/preview`. Landing → playable ≤ 3 clicks (expected 2).
5. With no provider configured, the AI command path answers via the mock service (existing fallback per ruling #2) — creating, editing, and playing work with zero keys.
6. After the visitor's first applied mock edit, exactly one non-blocking key prompt appears (§2 step 6). Dismissing it never re-shows unless localStorage is cleared. It never blocks Play.
7. Every step works logged-out against a freshly cloned repo with only `pnpm dev` running (dev-first rule): web app + local API, no env vars required.

### US-2: Returning local user (has projects)

**Story:** As a returning user I want my previous work one click away, and new templates still visible so I can start something new just as fast.

**Acceptance criteria:**
1. `/` shows a "Continue building" strip (most recent local projects, newest first, max 5) above/beside the gallery, populated from the local recent-projects index (§3.3) immediately — it must render even while the API project list is still loading.
2. One click on a recent project navigates directly to its overview; from there Play is one more click (≤ 3 total to playable for a resumed project: project card → Play tab → Start Game).
3. The first-run key prompt and first-edit guidance do NOT reappear for users who already completed them (localStorage flags persist across sessions).
4. Projects created through the flow persist across full page reloads and browser restarts (server-disk persistence via `PROJECTS_DIR`; index rebuilds itself if localStorage was cleared but projects exist on disk).

### US-3: Key-having user (brings an opencode key)

**Story:** As a user who wants real AI iteration, I add my opencode key when *I* choose to — guided, testable, reversible — and from then on edits run on my key with mock as silent fallback.

**Acceptance criteria:**
1. The key prompt shown after first mock edit offers: inline key entry field, a link to the full `/settings/ai-providers` page, and "Maybe later" (dismiss). Ruling #2 wording honored: guided entry, skippable, mock keeps working.
2. Saving a valid key flips subsequent AI commands to live opencode automatically (existing registry chain: active provider first, configured fallbacks, mock implicit last — `apps/api/src/services/ai/registry.ts`). No restart needed (write-through config, already implemented).
3. The AI command surface indicates which provider answered (mock vs opencode) so the user can tell when they're on real AI. *(Minimal version: reuse the existing provider badge/toast lane if it has landed; otherwise a one-line label in the AI panel.)*
4. A wrong/failing key degrades gracefully: failover toast/notice appears, next edit falls back to mock, play is never blocked.
5. Key entry via the post-edit prompt and via Settings write the same config (single source: `PUT` config endpoint used by `AIProvidersPage.tsx` today). No second key store.

---

## 2. UX flow — screen by screen

Primary path: **first-time visitor, template route, zero keys.** Screens marked ⭕ are new builds; everything else reuses existing surfaces.

**S1 ⭕ Landing (`/`, replaces DashboardPage as index route)**
Layout top-to-bottom:
1. Compact header: wordmark + "How it works" anchor link + Settings gear (→ `/settings`).
2. **Prompt bar** (implication 3, marketed path): single input, placeholder "Describe your game…". Submitting creates a project from the best-matching template with the prompt stored as project description, then follows S2. A caption under the bar sets expectations honestly: "Starts from the closest template — you can iterate with AI inside."
3. **Template gallery** (implication 3, deterministic fast path — visually dominant): one card per template with name, one-line "what it demonstrates" description, genre tag, and a single primary action ("Play now"). No wizard steps (implication 7: defer multi-step wizards).
4. **Continue building** strip — only rendered when the local recent-projects index is non-empty (US-2).
No feed, no marketing sections, no login buttons anywhere.

**S2 ⭕ Instant project creation (not a screen — an transition)**
Clicking "Play now" calls the one-click launch helper (§3.2): auto-generates a project name (GDevelop-style adjective+noun, e.g. "Bouncing Ember"), applies template defaults (genre, art style), writes the same template files `CreateProjectPage.tsx` writes today (`scripts/game.ts`, `scripts/player.ts`, `scenes/main-scene.json`), then navigates to `/project/:id/preview`. Target: under ~1.5s perceived; show inline button spinner meanwhile. Emits `project_created { templateId }`.

**S3 Preview / Play (existing `GamePreviewPage`, small additions)**
Existing Start Game overlay → click → game runs (click 2 of 2). Additions:
- A slim "next step" banner below the canvas (dismissible, per-project): **"Make it yours — try a free AI edit"** with two one-click suggestion chips (§3.3 recipes), e.g. platformer: "Double coin value" · "Add a moving enemy". *(Implication 4: value demo before any friction.)*
- Banner emits `ai_suggestion_shown`.

**S4 ⭕ Guided first AI edit (mock, no key)**
Clicking a chip sends the corresponding command through the existing `/api/projects/:id/ai/command` route. With nothing configured, the mock service answers (ruling #2 fallback). The response's `changes[]` renders in the existing diff-review UI and applies via the existing `handleApplyChange` → `api.writeFile` path. Emits `ai_prompt_submitted { provider: 'mock' }` and `edit_applied { provider: 'mock', recipeId }` on success.
**Hard rule:** the recipe must produce a change visible in the next Play (see §3.3 — scene JSON, not script text).

**S5 Play again (existing)**
User presses Start Game again; the edited scene loads (e.g., coins now worth double). This closes the activation loop: `play_started { editsApplied ≥ 1 }` → **activation recorded**.

**S6 ⭕ Key prompt — AFTER first applied edit, never before, never blocking (implication 4 + ruling #2)**
Immediately after the first successful `edit_applied` (browser-local, once ever):
- Inline card in the same surface where the edit was applied (preview banner area or AI panel): "That edit ran on the built-in mock AI. Add your free opencode key for real iteration — takes 2 minutes." Actions: [Enter key inline] [Open AI settings] [Maybe later].
- Non-modal, dismissible, never overlays the canvas or the Start Game control, auto-dismisses on navigation. Dismissal persists (`clawgame.keyprompt.dismissed`).
- Inline entry reuses the exact request shape `AIProvidersPage.tsx` first-run card uses (`PUT` config with `opencode.apiKey`, then optional `POST /api/ai/test`). On success: confirmation state + emits `key_saved`. On failure: error shown, mock continues working.

**Returning-user variant:** S1 renders Continue strip first; template gallery and prompt bar unchanged; S4/S6 suppressed by flags.

---

## 3. Technical approach

### 3.1 Already in place (build on these; do not duplicate)

| Capability | Location | Notes |
|---|---|---|
| Canonical template scenes | `apps/web/src/templates/templateScenes.ts` | Single source (session-5 extraction); consumed by CreateProjectPage + engine tests. |
| Project creation + template file writing | `apps/web/src/pages/CreateProjectPage.tsx` (`handleSubmit`) | Creates project via `api.createProject`, writes `scripts/game.ts`, `scripts/player.ts`, `scenes/main-scene.json`. Sequence to be extracted & reused (§3.2). |
| Server-side project persistence | `apps/api/src/services/projectService.ts` | File-per-project JSON under `PROJECTS_DIR` (default `./data/projects`). Local-first already holds on a dev box: localhost API, no auth anywhere in the stack. |
| Mock AI service | `apps/api/src/services/aiService.ts` | Simulated responses incl. `changes[]` with `newContent`. |
| Provider seam + fallback chain | `apps/api/src/services/ai/registry.ts`, `services/realAIService.ts` | Active provider → configured fallbacks → mock implicit last; empty chain = mock answers. Ruling #2 backend half done. |
| Guided first-run key entry | `apps/web/src/pages/AIProvidersPage.tsx` (`FIRST_RUN_DISMISS_KEY`, first-run card, `OPENCODE_AUTH_URL`) | Ruling #2 frontend half done — but currently only reachable inside Settings; this design reuses its request shapes in the S6 prompt. |
| AI edit apply path | `apps/web/src/pages/AICommandPage.tsx` (`handleApplyChange`, `handleApplyAllChanges`) | `changes[]` → `api.writeFile`. Reused verbatim by the new suggestion chips. |
| Preview/play + start event point | `apps/web/src/pages/GamePreviewPage.tsx`, `hooks/useGamePreview.ts` (`handleStartGame`) | Instrumentation hook point for `play_started`. |
| Runtime descriptor pattern | `packages/phaser-runtime/src/runtimeDescriptor.ts`, `apps/web/src/runtime/previewRuntimeConfig.ts` | Established localStorage-backed config pattern (`clawgame-preview-runtime`) — copy this pattern for new flags/indexes. |
| Existing tour modal | `apps/web/src/components/OnboardingTour.tsx` | Generic 4-slide product tour, localStorage-gated. |
| E2E harness | `e2e/smoke.spec.ts` (Playwright) | Extend for funnel assertions. |

### 3.2 New: landing page + one-click template launch

- **`apps/web/src/pages/LandingPage.tsx`** (+ `landing.css`): gallery default + prompt bar beside it + continue strip (§2 S1). Data sources: static import of template metadata (extend `templates/templateScenes.ts` with display metadata or add `apps/web/src/templates/templateCatalog.ts` wrapping it — builder's choice, keep `templateScenes.ts` data untouched) + `utils/recentProjects.ts`.
- **Route swap in `apps/web/src/App.tsx`:** `/` → `LandingPage`; `DashboardPage` moves to `/dashboard` (kept for power users; sidebar/back-links relabeled). Update `AppLayout.tsx` back-link label. Bookmarks to deep routes unaffected.
- **`apps/web/src/templates/templateLaunch.ts`**: exports `launchTemplate(templateId, opts?)`:
  1. auto-name generator (adjective+noun list, ~20×20 combos, collision-safe enough for local use);
  2. builds `CreateProjectInput` defaults from catalog metadata;
  3. calls `api.createProject` + the file-writing sequence **extracted from `CreateProjectPage.tsx` into this module** so both pages share one code path (CreateProjectPage refactored to call it — behavior preserved);
  4. records the project in the recent index;
  5. returns `{ id }` for navigation.
- **Prompt bar submit:** maps free text → template via keyword match over catalog tags (deterministic, local; e.g. "jump/jump/platform" → platformer, "talk/dialogue/npc/quest" → dialogue, else topdown), stores text as project description, launches same helper. No new AI capability required; honest caption per §2 S1.

### 3.3 New: guided first mock edit (recipes) + key prompt

- **Mock recipes (API):** extend `apps/api/src/services/aiService.ts` so `generateChangeRequest` recognizes recipe commands (exact match on seeded command strings) and returns a **template-aware, scene-safe** change:
  - Recipe edits target `scenes/main-scene.json` entities (add/recolor entity, bump `collision.value`, add patrol enemy, adjust `movement.speed`) — **NOT `scripts/game.ts`**.
  - **Evidence for this constraint:** the Phaser preview builds from raw scene JSON (`apps/web/src/runtime/phaserPreviewSession.ts` → `buildPhaserPreviewBootstrap(sceneData)`; entity fields consumed in `packages/phaser-runtime/src/buildPreviewBootstrap.ts` — sprite/collision/transform/movement). Template scripts are not executed by the Phaser preview today (three-codegen divergence documented in status-log session-1 and engine-audit). A script-text edit would be invisible at Play and kill the aha moment.
  - Each catalog template ships 2 recipes `{ id, command, summaryLine }` in `templateCatalog.ts`; chips send `command` verbatim.
  - Non-recipe commands keep current mock behavior (no regression).
- **First-run edit UI:** `apps/web/src/components/FirstRunEditCard.tsx` — banner + chips rendered by `GamePreviewPage` (below canvas) and by `EditorPage`'s AI panel; hidden once the project has ≥1 `edit_applied` event or user dismisses (per-project flag in recent-index entry).
- **Key prompt:** `apps/web/src/components/KeyPromptCard.tsx` — shown once per browser after first `edit_applied` (flag `clawgame.keyprompt.done`); inline field posts the same config PUT as `AIProvidersPage.tsx` first-run card; "Open AI settings" deep-links `/settings/ai-providers`. Never rendered as modal/overlay over canvas controls.

### 3.4 New: local persistence touches

- **`apps/web/src/utils/recentProjects.ts`**: localStorage index `clawgame.recent-projects.v1` — `[{ id, name, templateId, createdAt, lastOpenedAt, edited: boolean, dismissedGuidance?: boolean }]`, max 20 entries, written on create/open/edit-apply. Powers the Continue strip and guidance suppression. Pattern reference: `previewRuntimeConfig.ts`.
- **Suppression of `OnboardingTour` on the activation path:** set `TOUR_SEEN_KEY` when a user launches a template from the landing page (the flow *is* the onboarding now); tour remains available elsewhere. Prevents a modal from violating US-1 AC 3. (CEO confirm in §5 Q3.)
- **Out of scope, deliberate:** full offline IndexedDB project persistence. Server-disk persistence satisfies local-first for the self-hosted/dev reality; browser-offline mode is a bigger architectural lift (file sync) — §5 Q2.

### 3.5 Build sequence (3 lane sessions, each independently shippable)

**Slice 1 — Landing + ≤3-click launch (~1 session)**
Files: `LandingPage.tsx`, `landing.css`, `App.tsx`, `AppLayout.tsx`, `templateLaunch.ts`, `templateCatalog.ts`, `CreateProjectPage.tsx` (refactor to shared launcher), `recentProjects.ts`.
AC (for qa-auditor):
- Fresh profile: `/` renders gallery + prompt bar; zero auth/key/modal interruptions.
- Click template card → project exists (visible in API `PROJECTS_DIR`) → preview opens → Start Game plays the template. Measured clicks ≤ 3.
- Prompt bar submits → project created from matched template with description set.
- Old dashboard reachable at `/dashboard`; all prior smoke tests pass or are updated.
- Reload ×2 → recent strip shows the project; clicking it opens the project.

**Slice 2 — Guided mock edit + key prompt (~1 session)**
Files: `aiService.ts` (recipes), `FirstRunEditCard.tsx`, `KeyPromptCard.tsx`, `GamePreviewPage.tsx`, `EditorPage.tsx` wiring, `templateCatalog.ts` (recipe defs).
AC:
- No key configured: chip click → mock responds → diff renders → Apply → file actually changed on disk (`scenes/main-scene.json` diff) → Start Game reflects the change visibly (e.g., coin value doubled, verified by playing).
- Key prompt appears exactly once, after first apply, is non-blocking, all three actions work; dismissal persists across reload.
- With a valid opencode key pre-configured: same chip runs live (provider label ≠ mock), key prompt never shows.
- With invalid key: failure notice, mock fallback still completes the edit, play unblocked.
- Non-recipe AI commands behave exactly as before (regression check on AICommandPage).

**Slice 3 — Instrumentation + funnel e2e (~½–1 session)**
Files: `utils/activationEvents.ts`, hooks in `LandingPage.tsx` / `GamePreviewPage.tsx` / `useGamePreview.ts` / `AICommandPage.tsx` / `KeyPromptCard.tsx`, Settings debug section export button, `e2e/onboarding.spec.ts`.
AC: see §4 acceptance block.

**Dependency note:** Slice 2 recipes depend on template scenes behaving correctly in preview — coordinate with the P2 template-audit lane (known inert behaviors: platformer gravity on `movement.gravity` unread; topdown chase-AI inert without `movement` component, session-5 harness). Recipes must be chosen/verified against *current* preview behavior, not intended behavior. If audit hasn't landed, slice 2 picks recipes that are visibly safe today (entity add/recolor/value changes) and marks the rest TODO-verify.

### 3.6 Risks

1. **Template inert behaviors (highest).** A broken demo kills activation regardless of click count (implication 2). Mitigation: audit-lane sequencing + recipe selection rule in §3.5.
2. **Scene JSON drift.** Recipes hand-craft entity mutations against `templateScenes.ts` shapes; bootstrap normalization is tolerant but not contractual. Mitigation: recipe unit tests asserting the mutated JSON passes `buildPhaserPreviewBootstrap` without dropping the touched entities.
3. **Route swap fallout.** `/` semantics change; e2e assumptions ("Build Games" hero on `/`) break. Mitigation: update `e2e/smoke.spec.ts` in slice 1, same commit.
4. **Mock realism gap.** Current mock `generateChangeRequest` returns generic plan prose + a hardcoded `player.ts` rewrite that would be invisible/harmful at Play. Recipes replace this only on exact command match; generic path untouched (no false promises in copy either — S1 caption stays honest).
5. **localStorage unavailable (private mode / hardened browsers).** All new localStorage uses must try/catch and degrade (flags reset → guidance may reshown; index empty → strip hidden). Never throw.
6. **Provider-badge dependency (US-3 AC 3).** If the provider badge/toast lane hasn't merged, ship the one-line provider label fallback; don't block slice 2 on it.

---

## 4. Instrumentation plan — activation funnel (storage-only)

**Principles (per implication 5 + privacy posture):** no telemetry server, no network egress, no accounts, no PII. The log exists so (a) qa/product can inspect funnels locally during the A/B loop, and (b) a future opt-in uploader can read the same schema without rework.

**Module:** `apps/web/src/utils/activationEvents.ts`
- Storage: localStorage key `clawgame.events.v1`, append-only JSON array used as a ring buffer (cap 500 events; drop oldest).
- Record shape: `{ ts: ISO8601, name: string, props?: object }`. Props limited to ids/enums/counters — **never** prompt text, project names, file contents, keys, or IPs.
- API: `trackEvent(name, props?)` (fire-and-forget, try/catch silent), `getFunnelSnapshot()` (derives counts + activation rate), `exportEvents()` (JSON download/copy).
- Access: Settings → "Local diagnostics" section: event count, "Copy event log" button, "Clear" button. Console accessor `window.__clawgameEvents` for qa.

**Event schema:**

| Event | When | Props |
|---|---|---|
| `landing_viewed` | LandingPage mount | `recentCount`, `abVariant` |
| `template_launch_clicked` | Gallery card click | `templateId` |
| `prompt_submit_clicked` | Prompt bar submit | `matchedTemplateId`, `promptLength` |
| `project_created` | launcher success | `templateId`, `via: 'gallery'\|'prompt'\|'form'` |
| `preview_opened` | GamePreviewPage mount | `projectId` (opaque local id) |
| `play_started` | `handleStartGame()` | `projectId`, `editsApplied`, `isFirstForProject` |
| `ai_suggestion_shown` | FirstRunEditCard render | `projectId`, `recipes` |
| `ai_prompt_submitted` | command POST resolves | `provider` ('mock'\|'live'), `recipeId?` |
| `edit_applied` | writeFile success (AI apply OR manual save) | `provider?`, `recipeId?`, `path` (basename only) |
| `activation` | derived: first `play_started` with `editsApplied ≥ 1` | `templateId`, `secondsSinceLanding` |
| `key_prompt_shown` / `key_prompt_dismissed` / `key_saved` | S6 lifecycle | `outcome?: 'inline'\|'settings'\|'later'` |

**Funnel definition (reported by `getFunnelSnapshot`):**
`landing_viewed → template_launch_clicked | prompt_submit_clicked → project_created → preview_opened → ai_prompt_submitted → edit_applied → play_started(editsApplied≥1)`; headline metric = **activation rate** = sessions(browsers) with `activation` ÷ `landing_viewed` (new profiles only, i.e. no prior events).

**A/B readiness:** `activationEvents.ts` assigns + persists `clawgame.ab-variant` (50/50, first touch) so the existing impact-measurement loop can compare variants (e.g., gallery-first vs prompt-first ordering) without any new infra. Baseline MUST be captured from this log before the share/publish lane starts (implication 5 ordering).

**Acceptance (slice 3, for qa-auditor):**
1. Full manual walkthrough produces every event above exactly once (except repeats by design), in order, in `clawgame.events.v1`.
2. `activation` fires iff a play follows an applied edit; playing an untouched template does NOT activate.
3. With localStorage blocked: zero console errors, flow fully functional, snapshot APIs return empty results gracefully.
4. Ring buffer caps at 500 (seed 600 synthetic events → length 500, oldest dropped).
5. Export contains no free text beyond enum/id props (spot-check: no prompt strings, no project names).
6. Network tab shows zero outbound requests attributable to instrumentation during the whole walkthrough.

---

## 5. Open questions for CEO

1. **Landing route swap:** `/` becomes the no-auth landing (gallery+prompt); Dashboard demotes to `/dashboard`. Any objection to changing what the root route shows (bookmarks, habit, screenshots in docs)?
2. **Browser-offline persistence:** is server-disk persistence enough for P2 "local-first" (my recommendation: yes for self-host/dev reality), or is true offline IndexedDB a requirement we should schedule?
3. **OnboardingTour fate:** suppress the legacy 4-slide welcome modal on the activation path (this design) — or delete it entirely now that the flow itself onboards?
4. **Script-vs-scene edit honesty:** today Phaser preview ignores `scripts/game.ts` (three-codegen divergence, P0/P2 pipeline item). OK to constrain first-run recipes to scene JSON until pipeline unification lands? Alternative (not recommended): show script diffs users can't see in play.
5. **Activation target:** propose we adopt "≥ 30% of new visitors activated in first session" as the P2 exit bar (bottom of Appcues' 25–50% band, honest for a dev-tool). Confirm or set another number.
6. **Recipe content sign-off:** the specific first-run edits (double coin value, add patrol enemy, recolor player…) are product-visible choices — want a 10-minute review of the recipe list before slice 2 merges?

— product-planner, 2026-08-24

---

## 6. CEO rulings on open questions — 2026-08-24

1. **Landing route swap: APPROVED.** `/` becomes the no-auth gallery landing; dashboard moves to `/dashboard`. Root route is prime real estate — it should show the product's fastest path to value, not a management view.
2. **Persistence: server-disk only for P2 — APPROVED.** IndexedDB offline is deferred; revisit only if a real self-host user reports needing it. Don't build for hypothetical air-gapped users before activation is instrumented.
3. **OnboardingTour: delete it entirely.** A flow that onboards by doing makes a 4-slide modal redundant; keeping both creates two competing first-run experiences. Remove in slice 1 alongside the landing swap.
4. **Scene-JSON-only recipes: APPROVED (your recommendation stands).** Honesty beats demo-scope: recipes must produce edits the player can actually SEE at Play. Script-text diffs invisible in preview are exactly the "edits don't stick" failure our market research says kills trust. Revisit when pipeline unification lands.
5. **Activation target: CONFIRMED at ≥30% first-session activation** as the P2 exit bar, measured by the storage-only funnel log. If we hit ≥40% pre-share-links, we're outperforming the band and share links get priority next.
6. **Recipe content review: YES — bring the recipe list before slice 2 merges.** Post the proposed list (edit name + one-line visible effect per template) in your status-log entry; I approve or amend in the next hourly cycle.

Builder sequencing note: slice order per doc §3.5. Slice 1 may start immediately after current lanes drain.

— CEO
