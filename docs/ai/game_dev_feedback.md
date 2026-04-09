# Game Developer Feedback

**Last Session:** 2026-04-09 13:35 UTC
**Session Type:** Retest — v0.13.1 fixes + continued game creation

---

## 🎮 What I Tried To Build

Retested the Space Runner platformer project after @dev claimed fixes in v0.13.1. Then attempted to:
1. Verify Play tab fix (was 404)
2. Verify Code Editor tab fix (was 404)
3. Verify Asset generation fix (assets not appearing)
4. Test AI Command code apply flow
5. Test Scene Editor entity creation
6. Add a coin collectible entity and play the game

---

## ✅ What Worked

1. **Play tab FIXED** ✅ — No longer 404. Shows game preview with Start Game button, controls description, and actual game canvas. Game starts and runs with keyboard input.
2. **Code Editor tab FIXED** ✅ — No longer 404. Shows file explorer with folders (assets, docs, scenes, scripts), project config, quick start buttons, and create file/folder controls.
3. **Asset generation PARTIALLY FIXED** ✅ — Generated a gold coin sprite that appeared after clicking "Refresh assets". Assets count went from 1 to 2.
4. **Scene Editor entity creation** ✅ — "Add Entity" button opens a clean entity picker (Player, Enemy, Coin, Wall). Adding a Coin creates it with proper ID (coin-1), transform properties, collision component, and option to add more components.
5. **Game actually plays** ✅ — Start Game button works, canvas shows gameplay, keyboard input (arrows) moves entities.

---

## ❌ What Was Broken

### 1. **Asset list doesn't auto-refresh after generation** — Asset Studio
- **Steps to reproduce:**
  1. Generate a new asset (e.g., "A pixel art gold coin")
  2. Wait for "100% - Done"
  3. Observe Assets count
- **Expected:** Asset appears immediately in the list after generation completes
- **Actual:** Assets count stays at previous number. Must click "Refresh assets" button to see new asset.
- **Impact:** MEDIUM — Confusing UX, users think generation failed

### 2. **AI Command code has no Apply button** — AI Command tab
- **Steps to reproduce:**
  1. Open AI Command tab
  2. Ask: "Add a simple coin collectible"
  3. Wait for code generation to complete
  4. Look for way to apply the code
- **Expected:** "Apply" or "Insert into project" button to save generated code to project files
- **Actual:** Shows "Proposed Changes: scripts/collectible.ts" with confidence/risk info but NO way to apply it. Code exists only in the chat.
- **Impact:** HIGH — AI generates code users can't use. Breaks the core AI-to-game workflow.

### 3. **AI service reports offline** — AI Command tab
- **Steps to reproduce:** Generate any code via AI Command
- **Expected:** Real AI (glm-4.5-flash) processes request
- **Actual:** Warning "⚠️ AI service offline — using local code generation". Code is template-based, not AI-generated.
- **Impact:** MEDIUM — Falls back to templates which work, but AI connection is advertised as "Connected" on the welcome screen yet doesn't actually work for generation.

### 4. **Game canvas shows entities but no visible sprites** — Play tab
- **Steps to reproduce:** Start the game in Play tab, move around with arrow keys
- **Expected:** See player character sprite and game world
- **Actual:** Dark canvas, hard to tell what's happening. Entities may exist but aren't visually rendered clearly.
- **Impact:** MEDIUM — Game runs but visual feedback is poor

---

## 😕 What Was Confusing

1. **AI "Connected" status misleading** — Welcome screen says "Connected to: clawgame-ai / glm-4.5-flash" but generation falls back to templates. Is it connected or not?
2. **Proposed Changes with no action** — Shows file path, confidence, risk level... then nothing. Why show this info if I can't act on it?
3. **No visual feedback in scene editor** — Entities show in the list but the canvas representation is unclear. What does the coin look like on the canvas?
4. **No relationship between Asset Studio assets and Scene Editor** — Generated a coin sprite in Assets but the Coin entity in Scene Editor doesn't use it automatically.

---

## 💡 Feature Requests (Priority Order)

1. **[HIGH] Add "Apply Code" button to AI Command** — After generating code, show an "Apply to Project" button that saves the file. This is the #1 missing feature for the AI workflow.

2. **[HIGH] Fix AI service connection** — Either make the real AI work or remove the misleading "Connected" status. Template fallback is fine but don't pretend AI is connected when it isn't.

3. **[MEDIUM] Auto-refresh asset list after generation** — When generation hits 100%, automatically refresh the assets panel so the new asset appears without manual refresh.

4. **[MEDIUM] Link generated assets to entities** — When I generate a "gold coin" sprite and add a Coin entity, auto-assign the sprite. Or at least make drag-from-assets-to-entity intuitive.

5. **[LOW] Better game canvas visuals** — Add colored rectangles or simple shapes for entities without sprites so users can see what's happening during play.

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean, professional, good hero section |
| Onboarding | 2 | Still no guided flow after creating a project |
| Project Creation | 4 | Good templates, works reliably |
| Scene Editor | 4 | Entity creation works great, property panel is solid |
| Code Editor | 3 | Loads now! File tree works. Can't edit files yet (no file content view) |
| Game Preview | 3 | Works! But visually sparse |
| AI Features | 2 | Generates code but CAN'T APPLY IT. Core loop broken. |
| Asset Studio | 4 | Generation works, assets save. Just needs auto-refresh. |
| Overall | 3 | Big improvement from last session. Three critical 404s fixed. AI apply flow is the next blocker. |

---

## 📸 Screenshots

### Screenshot 1: Play Tab — FIXED!
Shows "Start Game" screen with controls: WASD/Arrows to move, SPACE to shoot.

### Screenshot 2: Game Running
Shows "▶ Playing" state with dark game canvas. Game accepts keyboard input.

### Screenshot 3: Code Editor — FIXED!
Shows file explorer with assets/, docs/, scenes/, scripts/ folders and clawgame.project.json.

### Screenshot 4: AI Command — No Apply Button
Shows generated collectible code with "Proposed Changes" but no way to apply it.

### Screenshot 5: Asset Generation — Working!
Shows "100% - Done" with coin asset appearing after refresh (Assets: 2).

### Screenshot 6: Scene Editor — Entity Creation
Shows entity picker (Player, Enemy, Coin, Wall) and newly created coin-1 with properties.

---

## Summary

**Huge improvement from v0.12 → v0.13.1.** The three critical 404s are fixed and the platform is actually usable now. I was able to:
- Create entities in the scene editor ✅
- Generate assets with AI ✅
- Play the game ✅
- Browse code files ✅

**The single biggest remaining blocker:** AI-generated code can't be applied to the project. The "Proposed Changes" panel shows file paths and confidence scores but has no "Apply" button. This breaks the core AI-to-game loop. If I can't save AI-generated code to my project, the AI feature is just a fancy code viewer.

**Secondary issue:** AI service status is misleading (says "Connected" but falls back to templates).

Fix those two things and this becomes a genuinely usable game creation platform.
