# ClawGame 1.0 — Known Issues

Last updated: 2026-08-23

## High Priority

| Issue | Status | Notes |
|-------|--------|-------|
| **Game Preview page never mounts the Phaser runtime** (found 2026-08-23, session dead-code-batch-1) | Open — pre-existing on main 7ff35a8, NOT caused by deletion batches | Repro: create project from Platformer template → Game Preview → "Loading game engine..." clears but `.game-preview-runtime-host` stays empty (0 children), no canvas, zero console errors. Start Game only sets state + focuses a canvas that does not exist. Root cause: `useGamePreview` session-mount effect (`useGamePreview.ts` ~L322) runs while `GamePreviewPage` still renders the `if (loading)` spinner branch (~L66), so `runtimeHostRef.current` is null → effect early-returns and its deps `[projectGenre, syncRPGState, handleSave, sceneKey]` never change after load → never retries. Verified identical on main by live branch switch under vite. Fix direction: gate the session effect on `!loading` or re-run when the host ref populates. Blocks roadmap P0 "Play button runs through phaser-runtime". |
| **Scene editor canvas: `body.setAllowGravity is not a function` per obstacle entity** (found 2026-08-23, same session) | Open — pre-existing on main 7ff35a8 | Repro: open Scene Editor on any template project with obstacles → console spams `Failed to sync editor entity "platform-*" TypeError` every ~2s from `PhaserSceneEditor.syncPhysicsBody` (setAllowGravity call). Phaser 3 Arcade Physics API invoked on a Phaser 4 body. Editor canvas still renders; physics sync silently no-ops for those entities. Fix direction: use the Phaser 4 equivalent (e.g. `body.setAllowGravity` replacement / `body.allowGravity` property) behind a capability check. |

## Medium Priority

| Issue | Status | Workaround |
|-------|--------|------------|
| `loader.atlasJSON()` not available in targeted Phaser 4 version — Atlas asset type compile produces a no-op `break` statement | Deferred | Use `atlas` type instead of `atlasJSON`; the engine compiles `atlas` correctly |
| Physics debug toggle requires active Phaser scene context — may not enable correctly if scene hasn't finished mounting | Open | Ensure scene is fully loaded before toggling |

## Low Priority

| Issue | Status | Notes |
|-------|--------|-------|
| Autosave hook runs even when data hasn't meaningfully changed (deep-equal not performed) | Open | Performance impact minimal for typical project sizes |
| Tilemap code generation produces basic layer arrays — doesn't use Phaser's built-in Tiled JSON importer yet | Open | Functional for hand-painted maps; Tiled import is a future enhancement |
| Thumbnail generation not yet implemented | Open | Placeholder only |

## Resolved

- ~~Entity component access via direct property access~~ → Switched to `getComp()` helper for Map-based components
- ~~`??` and `||` mixing TS5076 error in scene-compiler~~ → Parenthesized correctly
- ~~TS2339 on `LoaderPlugin.atlasJSON`~~ → Handled via `break` case; atlas type works correctly
- ~~Double `Phaser.Scene` class declaration in runtime~~ → Rewrote runtime cleanly
