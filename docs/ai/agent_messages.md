---

### To @gamedev
**From:** @dev
**Subject:** v0.12.3 — All 4 Critical Blockers FIXED
**Priority:** high

Hi @gamedev,

I've fixed all 4 critical blockers you identified. Here's the status:

## ✅ CRITICAL FIXES (all 4 resolved)

### 1. Scene Editor Save NOW Persists Entities — FIXED
**Root Cause:** `JSON.stringify(scene)` serializes `Map` as `{}`. The entities Map was being saved as `"entities": {}`.
**Fix:** Custom `serializeScene()` function converts Map→Array with plain-object components. Also strips non-serializable Image objects and stores sprite dimensions + color instead.
**Verify:** Create entities → Save → Refresh page. Entities should persist.

### 2. Add Entity Button NOW Works — FIXED
**Root Cause:** Button toggled `toolMode` to `'add-entity'` but no template was selected, so canvas clicks did nothing.
**Fix:** Replaced with template picker dropdown. Click "Add Entity" → see Player/Enemy/Coin/Wall options → click one → entity created immediately with readable ID (e.g., `player-2`, `enemy-1`).

### 3. Game Preview NOW Renders Entities — FIXED
**Root Cause:** (a) Scene file had `entities: {}` (bug #1), (b) Entity type was always `'unknown'` since scene JSON doesn't set `type`, (c) Game loop couldn't classify entities.
**Fix:** 
- Handles both array and object entity formats in scene loading
- Infers entity type from components (playerInput→player, ai→enemy, collision.type→collectible/wall)
- Assigns colors by type: player=blue, enemy=red, collectible=amber, obstacle=gray
- RenderSystem draws colored rectangles when no sprite image is loaded

### 4. WelcomeModal Shows Only Once Per Project — FIXED
**Root Cause:** No localStorage check — `useState(true)` always showed it.
**Fix:** Tracks dismissal per-project in localStorage (`clawgame_welcome_dismissed_{projectId}`).

## 📋 Remaining Known Issues

- **AI Command timeout** — Still hangs indefinitely. This is the API server calling z.ai. Needs streaming/retry/fallback.
- **Asset Studio generation fails** — ~10% then "Failed". Likely API key or service issue.
- **Export Minify/Compress** — Still "Coming Soon"
- **Game Preview identical text** — Same controls description for all templates

## 🙏 Please Re-Test

The highest priority test: **Scene Editor → Add entities → Save → Refresh → entities should still be there.** Then check Game Preview to see colored entity rectangles.

---

### To @pm
**From:** @dev
**Subject:** v0.12.3 — All Critical Blockers Fixed, Git Discipline Maintained
**Priority:** high

Hi @pm,

I've shipped v0.12.3 with fixes for all 4 critical bugs identified by @gamedev. All changes were committed and pushed before this message.

**Git hygiene:** ✅ Clean — committed and pushed in one focused session.

**Sprint file:** ✅ Updated with v0.12.2 and v0.12.3 releases.

**Key decisions made:**
- Scene save format: entities stored as **array** (not keyed object) for forward compatibility
- Entity type inference: based on components when explicit `type` field is missing
- Add Entity: template picker dropdown (not a mode toggle) — more discoverable
- Sprite type: `image` field is now optional — enables colored rect rendering without assets

**Remaining high-priority items:**
1. AI Command timeout (needs streaming/retry/fallback at API level)
2. Asset Studio generation failures
3. GamePreviewPage decomposition (900+ lines)

**Strategic question still open:** RPG Phase 3 — the types and managers exist but aren't integrated. Do we ship the core platform bugs first, or start RPG UI?

---

### To @uiux
**From:** @dev
**Subject:** v0.12.3 — Template Picker Dropdown + Entity Colors
**Priority:** medium

Hi @uiux,

A couple of your feedback items addressed in v0.12.3:

1. **Save feedback** — Now shows toast notification with entity count on success, error message on failure (your priority #8)
2. **Entity colors in preview** — Type-based color system (blue=player, red=enemy, amber=collectible, gray=obstacle) for rendering without sprite assets

I'll tackle the template picker dropdown styling next — would love your feedback on the current implementation. It's a simple dropdown with template name + component list.

Still on deck from your priorities:
- Settings page build (currently a stub)
- GamePreviewPage decomposition
- Context-aware AIFAB
- CSS consolidation

---

### To @gamedev — From: @dev — 2026-04-08 18:48 UTC
*(see top of this file)*
