# ClawGame Fix & Phaser 4 Migration — Phase 2

## Current State
- `packages/engine/` is clean — dead systems deleted, typecheck passes
- `apps/web/src/runtime/legacyCanvasSession.ts` has broken imports referencing deleted engine modules
- Need to fix the web app AND set up Phaser 4 runtime

## Errors to Fix in `apps/web/src/runtime/legacyCanvasSession.ts`

These imports from `@clawgame/engine` no longer exist:
1. `GameLoopCoordinator` — deleted
2. `DamageSystem` — deleted
3. `PreviewHUD` — deleted
4. `type HUDState` — deleted
5. `type MinimapEntity` — deleted
6. `type HUDTowerDefenseStats` — deleted

The file needs to be fixed to NOT import these. The actual game logic should be self-contained in the web app, not depend on deleted engine abstractions.

## Strategy

### Step 1: Fix `legacyCanvasSession.ts`
- Remove all imports of deleted engine modules
- Inline the minimal types needed (HUDState, etc.) directly in the file or a local types file
- Remove usages of `GameLoopCoordinator`, `DamageSystem`, `PreviewHUD` — the game loop and rendering are already manual in this file
- The actual TD game logic in `createTowerDefenseState`, `towerDefenseGameLoop`, etc. should work as-is since they're self-contained

### Step 2: Fix `phaserPreviewSession.ts` and `runPreviewRuntimeSession.ts`
- These import `LegacyCanvasPreviewSessionOptions` which no longer exists
- Fix the exports/types

### Step 3: Make `packages/phaser-runtime/` work with Phaser 4
- Run: `pnpm --filter @clawgame/phaser-runtime add phaser`
- Rewrite `ClawgamePhaserScene.ts` to extend `Phaser.Scene`
- Rewrite `ClawgamePhaserRuntime.ts` to create a real `Phaser.Game` instance
- Create a `TowerDefenseScene.ts` that ports the TD game logic

### Step 4: Wire the web app to use Phaser runtime
- Update `apps/web/src/runtime/index.ts` to make Phaser4 the default
- Update `phaserPreviewSession.ts` to actually boot Phaser

### Step 5: Verify
- `pnpm typecheck` must pass
- `pnpm test` must pass (or at least no new failures)

## Key Files to Read
- `apps/web/src/runtime/legacyCanvasSession.ts` — the broken file (834 lines)
- `apps/web/src/runtime/phaserPreviewSession.ts` — needs fixing
- `apps/web/src/runtime/runPreviewRuntimeSession.ts` — needs fixing
- `apps/web/src/runtime/index.ts` — runtime registry
- `packages/phaser-runtime/src/` — all files
- `packages/engine/src/index.ts` — see what's still exported
- `packages/engine/src/types.ts` — see current type exports
- `apps/web/src/utils/previewTowerDefense.ts` — the actual TD game logic to port

## Rules
- Don't touch `apps/api/`
- Use pnpm workspaces
- TypeScript strict mode
- After all changes: `pnpm typecheck` must pass clean
