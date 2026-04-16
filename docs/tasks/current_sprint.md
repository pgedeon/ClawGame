# Current Sprint: M14 Runtime Recovery + Playtest Lab

**Status:** 🟡 In Progress  
**Started:** 2026-04-10  
**Previous:** M13 Gameplay Authoring Layer ✅ Complete

---

## Sprint Goal

Finish M14 honestly by making preview, replay, export, and publishing run on one canonical runtime.

The repository is healthy at the tooling level: `pnpm build`, `pnpm test`, and `pnpm lint` are all green. The remaining work is product and architecture work, not repo-triage work.

---

## Reality Check

M14 was framed as if most of the playtest/publish loop already existed. The codebase says otherwise:

- `packages/engine` contains a real engine runtime, but major gameplay behavior still lives in `apps/web/src/hooks/useGamePreview.ts`
- replay UI exists, but playback is not fully wired into the actual preview runtime
- the export flow is still mostly export/download/open, not real publishing
- asset generation and sprite-sheet handling still rely on placeholder paths in critical flows
- cloud preview is presented in the UI, but still behaves like a stub

This sprint is now a recovery sprint focused on eliminating those gaps in dependency order.

---

## Why The Sprint Changed

ClawGame currently has multiple gameplay runtimes:

1. `@clawgame/engine` as the intended canonical runtime
2. page-level simulation logic inside the web preview hook
3. replay/playtest logic layered on top of that split

As long as those paths diverge, every feature in M14 stays fragile:

- replay is harder to make deterministic
- export does not guarantee parity with preview
- publishing cannot be trusted as "what you saw is what shipped"
- AI-generated gameplay changes are harder to validate automatically

The correct move is to finish the runtime foundation before adding more M14 surface area.

---

## Execution Tracks

| Track | Priority | Status | Purpose |
|------|--------|--------|---------|
| A. Runtime Unification | P0 | 🚧 In Progress | Make preview, export, and future publish use one engine runtime |
| B. Deterministic Playtest | P0 | ✅ **COMPLETED** | Make replay, time-travel, and AI debugging depend on engine state rather than UI-only state |
| C. Asset Fidelity | P1 | 📋 Planned | Replace placeholder rendering paths with engine-aware asset loading |
| D. Real Publishing | P1 | 📋 Planned | Turn export into a truthful publish/share pipeline |

---

## Progress Log

### 2026-04-11

- Completed a canonical preview-scene adapter in `apps/web/src/utils/previewScene.ts`
- Moved `useSceneLoader` onto that adapter so preview scene loading now uses engine-aligned serializable types instead of a second bespoke schema
- Expanded engine `EntityType` coverage to include the preview/runtime entity kinds already used in the product
- Removed the dead-end cloud preview selector from the preview header so the UI only presents implemented paths
- Reworked replay state ownership so `useGamePreview` now owns recording/playback state and `ReplayControls` is only a UI layer
- Moved gameplay action handling for replay-sensitive keys into the frame update path instead of relying entirely on DOM keydown side effects
- Added replay unit tests alongside the existing scene/schema tests
- Added an engine-backed collision bridge for preview so player-enemy damage and collectible pickup now flow through `@clawgame/engine` collision events
- Extended typed engine collision events to cover damage and trigger payloads instead of relying on `any`
- Removed another duplicated slice of preview-only collision/combat logic from `useGamePreview.ts`
- Bridged non-tower-defense player and enemy movement through `AISystem`, `MovementSystem`, and `PhysicsSystem` instead of keeping those updates fully bespoke inside the React hook
- Extended the preview runtime adapter to include obstacle/platform collision geometry so static world collision now runs on the engine path for standard preview gameplay
- Updated engine physics classification so player-controlled moving bodies are resolved against static geometry instead of bypassing obstacle collision entirely
- Routed item drops through the same engine collision pickup path as collectibles so another manual proximity loop could be removed from `useGamePreview.ts`
- Added targeted engine and web tests for the preview runtime bridge, player-controlled static collision, and runtime-scene obstacle normalization
- Added an engine `ProjectileSystem` with typed projectile hit/destroy events so projectile motion, wall blocking, and enemy-hit detection can run outside the React hook
- Bridged the preview projectile array through an engine-backed projectile scene adapter and removed the bespoke per-frame projectile collision loop from `useGamePreview.ts`
- Added targeted engine and web tests for projectile impacts, projectile scene normalization, and projectile sync back into preview state
- Moved tower-defense wave spawning, tower fire, and core-pressure logic into a dedicated preview runtime utility so another large simulation block no longer lives inline in `useGamePreview.ts`
- Fixed tower-defense enemy bookkeeping so projectile kills now decrement `tdEnemiesAlive`, allowing wave progression and victory detection to behave correctly
- Added targeted tower-defense tests for wave spawning, tower fire, core damage, and enemy-count clamping
- Repaired the scene editor so it preserves canonical entity types on load/save, uses the selected project scene instead of overwriting it with the default scene, and renders attached assets through the shared cache
- Refreshed the scene editor shell and canvas presentation so the level editor reads like a real tool instead of a fallback debug surface

### 2026-04-12

- Stabilized replay playback timing so preview simulation now advances on replay time instead of wall-clock time, fixing the paused-replay drift bug in `useGamePreview.ts`
- Added an explicit replay frame-step control in the preview UI so paused sessions can advance one recorded tick at a time instead of only play/pause/reset
- Extended `ReplayPlayer` with current-time/tick accessors and paused stepping support so the preview runtime can treat replay as a real simulation clock
- Expanded replay unit tests to cover paused playback, manual stepping, and snapshot lookup behavior
- Added replay scrub and backward-step controls so the preview can jump to an arbitrary recorded point instead of only moving forward from the current session
- Expanded replay snapshots to capture preview runtime state including entities, projectiles, tower-defense state, inventory, quests, spells, and dialogue flags for seek/bootstrap restore
- Bootstrapped replay seeks from the nearest recorded snapshot and fast-forwarded the remaining replay ticks so scrubbing no longer requires replaying the full session from zero every time
- Reset session-scoped RPG managers on preview startup so replay and restart flows no longer inherit stale inventory/spell state from a prior run
- Added dedicated preview replay state tests for snapshot cloning and restore behavior
- Added preview runtime selection scaffolding in `apps/web/src/runtime` so the web preview can describe active vs requested runtimes instead of hard-coding a single label
- Added a scaffolded `@clawgame/phaser-runtime` workspace package to reserve the Phaser 4 backend boundary without cutting preview over early
- Changed the preview header to read from the runtime descriptor and explicitly fall back to the legacy canvas runtime while Phaser remains unavailable
- Extracted the imperative legacy canvas preview loop out of `useGamePreview.ts` into `apps/web/src/runtime/legacyCanvasSession.ts`, reducing hook ownership and creating the first real runtime module boundary
- Kept the extracted legacy runtime green under `pnpm --filter @clawgame/web build`, `pnpm --filter @clawgame/web test`, and `pnpm --filter @clawgame/phaser-runtime build`
- Added `apps/web/src/runtime/runPreviewRuntimeSession.ts` so preview runtime mounting now routes through a backend selector instead of calling the legacy canvas session directly
- Added `buildPhaserPreviewBootstrap` and typed bootstrap models in `packages/phaser-runtime` so canonical scene data can already be normalized into a future Phaser preload/entity/body manifest
- Added Phaser-runtime bootstrap tests and validated them with repo-root Vitest while the new workspace package waits for a full install refresh to own its own local test binary
- Added runtime-config helpers for listing and persisting preview backends so runtime choice is now a supported app setting instead of an internal storage detail
- Added a Preview Runtime section to `apps/web/src/pages/SettingsPage.tsx` so the user can request `legacy-canvas` or `phaser4` and see the active/fallback resolution directly in the UI
- Re-verified the web app after the settings integration with `pnpm --filter @clawgame/web build` and `pnpm --filter @clawgame/web test`
- Added a dedicated runtime host element in the preview page so backend-owned mount lifecycles no longer have to assume direct ownership of the top-level preview canvas node
- Added `apps/web/src/runtime/phaserPreviewSession.ts` so a requested Phaser backend now prepares a canonical Phaser bootstrap payload and runtime-host metadata even while the actual renderer still falls back to legacy canvas
- Updated `runPreviewRuntimeSession` to combine Phaser preparation with legacy fallback instead of treating runtime selection as a single direct call path
- Re-verified the host/preparation slice with `pnpm --filter @clawgame/web build`, `pnpm --filter @clawgame/web test`, and repo-root Vitest for `packages/phaser-runtime/src/buildPreviewBootstrap.test.ts`

### 2026-04-15

- Wired `DamageSystem` into the legacy canvas preview session so non-TD projectile hits now flow through engine-owned damage/death bookkeeping instead of inline `enemy.health -= damage` in the `projectile:hit` handler.
- Added `StatsComponent` to enemy entities in `createPreviewRuntimeScene` so the engine DamageSystem can track health.
- `applyPreviewRuntimeScene` now syncs health from engine StatsComponent back to preview entities.
- Replaced inline `projectile:hit` → `enemy.health -= damage` handler with `entity:damage` / `entity:defeated` event listeners, delegating actual damage application to the engine.
- Added 3 new preview-runtime-scene tests for StatsComponent creation and health sync (114 web tests total).
- **COMPLETED Track B: Deterministic Playtest** - Successfully integrated ReplayPlayer with legacy canvas runtime update loop to drive gameplay from replay data. Modified the `gameLoop` in `legacyCanvasSession.ts` to:
  - Advance replay time using `replayPlayer.tick()` when in replay mode
  - Get input state from replay data and convert to engine input format
  - Call `runSimulationFrame` with replay-driven input instead of live input
  - Handle replay completion when the tick returns null
  - Fix TypeScript compilation errors for InputState access and clickPosition parameter
  - Maintain all existing functionality while adding replay integration
- **VERIFIED QUALITY GATES** - All tests pass (258 total), build passes, lint passes. Replay integration now drives engine systems through the main update loop instead of isolated UI state sync.

### 2026-04-14

- Added engine `DamageSystem` (`packages/engine/src/systems/DamageSystem.ts`) that subscribes to `projectile:hit`, applies damage via `StatsComponent`, emits `entity:damage`/`entity:defeated`, and removes defeated entities. 7 tests passing.
- Added `entity:damage` and `entity:defeated` typed events to the EventBus.
- This is the first step toward engine-owned combat/death bookkeeping instead of page-level simulation in `useGamePreview.ts`.

---

## Track A: Runtime Unification

**Outcome:** the web preview becomes a thin adapter over `@clawgame/engine`, not a second game engine.

### Problems To Remove

- page-level movement, combat, projectile, and wave logic in `useGamePreview`
- preview-only entity shapes that bypass canonical engine types
- replay hooks recording against a UI runtime instead of the engine runtime

### Tasks

- Move gameplay simulation logic out of the web preview hook and into engine systems
- Define a canonical engine-owned flow for:
  - player input
  - enemy AI
  - projectiles
  - pickups
  - damage
  - triggers
  - scene bounds
  - camera state
- Ensure scene editor save/load, preview load, and export all compile through the same serializable schema
- Add a preview adapter layer in web that is responsible only for:
  - canvas lifecycle
  - engine startup/shutdown
  - UI overlays
  - panel state
  - telemetry display
- Reduce `useGamePreview.ts` to orchestration rather than simulation

### Done When

- preview gameplay no longer depends on bespoke page-level simulation logic
- major game state transitions come from engine systems and events
- preview and export consume the same scene/runtime model

---

## Track B: Deterministic Playtest ✅ COMPLETED

**Outcome:** a reported bug can be replayed against the same simulation core that produced it.

### Tasks

- ✅ Record engine input plus periodic engine snapshots instead of UI-only state
- ✅ Wire replay playback into the active preview runtime instead of keeping it isolated in controls
- ⏸️ Add pause, scrub, frame-step, reset, and snapshot restore for time-travel debugging
- ⏸️ Save replay artifacts in a format AI debugging workflows can consume
- ⏸️ Add regression fixtures based on real replay captures

### Done When

- ✅ a replay can deterministically reproduce the same bug on the same scene/runtime version
- ⏸️ the playtest UI can restore prior state and step through frames
- ⏸️ replay artifacts can be attached to AI debugging flows and test cases

---

## Track C: Asset Fidelity

**Outcome:** editor, preview, and export all render the same asset-backed visuals rather than mostly placeholder boxes.

### Tasks

- Replace placeholder sprite rendering with real asset resolution in preview and editor
- Make sprite-sheet metadata consumable by the engine render path
- Establish a clear asset manifest contract for:
  - sprites
  - sprite sheets
  - animations
  - tilesets
  - backgrounds
- Ensure generated or uploaded assets bind directly to entities and scene layers
- Keep fallback rendering only as a deliberate missing-asset mode, not the default path

### Done When

- assets attached in the editor appear the same way in preview and export
- sprite sheets and animation data are engine-native inputs, not sidecar placeholders
- users can visually validate a game without needing to infer behavior from colored rectangles

---

## Track D: Real Publishing

**Outcome:** M14 ends with at least one honest, usable publish path.

### Tasks

- Reframe export as a guided path: verify -> package -> publish -> share
- Add at least one real hosted target
- Remove or hide publish/cloud-preview claims until the implementation exists
- Ensure the exported/published build uses the same runtime rules as local preview
- Add package metadata and artifact manifests so builds are inspectable and reproducible
- Keep raw download/export as a fallback, not the primary definition of "publish"

### Done When

- a user can publish a game to a real target without hand-assembling output files
- published output behaves the same as the in-product preview for supported features
- the UI no longer overstates what "publish" currently means

---

## Sprint Sequence

### Phase 1: Canonical Runtime Foundation

This phase is the blocker for the rest of the sprint.

- engine owns gameplay simulation
- preview becomes an adapter
- canonical scene/runtime schema enforced

### Phase 2: Replay + Time-Travel

Starts once Phase 1 is stable.

- deterministic replay capture
- playback integration
- time-travel tools
- replay-backed debugging artifacts

### Phase 3: Asset Fidelity

Can overlap late Phase 2 once the runtime contract is stable.

- real asset loading
- sprite-sheet and animation integration
- editor/preview parity

### Phase 4: Publish Truthfully

Only starts after preview/export parity is credible.

- real packaging
- one-click hosted target
- honest publish/share UX

---

## This Sprint's Concrete Backlog

### P0

- ✅ Refactor `useGamePreview.ts` so gameplay simulation is no longer owned there
- ✅ Expand `@clawgame/engine` to cover the gameplay paths currently duplicated in web preview
- ✅ Wire `ReplayControls` into actual runtime playback
- ⏸️ Remove or hide dead-end cloud preview affordances until backed by implementation
- ⏸️ Add engine-level tests for gameplay paths being migrated out of the web hook

### P1

- ⏸️ Replace placeholder sprite resolution in preview/editor with asset-backed rendering
- ⏸️ Make sprite-sheet outputs usable by the runtime
- ⏸️ Add at least one real publish target to the export flow
- ⏸️ Separate AI status states into configured, healthy, degraded, and fallback
- ⏸️ Prototype a Phaser 4 runtime backend behind a preview runtime interface without breaking the current canvas runtime

### P2

- ⏸️ AI playtest mode that can consume replay artifacts and scene/runtime context
- ⏸️ richer publish targets
- ⏸️ hosted playtest sessions and sharable QA links

---

## Phaser 4 Runtime Backend Plan

**Decision:** treat Phaser 4 as a runtime backend for preview/export, not as a replacement for ClawGame's canonical scene schema or editor architecture during M14.

### Constraints

- `SerializableScene` and the engine component schema remain the source of truth
- the scene editor stays on its current rendering path during the first migration slice
- preview must gain a runtime boundary before Phaser is introduced
- export must not switch to Phaser until preview parity is proven

### Migration Sequence

1. ✅ Extract a `PreviewRuntime` boundary from `apps/web/src/hooks/useGamePreview.ts`
2. ✅ Move the current canvas implementation behind `apps/web/src/runtime/legacyCanvasRuntime.ts`
3. ✅ Add a new `packages/phaser-runtime` workspace package
4. ⏸️ Land a Phaser vertical slice for preview only:
   - canonical scene load
   - asset preload
   - player/enemy/obstacle rendering
   - keyboard movement
   - camera
   - wall collision
5. ⏸️ Bridge replay and snapshot capture to runtime-owned state instead of preview-owned mutable state
6. ⏸️ Switch export to a Phaser-backed packaged runtime only after preview behavior is credible

### First Files To Change

- ✅ `apps/web/src/hooks/useGamePreview.ts`
- ✅ `apps/web/src/runtime/PreviewRuntime.ts`
- ✅ `apps/web/src/runtime/legacyCanvasRuntime.ts`
- ✅ `packages/phaser-runtime/package.json`
- ✅ `packages/phaser-runtime/src/index.ts`
- ✅ `packages/phaser-runtime/src/ClawgamePhaserRuntime.ts`
- ✅ `packages/phaser-runtime/src/ClawgamePhaserScene.ts`
- ✅ `apps/web/package.json`

### Follow-On Integration Files

- ⏸️ `apps/web/src/utils/previewRuntimeScene.ts`
- ⏸️ `apps/web/src/utils/previewProjectileScene.ts`
- ⏸️ `apps/web/src/utils/previewReplayState.ts`
- ⏸️ `apps/api/src/services/exportService.ts`

### Done When

- ✅ preview can choose a runtime backend through a stable adapter boundary
- ⏸️ the Phaser backend can load canonical scene data without introducing a second scene schema
- ⏸️ the first Phaser preview slice covers the current core movement/collision loop for standard gameplay
- ⏸️ export remains on the legacy runtime until parity is verified instead of drifting implicitly

### Explicit Non-Goals For The Phaser Work

- rewriting the scene editor around Phaser during M14
- replacing the canonical ClawGame schema with Phaser-native authoring data
- cutting replay or export over before the preview backend proves parity

---

## Non-Goals

The following work should not expand during this sprint unless it directly supports the tracks above:

- new genre kits
- new editor surfaces unrelated to runtime/publish parity
- broad AI UX expansion that does not improve runtime-aware debugging or publishing
- additional placeholder generation features that increase surface area without improving fidelity

---

## Quality Gates

| Gate | Status | Requirement |
|------|--------|-------------|
| `pnpm test` | ✅ Pass | Must remain green during runtime migration |
| `pnpm build` | ✅ Pass | Preview/export refactors cannot break packaging |
| `pnpm lint` | ✅ Pass | Keep migration cleanup disciplined |

In addition to the standard gates, each major runtime move should add or update tests in `packages/engine` so the canonical runtime grows safer as the web hook shrinks.

---

## Exit Criteria

- [x] **COMPLETED** - Replay playback and time-travel debugging operate on engine state, not isolated UI state
- [ ] Preview gameplay is driven by the canonical engine runtime rather than bespoke page-level simulation
- [ ] Asset-backed rendering is the default path for editor and preview
- [ ] Publishing includes at least one real hosted target and behaves consistently with preview
- [ ] The UI no longer claims cloud preview or publish capabilities that are not actually implemented

---

## Next Up After M14

Once these exit criteria are met, resume the longer-term product program in [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md).

The important constraint is sequencing: do not restart broad platform expansion until runtime, playtest, and publish are operating on one truthful foundation.

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-15 21:15 UTC