# ClawGame Engine Cleanup + Phaser 4 Migration

## Goal
Clean up the ClawGame engine package, remove dead code, wire up working systems, and migrate the runtime to Phaser 4.

## Current Architecture

### What's actually used (the web app)
The actual tower defense game runs entirely in the **web app** (`apps/web/`):
- `apps/web/src/utils/previewTowerDefense.ts` — ALL game logic (movement, towers, enemies, waves, projectiles)
- `apps/web/src/runtime/legacyCanvasRuntime.ts` — the active runtime descriptor
- `apps/web/src/runtime/legacyCanvasSession.ts` — canvas rendering loop
- `apps/web/src/runtime/phaserPreviewSession.ts` — prepares Phaser bootstrap but never actually runs Phaser

### What's dead in `packages/engine/`
These systems exist but are **NOT wired into Engine.ts's game loop**:
- `systems/DamageSystem.ts` — constructed but never has `.update()` called
- `systems/EngineReplaySystem.ts` — never instantiated in Engine.ts
- `systems/PreviewHUD.ts` — never instantiated in Engine.ts
- `systems/GameLoopCoordinator.ts` — complete game loop, but Engine.ts has its own `gameLoop()`
- `systems/AnimationStateMachineSystem.ts` — parallel to AnimationSystem, redundant
- `systems/AISystem.ts` — dumb patrol/chase; the behavior/ system does the same better but is also unwired

### What's scaffolded in `packages/phaser-runtime/`
- `ClawgamePhaserRuntime.ts` — throws "not mounted" error
- `ClawgamePhaserScene.ts` — throws "not wired" error
- `buildPreviewBootstrap.ts` — ✅ this actually works, converts canonical scenes to Phaser bootstrap format
- `types.ts` — ✅ good type definitions for Phaser entities

### The behavior system (`packages/engine/src/behavior/`)
- `BehaviorExecutor.ts` — full behavior tree executor, never wired into Engine.ts
- `BehaviorPresets.ts` — patrol/chase/guard/alert presets
- `AIGraphGenerator.ts` — generates behavior graphs from descriptions
- `GenreKits.ts` — genre-specific behavior kits
- `NavigationSystem.ts` — waypoint following

## Tasks

### Phase 1: Clean up `packages/engine/`

**DELETE these files** (they're dead weight):
1. `systems/EngineReplaySystem.ts` + its test files
2. `systems/PreviewHUD.ts` + its test files  
3. `systems/GameLoopCoordinator.ts` + its test files
4. `systems/DamageSystem.ts` + its test files (DamageSystem.update() is never called)
5. `systems/AnimationStateMachineSystem.ts` + its `.debug.ts` + test files
6. `systems/TowerDefensePlugin.ts` + its test files (the real TD logic is in the web app)

**DELETE the behavior/ directory** — it's a complete parallel AI system that was never wired in:
7. `behavior/BehaviorExecutor.ts`
8. `behavior/BehaviorPresets.ts`
9. `behavior/AIGraphGenerator.ts`
10. `behavior/GenreKits.ts`
11. `behavior/NavigationSystem.ts`
12. `behavior/types.ts`
13. `behavior/index.ts`
14. All behavior test files

**SIMPLIFY EventBus** — remove unused methods:
15. Remove: `createScope()`, `validate()`, `getStats()`, `getActiveEvents()`, `getListenerCount()`, `totalListenerCount()`, `setMaxHistory()`, `getMaxHistory()`, `setMuted()`, `clear()` (backward compat wrapper), `history` getter, `listenerCount()`, `muted` getter, `Subscription` type alias, `getHistory()`, `clearHistory()`, `setHistoryEnabled()`

**CLEAN UP types.ts**:
16. Remove `AnimationState`, `AnimationTransition`, `AnimationCondition`, `AnimationStateMachineComponent` (state machine was deleted)
17. Remove `EngineErrorPayload`, `AnimationStateChangeEvent` (unused event types)
18. Remove `toRuntimeEntity`, `toSerializableEntity`, `toRuntimeScene`, `toSerializableScene` conversion functions if they're only used by deleted systems

**CLEAN UP Engine.ts**:
19. Remove imports of deleted systems
20. Remove construction of DamageSystem
21. Keep: InputSystem, MovementSystem, RenderSystem, PhysicsSystem, CollisionSystem, AnimationSystem, ProjectileSystem, AISystem
22. Wire DamageSystem back in properly OR remove it entirely

**CLEAN UP index.ts and systems/index.ts**:
23. Remove all re-exports of deleted modules

### Phase 2: Make `packages/phaser-runtime/` actually work with Phaser 4

1. Add `phaser` as a dependency: `pnpm --filter @clawgame/phaser-runtime add phaser`
2. Rewrite `ClawgamePhaserScene.ts` to extend `Phaser.Scene`:
   - In `preload()`: load assets from the bootstrap data
   - In `create()`: create sprite entities from bootstrap data, set up physics bodies
   - In `update()`: run game loop logic (movement, collisions, etc.)
3. Rewrite `ClawgamePhaserRuntime.ts` to:
   - Create a `Phaser.Game` config
   - Register the ClawgamePhaserScene
   - Mount into a DOM element
   - Actually boot the game (remove the `throw new Error`)
4. Keep `buildPreviewBootstrap.ts` as-is — it's already correct
5. Keep `types.ts` as-is — already correct
6. Set `PHASER4_RUNTIME_DESCRIPTOR.available = true` and `experimental = false`

### Phase 3: Wire TD game logic into Phaser

The real TD game logic lives in `apps/web/src/utils/previewTowerDefense.ts`. For the Phaser runtime:
1. Create a `TowerDefenseScene` that extends `ClawgamePhaserScene`
2. Port the wave spawning, enemy movement (waypoint following), tower firing, projectile physics from `previewTowerDefense.ts` into Phaser's update loop
3. Use Phaser's built-in physics (Arcade) instead of manual collision
4. Use Phaser groups for enemies, towers, projectiles

### Phase 4: Clean up tests

1. Delete test files for removed systems
2. Run `pnpm test` and `pnpm typecheck` to verify everything passes
3. Fix any broken imports

## Important Notes

- The project uses `pnpm` workspaces
- TypeScript strict mode
- Test runner: vitest
- The `apps/web/` changes should be minimal — focus on `packages/engine/` and `packages/phaser-runtime/`
- Don't touch `apps/api/` at all
- After cleanup, `pnpm typecheck` and `pnpm test` must pass
