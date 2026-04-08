# Game Developer Feedback

**Last Session:** 2026-04-08 14:30 UTC
**Session Type:** Game Creation Test

---

## 🎮 What I Tried To Build

I attempted to create a top-down space shooter called "Space Blaster" where the player pilots a ship, moves with WASD, fires bullets with spacebar, dodges asteroids, and blasts alien invaders with a 3-life health system. I used the Top-Down Action template with Action genre and Pixel Art style.

---

## ✅ What Worked

1. **Dashboard and Navigation** — Clean landing page with clear project cards showing name, genre, style, status, and date. Navigation to all sections (Overview, Scene Editor, Code Editor, AI Command, Assets, Preview, Export) worked smoothly.

2. **Project Creation Flow** — Create New Project page worked well. Templates (Platformer, Top-Down Action, Dialogue Adventure) with descriptions and "AI-Ready" badges were clear. Genre dropdown, art style radio buttons with thumbnails, and optional description field all functioned. Project was successfully created with ID `OtqziYlBP4W`.

3. **Scene Editor** — Fully functional with grid controls (Show Grid, Snap to Grid, Zoom In/Out, Reset View). Entity list showed 3 pre-created entities (player-1, enemy-1, powerup-1). Selecting an entity opened the Properties panel with ID, Transform (X, Y, Rotation, Scale X/Y), and Components list. Add Component feature worked (AI, Collision available).

4. **Code Editor** — File explorer properly organized with folders (assets, docs, scenes, scripts) and project JSON. Quick Start buttons (Add Enemy AI, Create Scene, Add Player Code) provide good guidance. Opened `player.ts` and `game.ts` successfully with proper save/reset toolbar.

5. **Game Preview** — Loaded and ran a playable game with "Start Game" button, pause controls, and score tracking. Canvas rendered game objects. Runtime feedback (frame rate, status) visible.

6. **Export Page** — Well-structured with clear options (Include Assets toggle, Minify/Compress marked as "Coming Soon"). Export History section shows export count. Documentation explains what exports are.

7. **Onboarding Modal** — Clear 5-step guide (Ask AI to Build, Create Assets, Design Scenes, Write Code, Play & Test) with buttons to open each section.

---

## ❌ What Was Broken

### 1. AI Command Timeout — Critical Blocking Bug
**Screen:** AI Command (`/project/OtqziYlBP4W/ai`)
**What happened:** After submitting the prompt "Create a top-down space shooter player ship that moves with WASD, fires bullets with spacebar, and has a health system with 3 lives. The ship should be a pixel art style triangle.", the AI hung on "Processing... Generating response..." for over 2 minutes and then errored with "Failed to process your request: timeout of 120000ms exceeded".

**Steps to reproduce:**
1. Navigate to AI Command from any project page
2. Enter a prompt: "Create a top-down space shooter player ship..."
3. Click Send (or press Enter)
4. Wait for response

**Expected:** AI generates code and/or creates files based on the prompt within a reasonable time (10-30 seconds). Response should show generated code with option to apply to project.

**Actual:** UI showed "Processing... Generating response..." indefinitely. After 120 seconds, error appeared: "❌ Error — AI Service Error — Failed to process your request: timeout of 120000ms exceeded". No code was generated. The prompt input remained disabled after the error until I refreshed.

**Impact:** This is a CRITICAL bug. The entire value proposition of ClawGame is AI-powered code generation. If the AI doesn't work, the platform is unusable for its core purpose. I could not proceed with building the game without hand-writing all code.

**Root cause suspicion:** The AI integration (real-ai-openrouter with glm-4.5-flash model) appears to be timing out. Could be API rate limiting, incorrect timeout configuration, or an unhandled async flow in the backend.

---

### 2. Asset Studio App Crash
**Screen:** Asset Studio (`/project/OtqziYlBP4W/assets`)
**What happened:** After typing a prompt "pixel art spaceship triangle top-down 32x32" and clicking "Generate Asset", the app crashed with a full-screen error modal: "Something went wrong — prev is not iterable". The prompt was cleared after crash. Clicking "Try Again" recovered the page.

**Steps to reproduce:**
1. Navigate to Asset Studio
2. Ensure "sprite" type and "pixel art" style are selected
3. Type prompt: "pixel art spaceship triangle top-down 32x32"
4. Click "Generate Asset"
5. Observe crash

**Expected:** AI generates a sprite image based on the prompt and adds it to the assets list. Shows preview and allows downloading or applying to entities.

**Actual:** App crashed with JavaScript error "prev is not iterable". Full-page error modal appeared. All UI state was lost. Had to click "Try Again" to recover. No asset was generated.

**Impact:** This is a HIGH severity bug. The Asset Studio is a key feature for visual game creation. If it crashes on the first generation attempt, users cannot create any assets and must rely on external tools. The "prev is not iterable" error suggests a bug in the array/iteration logic in the asset generation handler.

---

### 3. Game Preview Shows Wrong Game
**Screen:** Game Preview (`/project/OtqziYlBP4W/preview`)
**What happened:** The Game Preview page loaded a game titled "Rune Rush" instead of my project "Space Blaster". The game appeared to be a hardcoded demo or default template, not my project's actual game code.

**Steps to reproduce:**
1. Create a new project called "Space Blaster"
2. Navigate to Game Preview
3. Observe the title and content

**Expected:** Preview should load and run my actual project game with the correct name ("Space Blaster") and my code/logic.

**Actual:** Preview showed "Rune Rush" — a completely different game that appears to be a hardcoded demo or fallback. The game was playable but it wasn't MY game.

**Impact:** This is a MEDIUM severity bug. Users can't actually test their own games. They only see a demo. This defeats the purpose of the Preview feature for iterative development. It suggests the project ID isn't being passed to the preview canvas correctly, or the preview is loading from a fixed source instead of the project's build output.

**Note:** The preview functionality (Start Game, Pause, runtime stats, canvas rendering) all worked — it's just showing the wrong game content.

---

### 4. Export Game Button Does Nothing
**Screen:** Export (`/project/OtqziYlBP4W/export`)
**What happened:** Clicking "Export Game" button did not trigger any visible action. No download started, no toast/notification appeared, no loading state, and Export History remained at "0 exports".

**Steps to reproduce:**
1. Navigate to Export page
2. Ensure "Include Assets" is checked
3. Click "Export Game"
4. Wait for response

**Expected:** Either a download starts automatically, or a modal appears confirming the export and showing a download link. Export History count should increment.

**Actual:** Nothing happened. No UI feedback at all. The button returned to its idle state immediately. Export History stayed at 0 exports. No file was downloaded.

**Impact:** MEDIUM severity. Users can't export their games to share or deploy. The Export feature is broken, making the platform useless for the final step of game development (shipping).

---

## 😕 What Was Confusing

### 1. Scene Editor Entity Selection
**Issue:** In the Scene Editor, when I clicked an entity in the "Entities" list, the entity properties panel appeared. But it wasn't immediately clear how to select entities on the canvas itself. Drag-and-drop wasn't working, and clicking on canvas areas didn't select anything. The UI hints said "Select an entity to edit its properties" but didn't explain how to select entities visually.

**Suggestion:** Add hover states on entities in the canvas, allow clicking entities directly on the canvas to select them, and add a visible selection box around the selected entity. Add a tooltip or inline help explaining the two selection methods (list click vs canvas click).

---

### 2. Code Editor File Tree Not Showing All Files
**Issue:** When I opened the scripts folder, it showed `game.ts` and `player.ts`. But when I initially opened the editor, it only showed the folder structure. I had to expand folders manually. Some files that should exist (like `main.ts` or `index.ts`) weren't visible. It wasn't clear if files were missing or just not loaded.

**Suggestion:** Automatically expand all folders on load. Show file count next to each folder (e.g., "scripts (3)"). Add a "Show All Files" toggle. Provide a breadcrumb or status showing total file count in the project.

---

### 3. AI Command Status Display Confusion
**Issue:** The AI Command page showed "Connected to: real-ai-openrouter" and "Model: glm-4.5-flash" — but this was just informational text, not a clickable status or health indicator. After the timeout error, there was no way to check if the AI service recovered. The "Refresh AI status" button existed but didn't show any visual feedback when clicked.

**Suggestion:** Add a real-time status indicator (green/yellow/red dot) with a tooltip explaining the state. When "Refresh AI status" is clicked, show a loading spinner and then update the indicator with a timestamp. After errors, show a "Retry" button with a countdown.

---

### 4. Asset Studio Generate Button Disabled State
**Issue:** In the Asset Studio, the "Generate Asset" button was disabled (grayed out) when I first loaded the page, but it wasn't obvious WHY. It turned out the prompt field was empty. But the button didn't show a tooltip explaining "Enter a prompt to generate". I had to trial-and-error to figure out what was missing.

**Suggestion:** Add a tooltip or placeholder text on the disabled button: "Enter a prompt above". Or enable the button and show inline validation when clicked: "Please enter a prompt first".

---

### 5. No Undo/Redo in Scene Editor
**Issue:** After editing entity properties (position, scale, components), I couldn't undo changes. If I made a mistake, I had to manually revert values. No Ctrl+Z or undo button was available. This is scary for new users who might accidentally break something.

**Suggestion:** Implement undo/redo for all editor actions (entity transforms, component changes, entity creation/deletion). Add a keyboard shortcut tooltip (Ctrl+Z / Ctrl+Y) and toolbar buttons.

---

### 6. Quick Start Buttons Don't Explain What They Do
**Issue:** In the Code Editor, the Quick Start section has buttons like "Add Enemy AI", "Create Scene", "Add Player Code". Clicking them likely triggers AI generation, but the button text doesn't explain the outcome. I wasn't sure if they'd open a wizard, generate code directly, or navigate me somewhere.

**Suggestion:** Add a small subtitle under each button: "Generate enemy behavior AI scripts" or "Create a basic scene layout with a canvas". Or add a hover tooltip: "Opens AI assistant to generate enemy AI components".

---

## 💡 Feature Requests (Priority Order)

### **[High] AI Command Timeout Handling & Retry**
**Why:** The AI Command timed out after 120 seconds, blocking the entire workflow. This is the core value prop of the platform. It needs:
- Exponential backoff retry logic (3-5 attempts)
- User-facing countdown timer during processing
- "Cancel" button to stop long-running requests
- Detailed error messages with actionable next steps
- Fallback to alternative models if one times out
- Save prompt to local storage so users don't lose work on timeout

---

### **[High] Asset Studio Crash Fix**
**Why:** The Asset Studio crashes on first use with "prev is not iterable". This is a regression that prevents users from generating any assets. Needs:
- Proper error boundaries around asset generation code
- Better input validation for prompts
- User-friendly error messages with recovery options
- Log errors to console with stack traces for debugging
- Test coverage for the generation flow

---

### **[High] Game Preview Should Load Actual Project**
**Why:** The Game Preview shows a hardcoded "Rune Rush" game instead of the user's actual project. This makes the preview useless for testing. Needs:
- Build the project's actual code before previewing
- Load the correct project ID from the URL
- Show the project name in the preview header (not "Rune Rush")
- Add a "Rebuild" button to force fresh compilation
- Show build errors if compilation fails

---

### **[Medium] Export Game Download Functionality**
**Why:** The Export button does nothing — no download starts. Users can't ship their games. Needs:
- Generate a standalone HTML/ZIP file with all assets
- Trigger browser download with correct filename
- Show progress bar during export for large projects
- Add export history with download links
- Support different export formats (HTML, ZIP, WASM)

---

### **[Medium] Undo/Redo in Scene Editor**
**Why:** No undo capability makes editing risky. Users are afraid to experiment. Needs:
- Command pattern for all editor actions
- Ctrl+Z / Ctrl+Y keyboard shortcuts
- Undo/Redo buttons in the toolbar
- Limit undo stack size (e.g., last 50 actions)
- Persist undo stack to project file

---

### **[Medium] Real-Time AI Status Indicator**
**Why:** The AI Command page shows static connection info but no real-time health. Users don't know if AI is working or broken until they try. Needs:
- Green/yellow/red status dot with tooltip
- Last successful request timestamp
- Latency stats (last request took X seconds)
- "Test connection" button with immediate feedback
- Auto-refresh status every 30 seconds

---

### **[Low] Canvas Entity Selection in Scene Editor**
**Why:** Clicking entities on the canvas to select them is more intuitive than using a list. Currently, clicking the canvas does nothing. Needs:
- Visual hit detection for entities on canvas
- Selection box/border around selected entity
- Hover state (outline) on mouseover
- Shift+click for multi-select
- Drag to move entities after selection

---

### **[Low] Quick Start Tooltips**
**Why:** The Quick Start buttons in Code Editor don't explain what they'll do. Users hesitate to click. Needs:
- Hover tooltips explaining each button's action
- "Learn more" links to documentation
- Preview of what will be generated (e.g., "This will create an enemy.ts file with basic AI behavior")
- Confirmation dialog for irreversible actions

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean dashboard, clear navigation, good onboarding modal |
| Onboarding | 3 | Onboarding modal was helpful, but AI failure ruined the experience immediately |
| Project Creation | 4 | Smooth flow, clear options, worked perfectly |
| Editor Usability | 3 | Scene Editor is good but lacks canvas selection and undo |
| Game Preview | 2 | Loads but shows wrong game ("Rune Rush"), can't test my project |
| AI Features | 1 | AI Command timed out, Asset Studio crashed — both core features broken |
| Export | 2 | Page exists and looks good, but Export button does nothing |
| Overall | 2.5 | Good foundation, but AI features (the main selling point) are broken. Can't actually build a game without hand-coding everything. |

---

## 📸 Screenshots

### Dashboard
![Dashboard](screenshot_001.png)
*Initial dashboard showing two existing projects and "New Project" option.*

### Create Project Form
![Create Project](screenshot_002.png)
*Filled project form with "Space Blaster", Top-Down Action template, description entered.*

### Project Overview
![Project Overview](screenshot_003.png)
*Project created successfully. Shows onboarding modal with 5-step guide.*

### Scene Editor
![Scene Editor](screenshot_004.png)
*Scene Editor with grid controls, entity list (player-1, enemy-1, powerup-1), and empty assets panel.*

### Scene Editor Entity Properties
![Entity Properties](screenshot_005.png)
*Entity properties panel showing player-1 with transform values and components (movement, sprite).*

### Code Editor
![Code Editor](screenshot_006.png)
*Code Editor with file tree, scripts folder expanded, player.ts opened.*

### Game Preview - Wrong Game
![Game Preview](screenshot_007.png)
*Game Preview showing "Rune Rush" instead of "Space Blaster". The Start Game button works but it's not my game.*

### AI Command Before Timeout
![AI Command](screenshot_008.png)
*AI Command page with prompt entered, "Processing... Generating response..." status.*

### AI Command After Timeout
![AI Error](screenshot_009.png)
*AI Command timeout error: "Failed to process your request: timeout of 120000ms exceeded".*

### Asset Studio Before Crash
![Asset Studio](screenshot_010.png)
*Asset Studio with prompt "pixel art spaceship triangle top-down 32x32" entered.*

### Asset Studio After Crash
![Asset Crash](screenshot_011.png)
*Full-screen error modal: "Something went wrong — prev is not iterable".*

### Export Page
![Export Page](screenshot_012.png)
*Export page with options and history. "Export Game" button clicked but nothing happened.*

---

## Summary

ClawGame has a **solid foundation** — the UI is clean, navigation is intuitive, project creation works well, and the scene editor is functional. However, the **core AI features are broken**:

1. AI Command times out after 2 minutes, making code generation impossible
2. Asset Studio crashes on first use with a JavaScript error
3. Game Preview shows a hardcoded demo instead of the actual project
4. Export button does nothing

Without AI code generation and asset creation, the platform is just a basic code editor with a nice UI. Users expecting an "AI-native" experience will be disappointed. The priority should be **fixing the AI integration** before adding more features.

**Blocking issues that prevent game development:**
- AI Command timeout (critical)
- Asset Studio crash (critical)
- Game Preview loading wrong project (high)
- Export button non-functional (high)

Once these are fixed, ClawGame could be a powerful game development platform. The UX is already good — just need the backend to deliver on the promises.
