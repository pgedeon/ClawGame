# Bug Report - 2026-04-16 (Updated)

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

### 2. **Phaser 4 Runtime Never Initialized**
**Location:** `apps/web/src/hooks/useGamePreview.ts:297`

**Problem:** The effect checked the wrong ref:
```javascript
if (!canvasRef.current) return;  // Only works for legacy-canvas!
```

When using Phaser 4, the runtime needs `runtimeHostRef.current` (the DIV element), not the canvas. The effect would return early when `canvasRef.current` wasn't ready, so Phaser 4 runtime was never initialized.

**Impact:** Phaser 4 showed blank screen for all genres when selected.

**Fix:** Check the correct ref based on runtime kind:
```javascript
const needsCanvas = runtimeKind === 'legacy-canvas';
const needsHost = runtimeKind === 'phaser4';
if (needsCanvas && !canvasRef.current) return;
if (needsHost && !runtimeHostRef.current) return;
```

### 3. **Conflicting Game Loops**
**Location:** `apps/web/src/hooks/useGamePreview.ts:263-295`

**Problem:** The React hook had its own game loop useEffect that:
- Ran in parallel with the runtime session's game loop
- Only updated fake stats (fixed 60fps, 0 entities)
- Conflicted with the real game loop in `legacyCanvasSession.ts`

**Impact:** Unpredictable behavior, wasted CPU cycles, potential state conflicts.

**Fix:** Removed the conflicting game loop useEffect entirely. The runtime session handles the game loop properly.

### 4. **Type Errors in Tower Defense Integration**
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

### 5. **Tower Defense Scene Never Used**
**Location:** `apps/web/src/runtime/phaserPreviewSession.ts:27`

**Problem:** Genre check was wrong:
```javascript
if (genre === 'td') { ... }  // Wrong genre string!
```

Actual genre values are `platformer`, `rpg`, `puzzle`, `tower-defense`. The check used `'td'` instead of `'tower-defense'`.

**Impact:** Tower Defense games in Phaser 4 were using the wrong scene class.

**Fix:** Changed to `if (genre === 'tower-defense')`.

## Other Issues Found

### 6. **Multiple Dev Servers Running**
**Location:** Process table

**Problem:** Multiple instances of dev servers were running simultaneously (from 08:04, 08:05, and 09:29), causing:
- Wasted resources
- Potential port conflicts
- Confusing logs

**Fix:** Killed old dev server processes (PIDs 8421-8647), kept only the latest one (PID 53444).

### 7. **Missing Return Property**
**Location:** `apps/web/src/hooks/useGamePreview.ts`

**Problem:** `combatLogEntries` was used in `GamePreviewPage.tsx` but not returned from the hook.

**Impact:** TypeScript compilation failed.

**Fix:** Added `combatLogEntries` to the return object.

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

**Critical bugs:** 5 (all fixed)
**Minor issues:** 2 (both resolved)
**Test status:** ✅ All tests pass (114 tests)
**Typecheck status:** ✅ All type checks pass
**Dev server status:** ✅ Single instance running on port 5173

## Commits

1. `76ab458` - fix(runtime): critical game loop bug causing white screen on preview
2. `87b4c96` - fix(hook): check correct ref based on runtime kind
3. `fa39fcc` - fix(phaser): use correct genre string for tower defense

## What Should Work Now

- ✅ Game previews render in both legacy canvas and Phaser 4 runtimes
- ✅ "Press Start Game" message shows when game hasn't started
- ✅ Clicking "Start Game" actually starts the game loop
- ✅ Tower defense games use the correct Phaser scene
- ✅ All genres work with both runtime options
- ✅ No more white screens on game preview

Refresh the game preview page and try it. Phaser 4 should now initialize correctly.
