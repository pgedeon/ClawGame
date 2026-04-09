# Game Developer Feedback

**Last Session:** 2026-04-09 13:15 UTC
**Session Type:** Fresh game creation test — Tower Defense Quest

---

## 🎮 What I Tried To Build

Created a brand new "Tower Defense Quest" project (strategy/genre, pixel art style) using the Platformer template as starting point. Attempted the full workflow:
1. Dashboard → Create New Project
2. Fill in project details (name, genre: Strategy, art: Pixel Art, description)
3. Scene Editor — view entities, try to build a scene
4. AI Command — ask for tower defense mechanics (grid placement, enemy waves, gold system, etc.)
5. Code Editor — browse generated files
6. Play/Preview — test the game
7. Asset Studio — check asset generation
8. Export — review export options

---

## ✅ What Worked

1. **Project creation is smooth** ✅ — Name, template selection (Platformer/Top-Down/Dialogue), genre dropdown, art style radio buttons with preview images, optional description. All inputs worked. "Create Platformer" button redirected to project overview immediately.

2. **Dashboard is polished** ✅ — Clean hero section, Quick Actions grid, existing projects listed with status badges (draft), genre/art tags, dates. Professional first impression.

3. **AI Command "Apply to Project" button EXISTS** ✅ — Improvement from last session! After AI generates code, there's a clear "Apply to Project" button with confidence score (90%) and risk assessment (low). This was the #1 blocker before — now it works.

4. **Code Editor file tree** ✅ — Shows proper folder structure (assets/, docs/, scenes/, scripts/) with files. Expandable folders. Quick Start buttons for common tasks (Add Enemy AI, Create Scene, Add Player Code).

5. **Export tab is well-designed** ✅ — Clean options: Include Assets (checkbox, checked by default), Minify Code (coming soon, disabled), Compress Output (coming soon, disabled). Export History section. Good informational text about standalone HTML exports.

6. **Navigation is consistent** ✅ — Tab bar across all project views: Overview, Scene Editor, Code Editor, AI Command, Assets, Play, Export. Nav bar shows project name. Back to Dashboard link always present.

7. **Scene Editor has good controls** ✅ — Save button, Zoom in/out/reset, Show Grid toggle, Snap to Grid toggle, Add Entity button, AI Assistant button, Assets panel with filter tabs (All/Sprites/Tilesets/Textures).

---

## ❌ What Was Broken

### 1. **AI doesn't understand game context — generated wrong game type** — AI Command
- **Steps to reproduce:**
  1. Create a project named "Tower Defense Quest" with genre "Strategy" and description about tower defense
  2. Go to AI Command tab
  3. Type: "Create a tower defense game with: grid-based map, enemies following path, towers that shoot, gold system, wave system, health bar"
  4. Click Send
- **Expected:** Tower defense game code — grid system, enemy pathing, tower placement logic
- **Actual:** Generated a "Projectile Shooting System" — a generic side-scroller shooting mechanic. The AI completely ignored the tower defense context and gave me a platformer shooter.
- **Impact:** HIGH — The AI doesn't use project metadata (name, genre, description) to contextualize responses. Makes the AI feature unreliable for anything beyond the default template.

### 2. **AI service still offline — falls back to templates** — AI Command
- **Steps to reproduce:** Send any AI command
- **Expected:** Real AI processing via glm-4.5-flash
- **Actual:** Yellow warning "⚠️ AI service offline — using local code generation". Falls back to hardcoded templates. Welcome screen misleadingly says "Connected to: clawgame-ai / Model: glm-4.5-flash" but generation never uses it.
- **Impact:** HIGH — AI is the core value prop. Without real AI, the platform is just a code template dispenser.

### 3. **Game preview canvas is nearly empty** — Play tab
- **Steps to reproduce:**
  1. Click Play tab
  2. Click "Start Game"
  3. Observe the game canvas
- **Expected:** Visible game world with entities, player character, background
- **Actual:** Canvas shows "▶ Playing" status but the game area is mostly a dark/empty rectangle. No visible game elements, no way to interact meaningfully.
- **Impact:** HIGH — The game "runs" but you can't see or play anything. Defeats the purpose of the preview.

### 4. **Code editor doesn't show file contents** — Code Editor
- **Steps to reproduce:**
  1. Open Code Editor tab
  2. Expand scripts/ folder
  3. Click on game.ts
- **Expected:** See the file contents in an editor with syntax highlighting
- **Actual:** The file name "scripts/game.ts" appears and there's a Save button, but no visible code content in the editor area. The textbox element is empty or the code isn't rendering.
- **Impact:** HIGH — Can't view or edit code files. Code editor is just a file tree browser.

---

## 😕 What Was Confusing

1. **Platformer template forced for strategy game** — I selected "Strategy" genre but the create button still said "Create Platformer" because the Platformer template was pre-selected. No strategy template exists. Templates and genres feel disconnected.

2. **AI suggestions don't match project type** — Asset Studio suggested assets for "puzzle game" (85% confidence) when my project is a strategy tower defense. Scene analysis is wrong.

3. **Scene editor canvas unclear** — Shows entities in a list (player-1) but the visual canvas representation is hard to interpret. Can't tell where entities are placed or how big they are.

4. **No relationship between tabs** — Generated code in AI Command and applied it, but Code Editor shows the same files it had before. Did the apply actually work? No confirmation or feedback.

5. **Asset Studio "Generate Asset" button disabled** — Need to select an asset type first AND type a prompt. The button should either be enabled with a helpful tooltip explaining what's needed, or the required fields should be more obvious.

6. **"AI-Ready" badges everywhere** — Templates, project cards all say "AI-Ready" and "AI-Powered" but the AI doesn't actually work (offline). This feels like false advertising.

---

## 💡 Feature Requests (Priority Order)

1. **[CRITICAL] Fix AI service connection** — The entire platform value proposition is "Build Games with AI". If AI is offline and falling back to templates, it's not delivering on its promise. This should be the #1 priority.

2. **[CRITICAL] Make game preview actually show something** — Even without proper sprites, render colored rectangles/shapes for entities. Show a grid. Show something. A dark empty canvas helps no one.

3. **[HIGH] AI context awareness** — Pass project name, genre, description, and existing code to the AI prompt. If I say "tower defense" the AI should generate tower defense code, not a generic shooter.

4. **[HIGH] Code editor should show file contents** — Clicking a file in the tree should display its content with syntax highlighting. Currently shows an empty textbox.

5. **[MEDIUM] Add more game templates** — At minimum: Tower Defense, Puzzle, Racing, RPG. Having only Platformer/Top-Down/Dialogue limits the starting points.

6. **[MEDIUM] Template-genre linkage** — When I select "Strategy" genre, suggest relevant templates. Don't force Platformer as default for every genre.

7. **[MEDIUM] Confirm code apply** — When clicking "Apply to Project", show a toast/notification confirming the file was saved. Then auto-refresh the Code Editor file tree.

8. **[LOW] Asset Studio required field indicators** — Show which fields must be filled before Generate becomes clickable. Add placeholder examples that match the project context.

9. **[LOW] Scene editor visual feedback** — Draw colored bounding boxes for entities on the canvas. Show the grid prominently. Add labels on hover.

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean, professional, good hero section |
| Onboarding | 2 | No guided flow. "Describe your game idea" hero text implies AI will do the work, but it can't |
| Project Creation | 4 | Smooth form, good templates, instant creation |
| Scene Editor | 3 | Good controls but canvas is hard to interpret |
| Code Editor | 2 | File tree works but can't see file contents. Save button always disabled |
| Game Preview | 2 | Starts but shows nothing. Empty canvas |
| AI Features | 2 | Apply button exists (improvement!) but AI is offline and generates wrong game types |
| Asset Studio | 3 | Good structure, suggestions, but assets don't auto-link to entities |
| Export | 4 | Well-designed, clear options, good documentation |
| Overall | 2.5 | Polished shell but core functionality (AI, preview, code editing) needs work |

---

## 📸 Screenshots

### Screenshot 1: Dashboard
Clean landing page with hero "Build Games with AI", Quick Actions grid, existing projects list.

### Screenshot 2: Create Project Form
Well-designed form with name, template selection (Platformer selected), genre dropdown (Strategy), art style radios (Pixel Art selected), description textarea.

### Screenshot 3: Project Overview
Good project overview with cards for Edit Scenes, AI Command, Code Editor, Asset Studio, Play Game, Export Game. Shows "1 Scenes 4 Entities" stats.

### Screenshot 4: AI Command — Wrong Output
Asked for tower defense, got "Projectile Shooting System" — generic shooter code. "Apply to Project" button present (improvement!). AI offline warning visible.

### Screenshot 5: Code Editor — Empty
File tree shows game.ts, player.ts, projectile.ts. Clicking game.ts shows filename and Save button but no visible code content.

### Screenshot 6: Play Tab — Empty Canvas
"Start Game" screen looks good with instructions. After clicking Start, "▶ Playing" status but canvas is dark/empty.

### Screenshot 7: Asset Studio
Good structure with AI suggestions, generation form, upload option, filter. No assets yet. Suggestions say "puzzle game" instead of strategy.

### Screenshot 8: Export Tab
Clean export options, Include Assets checked, Minify/Compress coming soon. Good informational sections.

---

## Comparison with Previous Session (v0.13.1)

**Improvements since last test:**
- ✅ AI Command "Apply to Project" button now exists (was the #1 blocker)
- ✅ Overall navigation and flow is more polished

**Still broken:**
- ❌ AI service offline (same as before)
- ❌ Game preview empty canvas (same as before)
- ❌ Code editor doesn't show file contents (new finding — may have been broken before)
- ❌ AI generates wrong game types based on context (new finding)

**Net assessment:** The platform is improving incrementally. The "Apply to Project" button fix is meaningful. But the three core pillars — AI generation, game preview, and code editing — all still have major issues that prevent actually building a game end-to-end.
