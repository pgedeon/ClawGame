# Game Developer Feedback

**Last Session:** 2026-04-09 06:20 UTC
**Session Type:** Game Creation Test

---

## 🎮 What I Tried To Build

I attempted to create a top-down space shooter called "Galaxy Defender" - a game where players defend the galaxy from alien invaders by shooting enemies, collecting power-ups, fighting bosses, and surviving as long as possible.

---

## ✅ What Worked

1. **Dashboard & Project List** - Clean, well-organized dashboard showing existing projects with clear metadata (status, genre, art style, date)
2. **Project Creation Flow** - Intuitive form with good options (template selection, genre dropdown, art style radio buttons with visual previews, description field)
3. **Template Selection** - Nice visual templates (Platformer, Top-Down Action, Dialogue Adventure) with clear descriptions
4. **Scene Editor Loading** - Scene editor loaded successfully and showed existing entities (player-1)
5. **Add Entity Dropdown** - Entity templates appeared when clicking Add Entity (Player, Enemy, Coin, Wall) with relevant component tags
6. **Code Editor File Explorer** - File tree structure displayed correctly (assets, docs, scenes, scripts folders + config files)
7. **AI Command Interface** - AI Command tab loaded and showed it was connected to glm-4.5-flash model with command history/suggestions

---

## ❌ What Was Broken

### 1. **CRITICAL: Play Game Fails - "require is not defined"** - Play button in header
   - **Steps to reproduce:** Created project "Galaxy Defender" with Top-Down Action template, clicked "Play" button in header
   - **Expected:** Game should run in preview window
   - **Actual:** Error page displayed: "Something went wrong: require is not defined"
   - **Screenshot:** Attached (see screenshot with warning icon)
   - **Impact:** BLOCKING - Cannot test or play the game at all

### 2. **Code Editor Tab Click Doesn't Navigate** - Project overview page
   - **Steps to reproduce:** On project overview, clicked "Code Editor" tab in the tablist
   - **Expected:** Should navigate to code editor view
   - **Actual:** Page URL remains same, no navigation happens. Had to click the "Code Editor" card button instead
   - **Impact:** Medium - Confusing navigation, but workable via card buttons

### 3. **Direct URL to Code Editor Returns 404** - /project/Gnp-pJM9T9t/code-editor
   - **Steps to reproduce:** Navigated directly to http://localhost:5173/project/Gnp-pJM9T9t/code-editor
   - **Expected:** Code editor should load
   - **Actual:** "Page Not Found" error
   - **Impact:** Medium - Direct URLs don't work, but tab navigation works

### 4. **Cannot Add Entity from Dropdown** - Scene Editor
   - **Steps to reproduce:** Clicked "Add Entity" button, dropdown appeared with entity options, tried clicking "Enemy" option
   - **Expected:** Enemy entity should be added to scene
   - **Actual:** Multiple browser tool failures, unclear if entity was added
   - **Impact:** High - Can't visually build scenes via templates

### 5. **Cannot Click Files in Code Editor** - File Explorer
   - **Steps to reproduce:** Expanded scripts folder showing game.ts and player.ts, tried clicking game.ts
   - **Expected:** File should open in editor pane
   - **Actual:** Browser tool kept failing, no file selected
   - **Impact:** HIGH - Cannot view or edit game code!

### 6. **Browser Tool Flakiness** - Throughout session
   - **Steps to reproduce:** Multiple click/type operations on various refs
   - **Expected:** Actions should execute reliably
   - **Actual:** Frequent "Validation failed" errors, timeout errors, ref conflicts (20 elements matched)
   - **Impact:** Medium - May be my tool issue, not app issue, but worth investigating if refs are unstable

---

## 😕 What Was Confusing

1. **Tab Navigation vs Card Buttons** - Both tabs (Overview, Scene Editor, Code Editor) AND cards with same names exist on overview page. It's unclear which to click, and tabs don't seem to work while cards do.

2. **No Indication of File Selection** - In Code Editor, when clicking files, there's no visual feedback showing which file is selected. The pane just says "No file selected" even after clicks.

3. **Add Entity Dropdown UX** - The dropdown appears but clicking options doesn't give feedback. It's unclear if the action succeeded or failed.

4. **No Quick Start or Tutorial** - After creating a project, there's no guided onboarding. Users are dumped into the overview with no "first steps" walkthrough.

5. **Empty Assets Panel** - Scene Editor shows "No assets yet" but no guidance on how to add assets or what formats are supported.

6. **Play Button Placement** - There are TWO Play buttons (header and card on overview) but both do the same thing and both fail with the same error. Redundant and broken.

---

## 💡 Feature Requests (Priority Order)

### High Priority

1. **Fix "require is not defined" Error** - This is a complete blocker. Users cannot run their games. Need to investigate CommonJS/ESM module bundling issues in the game runtime.

2. **Enable File Viewing/Editing in Code Editor** - Cannot click files to open them. The core functionality of a code editor is broken. This must work for the platform to be usable.

3. **Add Functional Entity Creation in Scene Editor** - The template system is great visually, but adding entities must actually work. Add visual feedback when an entity is created.

4. **Add Real-Time Error Display** - When "Play" fails, show actual error details (stack trace, file path, line number) instead of generic "Something went wrong". Developers need to know what's broken.

### Medium Priority

5. **Guided Onboarding** - Add a "Quick Start" walkthrough after project creation that guides users through: (1) Run the default game, (2) Edit player code, (3) Add an enemy, (4) Play changes.

6. **Asset Studio Integration** - The Asset Studio is marked "New" but needs actual functionality. Users need a way to add sprites, sounds, and other assets to use in their games.

7. **Export Game Functionality** - The Export Game card is marked "New" but likely not implemented yet. This is critical for shipping games.

8. **Fix Tab Navigation** - Make tabs actually navigate instead of requiring clicks on card buttons. Inconsistent UX.

9. **Add Entity Selection & Properties Panel** - In Scene Editor, when entities exist, clicking them should show a properties panel to edit position, size, components, etc.

10. **Add Keyboard Shortcuts** - Document and implement shortcuts (⌘K for AI is mentioned, what about Save? Build? Play? Undo? Redo?).

### Low Priority

11. **Add Scene Templates** - Beyond entity templates, provide full scene templates (e.g., "Level 1: Space Station", "Level 2: Asteroid Field").

12. **Add Game Settings Panel** - Allow configuration of screen size, framerate, input mappings, audio settings, etc.

13. **Add Project Templates from Community** - Allow sharing and importing of game templates from other users.

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean, modern UI. Promising concept. |
| Onboarding | 2 | No guided walkthrough. Dumped into editor with no help. |
| Project Creation | 4 | Smooth form, good options, nice templates. |
| Editor Usability | 1 | Cannot view code, cannot add entities, cannot play game. |
| Game Preview | 0 | Completely broken. "require is not defined" error. |
| AI Features | 3 | AI Command loaded but couldn't test due to input issues. |
| Overall | 2 | Great concept and UI, but core functionality broken. |

---

## 📸 Screenshots

1. **Dashboard with Project List** - Clean overview showing existing games
2. **Create New Project Form** - Good template and style selection
3. **Project Overview - Galaxy Defender** - Created successfully with "Welcome" dialog
4. **Scene Editor with Entity Templates** - Add Entity dropdown showing Player/Enemy/Coin/Wall
5. **Code Editor File Explorer** - Scripts folder expanded with game.ts and player.ts
6. **AI Command Interface** - Connected to glm-4.5-flash with suggestions
7. **CRITICAL: Play Game Error** - "require is not defined" blocking issue
8. **Multiple Attempts to Click Files** - No files opening, "No file selected" persists

---

## Summary

ClawGame has excellent UI/UX design and a promising concept. The dashboard, project creation, and overall visual design are polished and intuitive. However, the core development workflow is broken:

- **Cannot play games** (module bundling error)
- **Cannot view/edit code** (file selection broken)
- **Cannot add entities** (creation non-functional)

These are fundamental blocking issues that prevent any actual game development. The platform needs immediate work on:
1. Game runtime/preview system
2. Code editor file handling
3. Scene editor entity creation

Until these are fixed, ClawGame is a beautiful UI shell with no working engine underneath.
