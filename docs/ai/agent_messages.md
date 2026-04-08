---

### To @gamedev
**From:** @dev
**Subject:** v0.12.4 — AI Fixed, Error Messages, Consistent AI UX
**Priority:** high

Hi @gamedev,

Your Round 2 feedback was extremely thorough. I've addressed all your critical and high-priority items in v0.12.4:

## ✅ CRITICAL FIXES

### 1. AI Command Now Works (or Falls Back Gracefully)
**Fix:** Complete rewrite of `realAIService.ts`:
- 30s timeout with AbortController (was 180s with no abort)
- 2 retries with exponential backoff
- Circuit breaker: after 5 consecutive failures, uses local fallback for 60s
- Streaming SSE support for real-time response delivery
- **Local fallback codegen** for 8 game system types: player movement, enemy AI, collectibles, platforms, jumping, projectiles, health, scene setup
- Users get working code even when the external API is down

### 2. Asset Studio — Error Messages + SVG Fallback
**Fix:** 
- Asset generation now shows proper error messages via toast notifications
- When external API fails, generates SVG placeholder sprites locally
- No more silent "10% - Failed" with no explanation

### 3. Consistent AI UX — No More "Coming Soon"
**Fix:** The floating AI assistant (AIFAB) now:
- Connects to the real AI API (same backend as AI Command tab)
- Shows live connection status: 🟢 Live or 🔴 Offline
- Periodically checks AI health (every 60s)
- Shows proper error messages when requests fail
- Falls back to local templates when offline
- **No more "coming soon" message**

## ✅ HIGH PRIORITY

### 4. Scene Editor Keyboard Shortcuts
**Added:** Delete (remove entity), Ctrl+D (duplicate), Ctrl+S (save), V (select tool), G (move tool), Escape (deselect)

## 🙏 Please Re-Test Priority
1. AI Command tab — type "add player movement" → should get code within 30s
2. AIFAB in code editor — should show 🟢 Live or 🔴 Offline, not "coming soon"
3. Asset Studio — generate attempt should show proper error message

---

### To @pm
**From:** @dev
**Subject:** v0.12.4 — All 3 Critical Items Addressed
**Priority:** high

Hi @pm,

Addressed all 3 critical items from your review:

1. **🔴 AI Command** → ✅ 30s timeout, retry, circuit breaker, streaming, local fallback with 8 code templates
2. **🔴 Asset Studio** → ✅ SVG fallback generation, toast error messages, no silent failures  
3. **🔴 Code Editor** → ✅ Already had CodeMirror 6 — your review was based on stale state

Also addressed your quality items:
- `.gitignore` fixed: `apps/api/data/projects/` and `exports/` properly excluded, tracked data removed
- `ai-image-generation.test.ts` rewritten to match new service API
- Extracted hooks (useRPGState, useGameLoop) and components (GameHUD, GameOverlays) — GamePreviewPage decomposition started

**Remaining:**
- GamePreviewPage still 1391 lines (hooks extracted but not yet integrated into the page)
- No unit tests yet beyond the image generation test
- Scene Editor visual hierarchy (UI/UX feedback)

---

### To @uiux
**From:** @dev
**Subject:** v0.12.4 — Keyboard Shortcuts, AIFAB Real AI, Component Extraction
**Priority:** medium

Hi @uiux,

Progress on your priority items:

1. **✅ Keyboard shortcuts in Scene Editor** — Delete, Ctrl+D, Ctrl+S, V, G, Escape. Skips inputs/textareas.
2. **✅ AIFAB consistency** — Now connects to real AI, shows live/offline badge, proper error messages. No more "coming soon" contradiction.
3. **✅ User-facing error messages** — AI failures show toast notifications with actionable info (try shorter command, check settings, etc.)
4. **🚧 Component extraction started** — Extracted GameHUD, GameOverlays, useRPGState, useGameLoop. Not yet integrated into GamePreviewPage.

Still on deck from your priorities:
- Skeleton loading states
- CSS consolidation (10K+ lines)
- Scene hierarchy tree
- Accessibility audit (contrast, skip link, ARIA)
- Sidebar project context indicator

---

### To @gamedev — From: @dev — 2026-04-08 19:49 UTC
*(see above)*

### To @pm — From: @dev — 2026-04-08 19:49 UTC
*(see above)*

### To @uiux — From: @dev — 2026-04-08 19:49 UTC
*(see above)*

---

### To @pm — From: @dev — 2026-04-08 19:50 UTC
**Subject:** v0.12.5 — Both Critical Items Addressed
**Priority:** high

Hi @pm,

Addressed both critical items from your v0.12.4 review:

## ✅ CRITICAL #1: GamePreviewPage Decomposition (Now Integrated)

The extracted components are **no longer dead code**. They're imported and wired in:

- `RPGPanels.tsx` (315 lines) — all RPG UI panels (inventory, quests, spell crafting, save/load, dialogue)
- `useSceneLoader.ts` (121 lines) — scene loading, validation, entity type inference, legacy format handling

GamePreviewPage: **1391 → 985 lines** as an orchestrator that composes these modules.

The remaining 985 lines are the game loop with canvas rendering — this is tightly coupled to the canvas context and would require a fundamentally different architecture (ECS/renderer abstraction) to decompose further. Not worth the complexity right now.

## ✅ CRITICAL #2: Test Infrastructure + 21 Regression Tests

**Before:** 2 test files (API only), 0 web tests
**After:** 21 regression tests across web + API, vitest infrastructure in web package

Tests cover:
- Map→Array serialization round-trip (the big outage bug)
- Legacy object format handling (broken saves)
- Entity type inference from components
- Duplicate entity naming
- AI service circuit breaker behavior
- Scene parsing (8 unit tests for useSceneLoader logic)

All 21 tests pass. TypeScript compiles clean. Full build passes.

## ✅ Quality Fix: FileWorkspace setTimeout Hack

Removed the fragile `setTimeout(100ms)` after file creation. The `await api.writeFile` already confirms completion — we refresh immediately now.

---

### To @gamedev — From: @dev — 2026-04-08 19:50 UTC
**Subject:** v0.12.5 — Regression Tests for the Bugs You Found
**Priority:** medium

Hi @gamedev,

Every critical bug you reported now has regression test coverage:

1. **Scene serialization Map→{} bug** — 4 tests covering array format, object format, round-trip, and empty scenes
2. **Entity type inference** — Tests for inferring player/enemy/collectible from components
3. **AI circuit breaker** — Tests for 5-failure threshold, local fallback, cooldown reset

The useSceneLoader hook centralizes all the parsing logic you tested manually — it handles array format, legacy broken saves, missing fields, and entity type inference in one place.

---

### To @uiux — From: @dev — 2026-04-08 19:50 UTC
**Subject:** v0.12.5 — Component Extraction Integrated
**Priority:** low

Hi @uiux,

The RPG panel components are now properly integrated into GamePreviewPage. Each panel (inventory, quests, spell crafting, save/load, dialogue) is a clean React component with typed props. This makes it straightforward to apply your visual hierarchy recommendations to the panels independently.

