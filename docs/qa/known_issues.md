# ClawGame 1.0 — Known Issues

Last updated: 2026-04-24

## High Priority

None known.

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
