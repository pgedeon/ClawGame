# Game Developer Feedback

**Last Session:** 2026-04-08 11:42 UTC
**Session Type:** Game Creation Test (Full Platform Walkthrough)
**Tester:** @gamedev (AI Game Developer Agent)

---

## 🎮 What I Tried To Build

I attempted to create **"Galaxy Defender"** — a top-down space shooter where the player pilots a ship, dodges asteroids, and blasts alien invaders across 3 waves with power-up drops from destroyed enemies. I used the Top-Down Action template with Pixel Art style.

---

## ✅ What Worked

1. **Project Creation Flow** — Clean, intuitive. Template selection with previews is excellent. Genre dropdown, art style radio buttons, and description field all worked. The form auto-updated the submit button text to "Create Top-Down Action" based on selection.

2. **Dashboard Design** — Polished landing page with clear CTAs. "Your Projects" section, Quick Actions cards, and the pro tip about ⌘K were all helpful. Professional visual design.

3. **Code Workspace** — File explorer with collapsible folders worked well. The project came with scaffolded files (`scripts/game.ts`, `scripts/player.ts`, `clawgame.project.json`). Quick Start buttons ("Add Enemy AI", "Create Scene", "Add Player Code") are a great UX touch.

4. **Scene Editor** — The best feature of the platform. Entity list with real properties (Transform: X/Y/Rotation/Scale), component system (movement, sprite, collision, stats), and Add Component dropdown. Grid/snap/zoom controls. Entity selection shows detailed property panel. This felt genuinely usable.

5. **Examples/Template Gallery** — 8 well-categorized templates with difficulty ratings, feature lists, and learning outcomes. The "Use Template" buttons worked. This is one of the most polished pages.

6. **Navigation Structure** — Top nav (Editor, Scene Editor, AI Command, Asset Studio, Game Preview) + sub-nav (Overview, Scene Editor, Code Editor, AI Command, Assets, Play, Export). Dual navigation provides good context switching.

7. **Project Templates** — The auto-generated project had entities (player-1, enemy-1, powerup-1) with reasonable default components and transforms. Good starting point.

8. **Onboarding** — Welcome modals with step-by-step guides and "Don't show again" options. Well-intentioned, though execution had bugs (see below).

---

## ❌ What Was Broken

1. **CRITICAL: Project Data Loss** — Created "Galaxy Defender" successfully, viewed the project page, but within minutes the project vanished entirely from the API. Dashboard went from showing 4 projects to 2. `GET /api/projects` no longer includes the new project. Another project ("Star Blaster") also disappeared. Projects appear to be stored **in memory only** with no persistence — API restarts or memory pressure destroys all work.

2. **CRITICAL: Game Preview Runtime Crash** — Tried to play "Eclipse of Runes" (existing project). Clicking "Start Game" immediately crashed with: `Cannot read properties of undefined (reading 'transform')`. The game engine has null reference errors when trying to access entity transforms that don't exist.

3. **CRITICAL: Asset Studio "Project Not Found"** — Navigating to `/project/0RgouKKs3rI/assets` shows "Project not found" with no project context. The page loses all navigation context (no nav links). Same issue occurs on `/preview` and `/export` routes for newly created projects. The route parameter parsing appears broken for certain pages.

4. **HIGH: AI Command Hangs** — Submitted "Create a simple player movement system" via the AI Command page. The processing indicators appeared (Analyzing... Understanding... Generating... Reviewing...) but the response never completed. After 15+ seconds, still showing loading spinner (⏳). The mock AI service appears to hang indefinitely.

5. **MEDIUM: Onboarding Modal Buttons Unclickable** — The "Start exploring on my own", "Close", and "Don't show again" buttons on welcome modals consistently time out on click (8 second timeout). Only Escape key works to dismiss them. This affects all pages with modals.

6. **MEDIUM: Export Doesn't Actually Export** — Clicking "Export Game" on the Export page produces no file download. Export History stays at 0. The button appears to do nothing — likely a placeholder.

7. **LOW: Code Editor Content Not Visible** — When opening `game.ts` in the Code Workspace, the file appears selected but the actual code content isn't readable in the accessibility tree. The textbox shows as empty even though the file has content.

8. **LOW: Settings Page Empty** — The `/settings` page shows all fields as "Coming soon..." — no actual settings are configurable.

---

## 😕 What Was Confusing

1. **AI Preview Mode vs Real AI** — The AI Command page confusingly says both "Preview Mode Active" and "Real AI-powered game development assistance" at different times. The heading changed between visits. Unclear whether AI actually works or not.

2. **What does "AI-Ready" mean?** — Templates are tagged "AI-Ready" but there's no explanation of what this means. Does the AI know about these templates? Can it generate code specific to them?

3. **File → Code mapping** — I see files in the code workspace (game.ts, player.ts) but it's unclear how they connect to the Scene Editor entities. Can I edit entity behavior from the code editor? How do scripts attach to entities?

4. **Missing "Save" indicator** — The Code Workspace has a "Save" button (disabled) but no indication of when files auto-save vs need manual save. No "last saved" timestamp or dirty state indicator.

5. **Project status "draft"** — All projects show "draft" status. What are the other statuses? How do I publish? Is "draft" the only state?

6. **Engine Configuration panel** — The project overview has an "Engine Configuration" section that appears empty/collapsed with no way to expand or configure it.

---

## 💡 Feature Requests (Priority Order)

1. **[CRITICAL] Project Persistence** — Save projects to disk (filesystem or database). Every restart loses all work. This is the #1 blocking issue.

2. **[CRITICAL] Fix Game Preview Engine** — The runtime engine crashes on null entity references. Need defensive coding: check for undefined entities before accessing properties.

3. **[HIGH] Fix Asset Studio / Preview / Export Routes** — These pages can't load projects. Route parameter parsing or project context injection is broken for these specific routes.

4. **[HIGH] Make AI Actually Work** — Either enable real AI (OpenRouter integration already exists in the API) or fix the mock service to return responses instead of hanging.

5. **[HIGH] Entity ↔ Code Linkage** — Make it clear how scene entities connect to code scripts. Show which script controls which entity, and allow jumping between them.

6. **[MEDIUM] Fix Onboarding Modal Buttons** — Close/Dismiss buttons are unclickable. Only Escape works.

7. **[MEDIUM] Working Export** — Export as standalone HTML is a killer feature for a web game engine. Currently non-functional.

8. **[MEDIUM] Error Recovery** — When the game preview crashes, offer a "Report Bug" button or "Open Console" link instead of just showing a raw error stack.

9. **[LOW] Code Editor Syntax Highlighting** — The code editor needs proper syntax highlighting for TypeScript. Currently appears as a plain textarea.

10. **[LOW] Asset Library** — The Asset Studio needs to actually generate/manage sprites. Currently shows "No assets yet" with no way to add them.

11. **[LOW] Real-time Collaboration Indicator** — Show whether AI is available, in preview mode, or disconnected. The current messaging is contradictory.

---

## 📊 User Experience Score

| Area | Rating (1-5) | Notes |
|------|--------------|-------|
| First Impression | 4 | Beautiful landing page, clear CTAs, professional design |
| Onboarding | 3 | Good intent with welcome modals, but buttons are broken and modals are annoying |
| Project Creation | 4 | Clean flow, template selection is great, auto-generated scaffold is helpful |
| Code Editor | 2 | File explorer works but code content not visible, no syntax highlighting |
| Scene Editor | 4 | Best feature! Entity properties, components, canvas all work well |
| AI Features | 1 | Completely non-functional. Hangs on every request. Confusing preview mode messaging |
| Game Preview | 1 | Crashes immediately with null reference error. Can't play any game |
| Asset Studio | 1 | "Project not found" error, completely broken |
| Export | 2 | Nice UI but non-functional. Buttons do nothing |
| Overall | 2 | Great design and vision, but core functionality is broken. Can't actually build or play a game yet. |

---

## 🏗️ Architecture Notes

- **Frontend:** React + Vite, well-structured routing, TailwindCSS styling
- **Backend:** Fastify API, in-memory project storage (critical issue)
- **Game Engine:** Custom canvas-based renderer (v0.1.0) with entity/component system
- **AI:** OpenRouter integration exists in API but frontend is stuck in "Preview Mode"
- **Data:** No persistence layer — projects live and die with the API process

---

## 📸 Screenshots

Screenshots were taken at each step. Key screenshots:
1. Dashboard — Clean, professional landing
2. Create Project — Well-designed form with templates
3. Project Overview — Onboarding modal with broken dismiss buttons
4. Code Workspace — File explorer working, code content not visible
5. Scene Editor — Best feature, entity properties working
6. AI Command — Hanging on processing
7. Asset Studio — "Project not found" error
8. Game Preview — Runtime crash with undefined transform error
9. Export Page — Nice UI but non-functional
10. Template Gallery — Excellent, 8 well-described templates
