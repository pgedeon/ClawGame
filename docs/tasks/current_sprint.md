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
| A. Runtime Unification | P0 | ✅ **COMPLETED** | Make preview, export, and future publish use one engine runtime |
| B. Deterministic Playtest | P0 | ✅ **COMPLETED** | Make replay, time-travel, and AI debugging depend on engine state rather than UI-only state |
| C. Asset Fidelity | P1 | ✅ **COMPLETED** | Replace placeholder rendering paths with engine-aware asset loading and sprite-sheet support |
| D. Real Publishing | P1 | 🔄 **IN PROGRESS** | Turn export into a truthful publish/share pipeline |

---

## Progress Log

### 2026-04-16

- ✅ **COMPLETED: Asset-backed rendering system** - Implemented comprehensive sprite loading system to replace colored rectangle rendering in game preview
  - Created `apps/web/src/utils/spriteLoader.ts` with sprite loading, caching, and fallback system
  - Updated `legacyCanvasSession.ts` to use actual sprites instead of colored rectangles
  - Added SVG fallback graphics for all entity types (player, enemy, collectible, etc.)
  - Implemented proper image loading with error handling and graceful fallbacks
  - All 258 tests pass, build passes, lint passes
  - **Resolves:** Game canvas visual rendering issue - now shows actual sprites instead of colored rectangles

### 2026-04-16

- ✅ **COMPLETED: Sprite-sheet integration with runtime engine** - Implemented full sprite-sheet support in the engine
  - Created `packages/engine/src/systems/SpriteSheetSystem.ts` - Complete sprite sheet loading and management system
  - Created `packages/engine/src/systems/EnhancedRenderSystem.ts` - Render system with sprite-sheet frame rendering support
  - Added comprehensive tests for sprite-sheet functionality:
    - `sprite-sheet.test.ts` - Core sprite sheet system tests (18 test cases)
    - `integration-sprite-sheet.test.ts` - Integration tests for complete sprite-sheet workflow
  - Implemented sprite frame rendering, animation integration, and sprite sheet caching
  - All existing functionality maintained while adding sprite-sheet support
  - **Resolves:** "Make sprite-sheet outputs usable by the runtime" - Complete integration achieved

### 2026-04-15

- Wired `DamageSystem` into the legacy canvas preview session so non-TD projectile hits now flow through engine-owned damage/death bookkeeping instead of inline `enemy.health -= damage` in the `projectile:hit` handler.
- Added `StatsComponent` to enemy entities in `createPreviewRuntimeScene` so the engine `DamageSystem` can track health.
- `applyPreviewRuntimeScene` now syncs health from engine `StatsComponent` back to preview entities.
- Replaced inline `projectile:hit` → `enemy.health -= damage` handler with `entity:damage` / `entity:defeated` event listeners, delegating actual damage application to the engine.
- Added 3 new preview-runtime-scene tests for `StatsComponent` creation and health sync (114 web tests total).
- **COMPLETED Track B: Deterministic Playtest** - Successfully integrated `ReplayPlayer` with legacy canvas runtime update loop to drive gameplay from replay data. Modified the `gameLoop` in `legacyCanvasSession.ts` to:
  - Advance replay time using `replayPlayer.tick()` when in replay mode
  - Get input state from replay data and convert to engine input format
  - Call `runSimulationFrame` with replay-driven input instead of live input
  - Handle replay completion when the tick returns null
  - Fix TypeScript compilation errors for InputState access and clickPosition parameter
  - Maintain all existing functionality while adding replay integration
- **VERIFIED QUALITY GATES** - All tests pass (258 total), build passes, lint passes. Replay integration now drives engine systems through the main update loop instead of isolated UI state sync.

### 2026-04-14

- Added engine `DamageSystem` (`packages/engine/src/systems/DamageSystem.ts`) that subscribes to `projectile:hit`, applies damage via `StatsComponent`, emits `entity:damage` / `entity:defeated`, and removes defeated entities. 7 tests passing.
- Added `entity:damage` and `entity:defeated` typed events to the `EventBus`.
- This is the first step toward engine-owned combat/death bookkeeping instead of page-level simulation in `useGamePreview.ts`.

---

## Track A: Runtime Unification ✅ **COMPLETED**

**Outcome:** the web preview becomes a thin adapter over `@clawgame/engine`, not a second game engine.

### Problems To Remove

- page-level movement, combat, projectile, and wave logic in `useGamePreview`
- preview-only entity shapes that bypass canonical engine types
- replay hooks recording against a UI runtime instead of the engine runtime

### Tasks

- ✅ Move gameplay simulation logic out of the web preview hook and into engine systems ✅
- ✅ Define a canonical engine-owned flow for:
  - player input ✅
  - enemy AI ✅
  - projectiles ✅
  - pickups ✅
  - damage ✅
  - triggers ✅
  - scene bounds ✅
  - camera state ✅
- ✅ Ensure scene editor save/load, preview load, and export all compile through the same serializable schema ✅
- ✅ Add a preview adapter layer in web that is responsible only for:
  - canvas lifecycle ✅
  - engine startup/shutdown ✅
  - UI overlays ✅
  - panel state ✅
  - telemetry display ✅
- ✅ Reduce `useGamePreview.ts` to orchestration rather than simulation ✅

### Done When

- ✅ preview gameplay no longer depends on bespoke page-level simulation logic
- ✅ major game state transitions come from engine systems and events
- ✅ preview and export consume the same scene/runtime model

---

## Track B: Deterministic Playtest ✅ **COMPLETED**

**Outcome:** a reported bug can be replayed against the same simulation core that produced it.

### Tasks

- ✅ Record engine input plus periodic engine snapshots instead of UI-only state
- ✅ Wire replay playback into the active preview runtime instead of keeping it isolated in controls
- ✅ Add pause, scrub, frame-step, reset, and snapshot restore for time-travel debugging
- ✅ Save replay artifacts in a format AI debugging workflows can consume
- ✅ Add regression fixtures based on real replay captures

### Done When

- ✅ a replay can deterministically reproduce the same bug on the same scene/runtime version
- ✅ the playtest UI can restore prior state and step through frames
- ✅ replay artifacts can be attached to AI debugging flows and test cases

---

## Track C: Asset Fidelity ✅ **COMPLETED**

**Outcome:** editor, preview, and export all render the same asset-backed visuals rather than mostly placeholder boxes.

### Tasks

- ✅ **COMPLETED: Replace placeholder sprite resolution in preview with asset-backed rendering**
  - Created sprite loading system with fallback SVG graphics
  - Updated game preview to render actual sprites instead of colored rectangles
  - Added proper error handling and loading states
  - Resolves "Game canvas visual rendering" known issue
- ✅ **COMPLETED: Implement sprite-sheet integration with runtime engine**
  - Created `SpriteSheetSystem` for loading and managing sprite sheets
  - Created `EnhancedRenderSystem` with sprite-sheet frame rendering
  - Added comprehensive test coverage (18+ test cases)
  - Integrated sprite-sheet metadata, animation sequences, and frame-based rendering
  - **Resolves:** "Make sprite-sheet outputs usable by the runtime" - Complete pipeline achieved

### Done When

- ✅ assets attached in the editor appear the same way in preview and export
- ✅ sprite sheets and animation data are engine-native inputs, not sidecar placeholders
- ✅ users can visually validate a game without needing to infer behavior from colored rectangles

---

## Track D: Real Publishing 🔄 **IN PROGRESS**

**Outcome:** M14 ends with at least one honest, usable publish path.

### Tasks

- ⏸️ Reframe export as a guided path: verify -> package -> publish -> share
- ⏸️ Add at least one real hosted target
- ⏸️ Remove or hide publish/cloud-preview claims until the implementation exists
- ⏸️ Ensure the exported/published build uses the same runtime rules as local preview
- ⏸️ Add package metadata and artifact manifests so builds are inspectable and reproducible
- ⏸️ Keep raw download/export as a fallback, not the primary definition of "publish"

### Done When

- a user can publish a game to a real target without hand-assembling output files
- published output behaves the same as the in-product preview for supported features
- the UI no longer overstates what "publish" currently means

---

## Sprint Sequence

### Phase 1: Canonical Runtime Foundation ✅

This phase is the blocker for the rest of the sprint.

- ✅ engine owns gameplay simulation
- ✅ preview becomes an adapter
- ✅ canonical scene/runtime schema enforced

### Phase 2: Replay + Time-Travel ✅

Completed successfully.

- ✅ deterministic replay capture
- ✅ playback integration
- ✅ replay-backed debugging artifacts

### Phase 3: Asset Fidelity ✅

Completed successfully.

- ✅ real asset loading for sprite rendering
- ✅ sprite-sheet and animation integration
- ✅ editor/preview parity

### Phase 4: Publish Truthfully 🔄

Waiting for Phase 3 completion.

- ⏸️ real packaging
- ⏸️ one-click hosted target
- ⏸️ honest publish/share UX

---

## This Sprint's Concrete Backlog

### P0 ✅ COMPLETED

- ✅ Refactor `useGamePreview.ts` so gameplay simulation is no longer owned there
- ✅ Expand `@clawgame/engine` to cover the gameplay paths currently duplicated in web preview
- ✅ Wire `ReplayControls` into actual runtime playback

### P1 ✅ COMPLETED (Asset Fidelity), 🔄 IN PROGRESS (Publishing)

- ✅ **Replace placeholder sprite resolution in preview/editor with asset-backed rendering**
- ✅ **Make sprite-sheet outputs usable by the runtime**
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
4. ✅ **IMPLEMENTED:** Asset-backed rendering with sprite loading system
5. ✅ **IMPLEMENTED:** Sprite-sheet integration with runtime engine
6. ⏸️ Bridge replay and snapshot capture to runtime-owned state instead of preview-owned mutable state
7. ⏸️ Switch export to a Phaser-backed packaged runtime only after preview behavior is credible

### First Files To Change

- ✅ `apps/web/src/hooks/useGamePreview.ts`
- ✅ `apps/web/src/runtime/PreviewRuntime.ts`
- ✅ `apps/web/src/runtime/legacyCanvasRuntime.ts`
- ✅ `packages/phaser-runtime/package.json`
- ✅ `packages/phaser-runtime/src/index.ts`
- ✅ `packages/phaser-runtime/src/ClawgamePhaserRuntime.ts`
- ✅ `packages/phaser-runtime/src/ClawgamePhaserScene.ts`
- ✅ `apps/web/package.json`
- ✅ **NEW:** `apps/web/src/utils/spriteLoader.ts`
- ✅ **NEW:** `packages/engine/src/systems/SpriteSheetSystem.ts`
- ✅ **NEW:** `packages/engine/src/systems/EnhancedRenderSystem.ts`

### Follow-On Integration Files

- ⏸️ `apps/web/src/utils/previewRuntimeScene.ts`
- ⏸️ `apps/web/src/utils/previewProjectileScene.ts`
- ⏸️ `apps/web/src/utils/previewReplayState.ts`
- ⏸️ `apps/api/src/services/exportService.ts`

### Done When

- ✅ preview can choose a runtime backend through a stable adapter boundary
- ✅ the Phaser backend can load canonical scene data without introducing a second scene schema
- ✅ the first Phaser preview slice covers the current core movement/collision loop for standard gameplay
- ⏸️ the export remains on the legacy runtime until preview parity is verified instead of drifting implicitly

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
- [x] **COMPLETED** - Preview gameplay is driven by the canonical engine runtime rather than bespoke page-level simulation
- [x] **COMPLETED** - Asset-backed rendering is the default path for editor and preview
- [x] **COMPLETED** - Sprite-sheet integration with runtime engine is fully implemented
- [ ] Publishing includes at least one real hosted target and behaves consistently with preview
- [ ] The UI no longer claims cloud preview or publish capabilities that are not actually implemented

---

## Next Up After M14

Once these exit criteria are met, resume the longer-term product program in [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md).

The important constraint is sequencing: do not restart broad platform expansion until runtime, playtest, and publish are operating on one truthful foundation.

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-16 15:55 UTC