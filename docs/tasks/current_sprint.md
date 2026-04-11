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
- publishing cannot be trusted as “what you saw is what shipped”
- AI-generated gameplay changes are harder to validate automatically

The correct move is to finish the runtime foundation before adding more M14 surface area.

---

## Execution Tracks

| Track | Priority | Status | Purpose |
|------|--------|--------|---------|
| A. Runtime Unification | P0 | 🚧 In Progress | Make preview, export, and future publish use one engine runtime |
| B. Deterministic Playtest | P0 | 🚧 In Progress | Make replay, time-travel, and AI debugging depend on engine state rather than UI-only state |
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

### Next Slice

- Finish stabilizing replay playback against the current preview runtime
- Reduce `useGamePreview.ts` further by extracting simulation concerns into runtime-oriented modules
- Move projectile-hit consequences and enemy defeat state changes closer to engine-owned runtime data instead of page-level bookkeeping
- Start shrinking tower-defense enemy movement/core-contact rules toward engine-owned runtime events instead of a preview utility layer
- Replace more of the ad hoc preview entity map with engine-owned runtime state instead of rebuilding partial runtime scenes per frame

---

## Track A: Runtime Unification

**Outcome:** the web preview becomes a thin adapter over `@clawgame/engine`, not a second game engine.

### Problems To Remove

- page-level movement, combat, projectile, and wave logic in `useGamePreview`
- preview-only entity shapes that bypass canonical engine types
- replay hooks recording against a UI runtime instead of the engine runtime
- export behavior that can drift from what the preview does

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

## Track B: Deterministic Playtest

**Outcome:** a reported bug can be replayed against the same simulation core that produced it.

### Tasks

- Record engine input plus periodic engine snapshots instead of UI-only state
- Wire replay playback into the active preview runtime instead of keeping it isolated in controls
- Add pause, scrub, frame-step, reset, and snapshot restore for time-travel debugging
- Save replay artifacts in a format AI debugging workflows can consume
- Add regression fixtures based on real replay captures

### Done When

- a replay can deterministically reproduce the same bug on the same scene/runtime version
- the playtest UI can restore prior state and step through frames
- replay artifacts can be attached to AI debugging flows and test cases

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
- Keep raw download/export as a fallback, not the primary definition of “publish”

### Done When

- a user can publish a game to a real target without hand-assembling output files
- published output behaves the same as the in-product preview for supported features
- the UI no longer overstates what “publish” currently means

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

- Refactor `useGamePreview.ts` so gameplay simulation is no longer owned there
- Expand `@clawgame/engine` to cover the gameplay paths currently duplicated in web preview
- Wire `ReplayControls` into actual runtime playback
- Remove or hide dead-end cloud preview affordances until backed by implementation
- Add engine-level tests for gameplay paths being migrated out of the web hook

### P1

- Replace placeholder sprite resolution in preview/editor with asset-backed rendering
- Make sprite-sheet outputs usable by the runtime
- Add at least one real publish target to the export flow
- Separate AI status states into configured, healthy, degraded, and fallback

### P2

- AI playtest mode that can consume replay artifacts and scene/runtime context
- richer publish targets
- hosted playtest sessions and sharable QA links

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

- [ ] Preview gameplay is driven by the canonical engine runtime rather than bespoke page-level simulation
- [ ] Replay playback and time-travel debugging operate on engine state, not isolated UI state
- [ ] Asset-backed rendering is the default path for editor and preview
- [ ] Publishing includes at least one real hosted target and behaves consistently with preview
- [ ] The UI no longer claims cloud preview or publish capabilities that are not actually implemented

---

## Next Up After M14

Once these exit criteria are met, resume the longer-term product program in [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md).

The important constraint is sequencing: do not restart broad platform expansion until runtime, playtest, and publish are operating on one truthful foundation.

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-11 17:58 UTC
