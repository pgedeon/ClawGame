# Game Developer Feedback

**Last Session:** 2026-04-08 18:22 UTC
**Session Type:** Full Platform Test — Multi-Template, Multi-Feature
**Previous Session:** 2026-04-08 14:30 UTC (initial smoke test)
**Projects Created:** Pixel Quest (Platformer), Dungeon Crawler (Top-Down Action)

---

## 🎮 What I Tried To Build

**Pixel Quest** — A retro platformer where a pixel knight collects gems across 5 levels while avoiding traps and enemies (Platformer template, pixel art).

**Dungeon Crawler** — A top-down action game where you navigate dark dungeons, fight monsters, and collect loot (Top-Down Action template, pixel art).

I attempted the full workflow for both projects: create → scene editor → add entities → modify components → AI command → code editor → game preview → asset generation → export.

---

## ✅ What Worked

1. **Dashboard** — Clean, fast loading, shows all projects with genre/tags/status. Project list updates immediately after creation.
2. **Project Creation** — Smooth flow: name, template selection (Platformer/Top-Down/Dialogue), genre dropdown, art style radio buttons, description. "Create" button routes to project overview instantly.
3. **Template system** — Different templates produce different starter entities: Platformer gives player+platforms+coin (4 entities), Top-Down Action gives player+enemy+powerup (3 entities). Smart defaults.
4. **Scene Editor — Entity selection** — Clicking an entity in the list shows full properties panel: ID field, Transform (x/y/rotation/scale), Components, Actions (Delete/Duplicate).
5. **Scene Editor — Component system** — Entities get template-appropriate components (Platformer: movement+sprite+physics, Top-Down: movement+sprite). Adding new components (+AI, +Collision) works and updates UI immediately. Already-added components get disabled buttons (correct UX).
6. **Scene Editor — Duplicate** — Successfully duplicates an entity with same components and offset position (400,300 → 432,332).
7. **Scene Editor — Zoom/Grid** — Zoom in/out, Show Grid, Snap to Grid all work correctly.
8. **Code Editor — File tree** — Shows proper project structure (assets/, docs/, scenes/, scripts/) with file icons. Expanding folders reveals generated files.
9. **Code Editor — Quick Start buttons** — "Add Enemy AI", "Create Scene", "Add Player Code" buttons are helpful for new users.
10. **Settings page** — Theme toggle (light/dark), AI model selector (GLM-4.5 Flash, GLM-5, GPT-4o, Claude Sonnet 4), keyboard shortcuts reference. Clean and functional.
11. **Navigation** — Top nav with project name, breadcrumbs, tab-based section navigation. Consistent across all pages.
12. **AI Assistant floating button** — Always accessible in bottom-right corner.

---

## ❌ What Was Broken

### 🔴 CRITICAL (Blocks game creation)

1. **Scene Editor Save does NOT persist entities** — Scene Editor
   - Steps to reproduce: Open any project → Scene Editor → click Save → check scene JSON on disk (`data/projects/<id>/scenes/main.json`)
   - Expected: Entities (position, components, etc.) saved to scene file
   - Actual: Scene file has `"entities": {}` — always empty. Entities exist only in React state, lost on page refresh.
   - Impact: **ALL scene editor work is ephemeral.** Users lose everything on reload.

2. **AI Command never responds** — AI Command tab
   - Steps to reproduce: Open AI Command tab → type any prompt → click Send
   - Expected: AI generates response and/or code within seconds
   - Actual: Status shows "Processing... Generating response..." forever. Backend `POST /api/projects/:id/ai/command` hangs indefinitely — the external AI API call (z.ai) never returns or times out with no fallback.
   - Impact: **Core "AI-Native" feature is non-functional.** The platform's main selling point doesn't work.

3. **Add Entity button does nothing** — Scene Editor
   - Steps to reproduce: Scene Editor → click "Add Entity" button
   - Expected: New entity added to scene (or a dialog to configure it)
   - Actual: Nothing happens. No error, no new entity. Button appears functional but is a no-op.
   - Impact: Users can only work with template-generated entities; can't create custom ones.

4. **New File dialog doesn't create files** — Code Editor
   - Steps to reproduce: Code Editor → click "➕ New File" → enter path `scripts/enemy.ts` → click "Create"
   - Expected: File created on disk and appears in file tree
   - Actual: Dialog closes, no file created on disk, file tree unchanged.
   - Impact: Users cannot create new code files. Stuck with only template-generated ones.

### 🟡 MODERATE (Degrades experience)

5. **Asset Studio generation fails** — Asset Studio tab
   - Steps to reproduce: Assets tab → Generate with AI → type prompt → click Generate
   - Expected: AI-generated sprite/asset appears
   - Actual: Progress bar reaches ~10% then shows "Failed". No error message explaining why.
   - Impact: Can't generate any game assets.

6. **Game preview renders empty black canvas** — Play tab
   - Steps to reproduce: Any project → Play tab → click Start Game
   - Expected: Game entities visible, interactive gameplay
   - Actual: Black canvas with only "Score: 0" and "FPS: 60" text. No player sprite, no platforms, no enemies rendered.
   - Impact: Can't play-test your game. The entire preview is non-functional.

7. **Export "Minify" and "Compress" are Coming Soon** — Export tab
   - Steps: Export tab → both options grayed out
   - Impact: Can export raw HTML but can't optimize it.

---

## 😕 What Was Confusing

1. **Game preview shows identical generic text for all templates** — Both Pixel Quest (Platformer) and Dungeon Crawler (Top-Down Action) show the same controls description: "Use WASD to move, SPACE to shoot. Defeat enemies and collect items!" with RPG-specific keys (TAB for NPCs, I for Inventory, J for Quests, C for Craft). Template choice should customize this.

2. **Onboarding modal appears every time** — The welcome/onboarding overlay in Code Editor and Preview shows on every visit, even for the same project. Should only show once per project or have a "Don't show again" checkbox.

3. **Onboarding modal can't be clicked** — The close button (×) on the onboarding modal doesn't respond to click. Only Escape key works to dismiss it.

4. **Duplicate creates ugly entity IDs** — Duplicating `player-1` creates `entity-1775666322645`. Should use readable names like `player-1-copy` or `player-2`.

5. **Save button gives no feedback** — Clicking Save in Scene Editor shows no toast, no success/error message. Impossible to know if save succeeded (it doesn't, but user has no way to know).

6. **Code editor is a plain textbox** — When opening a .ts file, the editor shows code in a plain `<textarea>` with no syntax highlighting, no line numbers, no code intelligence. For a "code workspace" this is misleading.

7. **File count is wrong** — Project overview says "4 files" but the actual project has different counts. After attempting to create new files, count doesn't update.

8. **Asset panel in Scene Editor is empty** — Shows "No assets yet" with category tabs (All/Sprites/Tilesets/Textures) but no guidance on how to get assets into the scene editor.

9. **Project card shows creation date but no last-edited date** — Makes it hard to find recently worked-on projects.

---

## 💡 Feature Requests (Priority Order)

1. **[Critical]** Fix scene persistence — Entities MUST save to disk. This is the #1 blocker.
2. **[Critical]** Fix AI command timeout — Add request timeout (30s), error handling, retry, and fallback to mock AI if real API fails.
3. **[Critical]** Fix Add Entity — It must actually create entities.
4. **[Critical]** Fix New File creation — Must write to disk and refresh file tree.
5. **[High]** Add syntax-highlighted code editor — Monako/CodeMirror integration. A plain textarea is not a code editor.
6. **[High]** Fix game preview rendering — Entities need visual representation (colored rectangles at minimum).
7. **[High]** Add save feedback — Toast notifications for save success/failure.
8. **[High]** Show onboarding only once — Store dismissal in localStorage, don't show again.
9. **[Medium]** Template-specific preview text — Customize controls description per template type.
10. **[Medium]** Better entity naming on duplicate — Use `{name}-copy` or `{name}-2` pattern.
11. **[Medium]** Entity visual rendering in scene editor canvas — Show colored shapes at entity positions even without sprites.
12. **[Low]** Asset drag-and-drop from panel to canvas.
13. **[Low]** Undo/redo in scene editor.
14. **[Low]** Keyboard shortcuts for scene editor (delete entity, copy/paste).

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean, modern UI. Polished dashboard. Good typography. |
| Onboarding | 3 | Welcome modal is nice but shows every time, close button broken. |
| Project Creation | 5 | Fast, intuitive, template selection is excellent. |
| Scene Editor | 2 | Good UI design but none of the data persists. Add Entity broken. |
| Code Editor | 2 | File tree works but editor is a plain textarea. Can't create new files. |
| AI Features | 1 | Command hangs forever. Asset generation fails. Core feature non-functional. |
| Game Preview | 1 | Black canvas, nothing renders. Score/FPS HUD works but no gameplay. |
| Asset Studio | 2 | Great UI design but generation always fails. Upload not tested. |
| Export | 3 | Basic HTML export works. Minify/Compress coming soon. |
| Settings | 4 | Theme, AI model picker, keyboard shortcuts. Solid. |
| **Overall** | **2** | Beautiful shell, but core functionality is broken. Can't build a game end-to-end. |

---

## 📸 Key Screenshots

1. **Dashboard** — Clean, shows all 4 projects with genre tags
2. **Create Project** — Template selection with descriptions and art style radio buttons
3. **Scene Editor** — Entity properties panel with transform, components, actions
4. **AI Command** — Stuck on "Processing... Generating response..." forever
5. **Game Preview** — Black canvas with only "Score: 0" and "FPS: 60"
6. **Asset Studio** — "Failed" at 10% progress
7. **Export** — Minify and Compress grayed out as "Coming Soon"

---

## 🔄 Changes Since Previous Session (14:30 UTC)

- No visible changes to the core bugs identified in the previous session
- The onboarding modal was added since the first test (new feature)
- Asset Studio shows AI-powered suggestions based on scene analysis (new feature)
- Export tab added (new feature)
- **All critical bugs remain unfixed**
