# Game Developer Feedback

**Last Session:** 2026-04-08 17:03 UTC
**Session Type:** Game Creation Test (Round 2 — retest after prior session)

---

## 🎮 What I Tried To Build

**Crystal Caverns** — a platformer where you explore crystal-filled caves, collect gems (blue=10pts, green=25pts, red=50pts), and avoid cave creatures. Each level goes deeper underground with harder enemies and more valuable crystals.

I also tested the pre-existing **Dungeon Crawler** project to compare a "developed" project vs a fresh one.

---

## ✅ What Worked

1. **Project creation** — Smooth flow. Named project, selected Platformer template, picked genre/art style, added description. Created instantly and redirected to project overview. All fields persisted correctly.

2. **Dashboard** — Clean, well-organized. Shows all projects with metadata (genre, art style, date, status). Quick Actions panel is intuitive. Existing projects are easy to find.

3. **Scene Editor** — Functional. Added entities (Player, Coin, Enemy, Wall) with the Add Entity dropdown. Properties panel shows transform (x, y, rotation, scale) and components (collision, transform). Can add/remove components (+Sprite, +Movement, +AI, +Collision). Grid and snap-to-grid options work. Entity list updates correctly.

4. **Code Editor** — File tree works. Can browse assets/, docs/, scenes/, scripts/ folders. Quick Start buttons ("Add Enemy AI", "Create Scene", "Add Player Code") open relevant files. New File / New Folder buttons available.

5. **Game Preview** — Start screen renders correctly with game title, controls instructions, and Start button. Game canvas renders and runs. Shows "Playing" status with Pause button. Keyboard input (WASD) is accepted by the game canvas.

6. **Export** — Export page shows correctly with standalone HTML option, embed assets checkbox. The export endpoint works (verified in API logs, generated 16KB HTML file).

7. **Settings** — Clean settings page with theme toggle (light/dark), engine configuration, project management, and keyboard shortcuts reference.

8. **Navigation** — Top nav with project name, tab-based project sections, breadcrumb-style back navigation. All links work and route correctly.

---

## ❌ What Was Broken

1. **AI Command — TIMEOUT / UNRESPONSIVE** — AI Command tab
   - Steps to reproduce: Open AI Command tab → Type any prompt (e.g., "Add double jump to the player") → Click Send → Wait
   - Expected: AI generates code within 10-30 seconds
   - Actual: Gets stuck on "Analyzing your request... Processing... Generating response..." indefinitely. Confirmed in API logs: `timeout of 180000ms exceeded`. The z.ai API endpoint is reachable (returns 401 without auth) but requests never complete.
   - Tested twice with different prompts. Same result both times.
   - **This is the #1 blocking issue.** The core value proposition ("Build Games with AI") is completely non-functional.

2. **Asset Studio — GENERATION FAILS** — Asset Studio tab
   - Steps to reproduce: Go to Asset Studio → Select "Sprite" type → Select "Pixel Art" style → Type "Blue crystal gem, pixel art style, 32x32" → Click "Generate Asset"
   - Expected: AI generates a sprite asset
   - Actual: Progress bar shows "10% - Failed". No error message shown to user.
   - Root cause: `OPENROUTER_API_KEY` is missing from `.env`. The `aiImageGenerationService.ts` uses OpenRouter's `qwen/qwen3.6-plus:free` model but the key is not configured. Asset generation silently fails.
   - **No user-visible error message** — the UI just says "Failed" with no explanation.

3. **Floating AI Assistant — CONTRADICTORY STATE** — Code Editor
   - Steps to reproduce: Click "Open AI assistant" floating button in Code Editor
   - Expected: Same AI experience as AI Command tab (connected to real AI)
   - Actual: Shows "Full AI capabilities coming soon" message
   - This directly contradicts the AI Command tab which shows "Real AI Connected" with model info. Confusing — which one is telling the truth?

4. **Scene Editor Canvas — NO VISUAL ENTITIES** — Scene Editor
   - Steps to reproduce: Create a project → Open Scene Editor → Add entities
   - Expected: See colored rectangles or placeholder sprites for player, coin, etc.
   - Actual: Canvas appears mostly empty. Entities are listed in the sidebar (player-1, coin-1) but there's no clear visual feedback on the canvas for what's placed where.
   - Note: The entities exist in data (confirmed via API), but the canvas rendering is unclear for a new user.

---

## 😕 What Was Confusing

1. **No onboarding / first-run experience** — A new user lands on the dashboard with 5 existing projects already visible. No tutorial, no "Create your first game" prompt. The "Pro tip" about ⌘K is nice but easy to miss.

2. **Inconsistent AI status across the app** — AI Command tab says "Real AI Connected" with model details. The floating AI assistant says "coming soon". Which is it? A user wouldn't know.

3. **Controls shown don't match template** — My Platformer game's preview shows "WASD to move, SPACE to shoot. Defeat enemies and collect items!" and also mentions "Collect runes to win", "TAB to talk to NPCs", "I: Inventory, J: Quests, C: Craft". This looks like RPG controls, not platformer controls. The template isn't customized per genre.

4. **No way to configure AI settings from the UI** — Settings page has no section for AI API configuration. Users must edit `.env` files manually. This is fine for devs but not for the "build games with AI" target audience.

5. **"AI-Ready" badge meaning unclear** — Project creation shows "AI-Ready" badge on templates. What does this mean? That AI can generate code for it? That it's been tested with AI? The label is vague.

6. **Code editor shows template code but no way to actually modify game behavior** — The player.ts file has placeholder comments like "Handle player input". A non-technical user wouldn't know what to do with this. No visual scripting alternative exists.

7. **No undo/redo in scene editor** — Added entities but no way to undo. No keyboard shortcuts listed.

---

## 💡 Feature Requests (Priority Order)

1. **[CRITICAL] Fix AI Command API connectivity** — The AI is the entire value proposition. Without it working, this is just a canvas with placeholder code. Debug the z.ai timeout, add a fallback model, or add proper error handling so users aren't stuck waiting 3 minutes.

2. **[CRITICAL] Add user-visible error messages** — When asset generation or AI commands fail, show a real error: "AI service unavailable — check your API key configuration" instead of "Failed" or an infinite spinner.

3. **[HIGH] Template-specific game behavior** — When I pick "Platformer" template, the preview should have platformer controls (jump, move, collect), not RPG controls (inventory, quests, crafting). Each template should generate genre-appropriate game logic.

4. **[HIGH] Visual entities in Scene Editor** — Show colored rectangles, icons, or placeholder sprites for each entity type (player = blue square, enemy = red triangle, coin = yellow circle, wall = gray block). The canvas needs visual feedback.

5. **[HIGH] AI API key configuration in Settings** — Add a settings section where users can enter their OpenRouter/z.ai API key without editing .env files.

6. **[MEDIUM] First-run tutorial / onboarding** — A step-by-step guide for new users: "1. Create a project → 2. Describe your game to AI → 3. Preview and test → 4. Export"

7. **[MEDIUM] Undo/Redo in Scene Editor** — Basic undo/redo for entity placement and property changes.

8. **[MEDIUM] Consistent AI assistant across the app** — Either the floating assistant should use the same real AI as the AI Command tab, or remove it until it's ready. Don't show two contradictory AI states.

9. **[LOW] Drag-and-drop asset placement** — The scene editor says "Drag assets from left panel to canvas" but there are no assets to drag. Should work with generated assets.

10. **[LOW] Code editor syntax highlighting** — The textarea-based editor is functional but lacks syntax highlighting, line numbers, and code completion. A proper code editor (Monaco, CodeMirror) would improve the experience significantly.

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Dashboard is clean and professional. Nice layout. |
| Onboarding | 2 | No tutorial, no first-run guide. Existing projects create confusion. |
| Project Creation | 5 | Smooth, intuitive, all fields work. Great template selection. |
| Editor Usability | 3 | Scene editor functional but visually empty. Code editor is basic. |
| Game Preview | 3 | Renders and runs, but controls/behavior don't match the template chosen. |
| AI Features | 1 | **Completely broken.** AI Command times out, Asset Studio fails, floating assistant says "coming soon". |
| Asset Management | 2 | UI looks good but generation fails silently. No assets to work with. |
| Export | 4 | Works correctly. Clean UI. Standalone HTML export is great. |
| Settings | 3 | Clean but missing AI API key config. No way to fix AI issues from UI. |
| Overall | 2.5 | Strong foundation, but the core AI promise is broken. Without AI, this is a UI shell. |

---

## 📸 Screenshots

See browser screenshots taken during testing:
- Dashboard with project list
- Project creation form (Crystal Caverns)
- Scene Editor with entities and properties panel
- Code Editor with file tree and Quick Start buttons
- AI Command stuck on "Processing..."
- Asset Studio showing "10% - Failed"
- Game Preview running (colored rectangles on canvas)
- Export page
- Settings page

---

## 🔧 Technical Details (for @dev)

### AI Command Failure
- API endpoint: `POST /api/projects/:id/ai/command`
- Backend service: `realAIService.ts`
- Target API: `https://api.z.ai/api/coding/paas/v4/chat/completions`
- Timeout: 180000ms (3 min) — always exceeded
- API health check alone takes 28+ seconds
- Error in logs: `timeout of 180000ms exceeded`

### Asset Generation Failure
- Service: `aiImageGenerationService.ts`
- Model: `qwen/qwen3.6-plus:free` via OpenRouter
- Missing: `OPENROUTER_API_KEY` in `apps/api/.env`
- Current `.env` only has: `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`
- No user-facing error — just "Failed"

### Recommended Immediate Fixes
1. Switch AI provider to a working endpoint or add request timeout + error feedback at 30s
2. Add `OPENROUTER_API_KEY` to `.env` or remove OpenRouter dependency from asset generation
3. Add error states to UI (toast notifications, inline error messages)
4. Fix template-specific game controls in preview
