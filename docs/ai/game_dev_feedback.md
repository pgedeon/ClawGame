# Game Developer Feedback

**Last Session:** 2026-04-09 11:00 UTC
**Session Type:** Game Creation Test

---

## 🎮 What I Tried To Build

A simple platformer game called "Space Runner" with:
- A player character that can move and jump
- Collectible coins with a score counter
- Basic collision detection
- Pixel art graphics

---

## ✅ What Worked

1. **Dashboard loads** - Clean interface with existing projects list
2. **Project creation** - Successfully created "Space Runner" project with Platformer template
3. **Scene Editor loads** - Shows canvas with grid, 1 player entity, entity list panel
4. **AI Command UI** - Shows connected status (clawgame-ai / glm-4.5-flash)
5. **AI code generation** - Generated TypeScript code for collectible system when asked
6. **Asset Studio UI** - Loads with AI suggestions, type/style/prompt controls
7. **Export tab** - Shows export options with proper UI

---

## ❌ What Was Broken

### 1. **Play Tab Returns 404** - /project/TFPi3BGf-_h/play
- **Steps to reproduce:** Click "Play" tab or navigate to `/play`
- **Expected:** Game preview/play mode with canvas
- **Actual:** "404 Page Not Found"
- **Impact:** CRITICAL - Cannot test or play games at all
- **Screenshot:** See screenshot 3

### 2. **Code Editor Returns 404** - /project/TFPi3BGf-_h/code-editor
- **Steps to reproduce:** Click "Code Editor" tab or navigate to `/code-editor`
- **Expected:** Full code workspace with file management and syntax highlighting
- **Actual:** "404 Page Not Found"
- **Impact:** CRITICAL - Cannot view or edit game code
- **Screenshot:** See screenshot 6

### 3. **Asset Generation Fails Silently** - Asset Studio
- **Steps to reproduce:**
  1. Navigate to Assets tab
  2. Select "sprite" type and "Pixel Art" style
  3. Enter prompt: "A pixel art player character, 32x32, blue, standing pose"
  4. Click "Generate Asset"
  5. Wait for "100% - Done"
- **Expected:** New sprite asset appears in "Assets" section
- **Actual:** Generation completes but "No assets found" still shows
- **Impact:** HIGH - Cannot generate assets, defeating the purpose of AI asset generation
- **Screenshot:** See screenshot 10

### 4. **AI Command Generated Code Not Applied**
- **Steps to reproduce:** Ask AI "Create a platformer with a player that can jump and collect coins, with a score counter"
- **Expected:** Code is automatically applied to project files or shows clear "Apply" button
- **Actual:** Code shows in chat but no clear way to apply it to the project
- **Impact:** MEDIUM - Can generate code but can't use it

### 5. **Scene Editor Assets Panel Empty**
- **Steps to reproduce:** Open Scene Editor in any project
- **Expected:** Shows default assets or "No assets" with upload option
- **Actual:** Shows "No assets yet" and "Select an entity to edit its properties" but no way to add assets
- **Impact:** MEDIUM - Can't add sprites/tiles to scenes

### 6. **AI Service Reports Offline During Generation**
- **Steps to reproduce:** Generate code with AI Command
- **Expected:** Real AI (glm-4.5-flash) processes request
- **Actual:** Warning "⚠️ AI service offline — using local code generation"
- **Impact:** LOW - Still works but signals backend issue

---

## 😕 What Was Confusing

1. **Tab navigation inconsistency** - Scene Editor, AI Command, Assets, Export work as tabs, but Play and Code Editor 404
2. **No clear onboarding flow** - After creating a project, what should I do first?
3. **AI Command output unclear** - Code is generated but where does it go? How do I apply it?
4. **Scene editor controls** - "Add Entity" button visible but unclear what it does (didn't test due to time)
5. **Asset Studio vs Scene Editor assets** - Two different asset panels, unclear relationship
6. **"Play" button in nav vs "Play" tab** - Multiple Play controls, unclear difference

---

## 💡 Feature Requests (Priority Order)

### **[High] Fix 404 Routes**
- **Why:** Play and Code Editor tabs are completely broken. Users cannot test or edit games.
- **Fix:** Implement missing routes `/project/:id/play` and `/project/:id/code-editor`

### **[High] Fix Asset Generation**
- **Why:** Asset generation completes but doesn't add assets to the project. Core feature is broken.
- **Fix:** Ensure generated assets are saved and displayed in the Assets panel

### **[High] AI Code Apply Flow**
- **Why:** AI generates code but users can't apply it. Breaks the AI-to-game workflow.
- **Fix:** Add "Apply" button or auto-apply with confirmation after AI code generation

### **[Medium] Add Scene Editor Entity Placement**
- **Why:** Scene editor shows entity but no clear way to add more or place them.
- **Fix:** Ensure "Add Entity" button opens entity creation dialog

### **[Medium] Add Play Mode Canvas**
- **Why:** Play tab needs actual game canvas, not just 404.
- **Fix:** Implement game runtime preview in Play tab

### **[Medium] Add Onboarding Guide**
- **Why:** New users don't know where to start after creating a project.
- **Fix:** Add step-by-step walkthrough: "Create entities → Add assets → Generate code with AI → Test in Play mode"

### **[Low] Add Code Editor File Tree**
- **Why:** When Code Editor is fixed, users need to see project files.
- **Fix:** Show file tree with main.ts, entities/, scripts/, assets/

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 3 | Clean design, promises AI features |
| Onboarding | 2 | No guidance after project creation |
| Project Creation | 4 | Good templates, clear form |
| Editor Usability | 2 | Scene editor works but limited; others 404 |
| Game Preview | 1 | Tab returns 404 - completely broken |
| AI Features | 3 | Generates code/assets but integration unclear |
| Overall | 2 | Foundation looks good, critical flows broken |

---

## 📸 Screenshots

### Screenshot 1: Dashboard
Shows clean landing page with "Build Games with AI" heading, project list, and quick actions.

### Screenshot 2: Create Project Form
Shows project name field, template selection (Platformer selected), genre/art style choices.

### Screenshot 3: Project Overview
Shows Space Runner project with tabs: Overview, Scene Editor, Code Editor, AI Command, Assets, Play, Export.

### Screenshot 4: Scene Editor
Shows canvas with grid, player entity, entity list panel (1 entity), assets panel (empty).

### Screenshot 5: AI Command (Generating)
Shows "Analyzing your request... Processing... Generating response..."

### Screenshot 6: AI Command (Done)
Shows generated TypeScript code for collectible system, "⚠️ AI service offline" warning.

### Screenshot 7: Play Tab (404)
Shows "404 Page Not Found" - critical blocking issue.

### Screenshot 8: Export Tab
Shows export options with "Include Assets" checked, "Minify Code" and "Compress Output" disabled ("Coming Soon").

### Screenshot 9: Code Editor Tab (404)
Shows "404 Page Not Found" - second critical blocking issue.

### Screenshot 10: Asset Studio (Before Generation)
Shows AI suggestions, type/style/prompt controls, "No assets found".

### Screenshot 11: Asset Studio (After Generation)
Shows "100% - Done" but still "No assets found" - generation failed to add asset.

---

## Summary

ClawGame has a solid foundation with:
- ✅ Good UI design and clean interface
- ✅ Working project creation and templates
- ✅ Scene editor with entity management
- ✅ AI code generation (via templates when service offline)
- ✅ Asset studio UI with controls

But critical blocking issues prevent actual game development:
- ❌ **Play tab 404** - Cannot test/play games
- ❌ **Code Editor 404** - Cannot edit code
- ❌ **Asset generation broken** - Cannot add generated assets
- ❌ **No clear AI-to-game workflow** - Generated code not applicable

**Recommendation:** Fix the 404 routes and asset generation before adding new features. These are showstoppers that make the platform unusable for game development.
