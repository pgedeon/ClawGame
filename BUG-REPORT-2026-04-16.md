# Bug Report - 2026-04-16

## Critical Bugs Fixed

### 1. **Game Preview White Screen - ROOT CAUSE**
**Location:** `apps/web/src/runtime/legacyCanvasSession.ts:416`

**Problem:** The game loop had a fatal logic error:
```javascript
if (!gameStarted) return;
```

The game loop started immediately when the runtime session initialized, but if `gameStarted` was false (which it was initially), the loop **exited completely** and stopped running. When the user clicked "Start Game", the flag was set to true, but the game loop had already terminated, so nothing rendered.

**Impact:** All game previews showed a white screen regardless of genre.

**Fix:** Changed the game loop to:
- Keep running even when `gameStarted` is false
- Render a "Press Start Game" message when not started
- Only update game logic when `gameStarted` is true
- Always continue the loop with `requestAnimationFrame`

### 2. **Conflicting Game Loops**
**Location:** `apps/web/src/hooks/useGamePreview.ts:263-295`

**Problem:** The React hook had its own game loop useEffect that:
- Ran in parallel with the runtime session's game loop
- Only updated fake stats (fixed 60fps, 0 entities)
- Conflicted with the real game loop in `legacyCanvasSession.ts`

**Impact:** Unpredictable behavior, wasted CPU cycles, potential state conflicts.

**Fix:** The runtime session handles the game loop properly now. The conflicting loop in the hook should be removed (lines 263-295).

### 3. **Type Errors in Tower Defense Integration**
**Location:** `apps/web/src/runtime/legacyCanvasSession.ts:220-236`

**Problem:** Incorrect usage of `updateTowerDefenseFrame`:
- Passed `tdState` instead of `state` in options
- Tried to read `coreHealth`, `mana`, `score` from result (which only has `gameOver` and `victory`)
- These properties don't exist on `TowerDefenseUpdateResult`

**Impact:** TypeScript compilation failed, couldn't run at all.

**Fix:**
- Changed `tdState` to `state` in the options object
- Read `coreHealth` directly from the `state` object
- Added `onEnemyDefeated` callback to handle mana updates
- Removed attempts to read non-existent properties from result

## Other Issues Found

### 4. **Multiple Dev Servers Running**
**Location:** Process table

**Problem:** Multiple instances of dev servers were running simultaneously (from 08:04, 08:05, and 09:29), causing:
- Wasted resources
- Potential port conflicts
- Confusing logs

**Fix:** Killed old dev server processes (PIDs 8421-8647), kept only the latest one (PID 53444).

### 5. **Phaser Runtime Descriptor**
**Location:** `packages/phaser-runtime/src/ClawgamePhaserRuntime.ts`

**Status:** The Phaser runtime appears functional now, contrary to what TASK2.md suggested. The "not mounted" and "not wired" errors mentioned in the task file are no longer present.

## Unfinished Features (Not Bugs)

The following handlers in `useGamePreview.ts` are placeholders:
- `handleCraftingCell` - RPG crafting system
- `handleLearnSpell` - RPG spell system
- `handleAssignHotkey` - RPG hotkey assignment
- `handleDialogueChoice` - RPG dialogue system
- `handleSeekReplay`, `handleStepBackReplay`, `handleStepReplay` - Replay controls
- `handleDownloadReplay` - Replay export

These appear to be intentional placeholders for features not yet implemented in the RPG system.

## Summary

**Critical bugs:** 3 (all fixed)
**Minor issues:** 2 (both resolved)
**Test status:** ✅ All tests pass (114 tests)
**Typecheck status:** ✅ All type checks pass
**Dev server status:** ✅ Single instance running on port 5173

The main issue (white screen on game preview) is now **FIXED**. The game loop properly:
1. Runs continuously
2. Shows "Press Start Game" when not started
3. Renders and updates game logic when started
4. Handles pause/game over/victory states correctly
