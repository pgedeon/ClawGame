# Game Developer Feedback

**Last Session:** 2026-04-09 15:55 UTC
**Session Type:** Game Creation Test

---

## 🎮 What I Tried To Build

A **space shooter** called "Space Blaster" — a top-down arcade game where the player controls a spaceship, moves with arrow keys, and shoots bullets upward with spacebar. I walked through the full user journey: dashboard → create project → scene editor → AI command → code editor → asset studio → game preview.

---

## ✅ What Worked

1. **Dashboard loads fast and looks clean** — clear "New Project" CTA, existing projects visible, pro tip about ⌘K is helpful.
2. **Project creation flow is smooth** — name field, template picker (Platformer pre-selected with ✓), genre dropdown, art style radio cards with thumbnails, all intuitive. "Create Platformer" button label updates based on template.
3. **Scene Editor entity system works** — Add Entity shows a type picker (Player, Enemy, Coin, Wall) with emoji icons. Clicking "Enemy" immediately creates it with auto-assigned components (ai, movement, transform). Entity properties panel shows ID, transform (x/y/rotation/scale), components with remove buttons, and add component buttons.
4. **AI Command tab connects to real AI** — Shows "Connected to: clawgame-ai, Model: glm-4.5-flash". Generated actual TypeScript code for player movement with a proper diff view and Apply/Reject buttons.
5. **Asset Studio generated a sprite** — Typed a prompt for a pixel art spaceship, it generated in ~30 seconds and showed up in the assets list.
6. **Game Preview has a proper start screen** — "Start Game" button, controls listed (WASD/Arrows to move, SPACE to shoot), status indicator (⏹ Ready → ▶ Playing).

---

## ❌ What Was Broken

1. **AI generates wrong game type** — AI Command, Scene Editor / AI tab
   - Steps to reproduce: Ask AI "Create a space shooter player that moves with arrow keys and shoots bullets upward with spacebar"
   - Expected: Space shooter code with bullet spawning on spacebar, no gravity, free 4-directional movement
   - Actual: Generated a **platformer** movement system with gravity, jumping, and ground collision. Spacebar mapped to jump, not shoot. No bullet/projectile code at all.
   - Note: Warning banner said "⚠️ AI service offline — using local code generation" — the AI fell back to a generic platformer template instead of understanding the space shooter request.

2. **Applied AI code doesn't connect to game preview** — Code Editor / Play tab
   - Steps to reproduce: Apply the AI-generated player.ts code, then go to Play tab and start the game
   - Expected: The applied code changes how the game runs (e.g., player movement changes)
   - Actual: Game preview runs independently of the code editor. The Play tab shows a pre-built generic game regardless of what's in the code editor. No visible connection between applied AI code and runtime behavior.

3. **Asset Studio generated asset has no preview** — Asset Studio
   - Steps to reproduce: Generate a sprite, look at the result
   - Actual: Shows "✨ Sprite - A pixel art spaceship, top-dow" (truncated title) with "sprite ✓ pixel 30001ms 🎨" but no actual image thumbnail visible in the list. Clicking doesn't reveal a preview either.

4. **Dashboard shows duplicate "Test Game" projects** — Dashboard
   - 4 projects all named "Test Game" with identical metadata (draft, action, pixel, Apr 9, 2026). No way to tell them apart. No thumbnails.

---

## 😕 What Was Confusing

1. **AI "connected" but actually offline** — AI Command tab says "Real AI Connected" with green checkmarks, then the actual response says "⚠️ AI service offline — using local code generation." Contradictory status. Which is it?

2. **No clear relationship between tabs** — Scene Editor entities, Code Editor files, and Game Preview seem to be three completely independent systems. I created an enemy in Scene Editor, generated code in AI Command, but the Play tab runs something unrelated. What connects these?

3. **Code Editor file tree has no content** — Shows folders (assets, docs, scenes, scripts) but opening them reveals nothing meaningful. After AI "applied" player.ts, it's unclear where that code lives or how to find it in the file tree.

4. **Scene Editor canvas appears empty** — Screenshot shows a grid canvas but no visible entities rendered, even though the entity list shows player-1 and enemy-1. Are they there but invisible? No visual feedback.

5. **No way to delete projects from dashboard** — Multiple test projects piling up with no delete option visible.

---

## 💡 Feature Requests (Priority Order)

1. **[Critical]** Make AI code actually affect game preview — The core value prop is "AI builds your game." If applied AI code doesn't change what runs in the preview, the whole loop is broken. The code editor and runtime must be connected.

2. **[Critical]** Fix AI context awareness — When I say "space shooter," the AI should not generate platformer code with gravity. It needs to understand the project's genre/template or at least parse the user's prompt correctly. The fallback-to-template behavior silently produces wrong code.

3. **[High]** Honest AI status — If the AI service is offline, show that upfront instead of "✨ Real AI Features Available" with green status. Don't claim "Connected to: clawgame-ai" if it's going to fall back to local templates.

4. **[High]** Visual entities in Scene Editor — Entities should render as visible sprites/shapes on the canvas. An empty canvas with entities in a list is unusable for level design.

5. **[High]** Asset preview in Asset Studio — Generated assets should show thumbnail previews. A text label isn't enough to evaluate visual assets.

6. **[Medium]** Project management — Add delete, rename, and duplicate options for projects on the dashboard. Differentiate projects visually (thumbnails, unique colors).

7. **[Medium]** Keyboard shortcut documentation — ⌘K is mentioned everywhere but there's no cheatsheet or discoverable list of what commands are available.

8. **[Low]** Scene Editor drag-and-drop — The assets panel says "Drag assets from left panel to canvas" but there are no assets to drag. Should be clearer about the workflow (generate assets first → then drag to scene).

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Clean, modern UI. Good landing page with clear CTAs. |
| Onboarding | 2 | No tutorial, walkthrough, or first-run experience. Just dropped into the app. |
| Project Creation | 4 | Smooth, well-designed form. Template picker is nice. |
| Editor Usability | 2 | Scene editor canvas empty, code editor disconnected from runtime. |
| Game Preview | 2 | Runs something, but not YOUR game. No connection to your edits. |
| AI Features | 2 | Generates code but wrong type; status is misleading; code doesn't affect runtime. |
| Overall | 2.5 | Great UI shell, but core game creation loop is broken. |

---

## 📸 Screenshots

- Dashboard with duplicate Test Game projects
- Scene Editor with empty canvas despite 2 entities
- AI Command showing contradictory "connected" vs "offline" status
- Game Preview running generic game unrelated to project code
- Asset Studio with generated sprite but no image preview
