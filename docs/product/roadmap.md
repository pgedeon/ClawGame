# ClawGame Roadmap

## Current Status: Milestone 6 — IN PROGRESS 🚧

**Goal:** Ship real AI asset generation, add test coverage, connect scene editor to assets, backend quality.

**Started:** 2026-04-08

---

## Completed Milestones

### Milestone 1: Foundation ✅
- Monorepo scaffold (pnpm workspaces)
- React + Vite frontend, Fastify backend
- Project CRUD API
- Design system tokens

### Milestone 2: Code Workspace ✅
- File workspace with tree, editor, search
- Backend file API
- CodeMirror 6 integration
- AI command panel scaffold

### Milestone 3: 2D Runtime + Preview ✅
- 2D game engine with delta time, game loop
- Keyboard input (WASD + arrows)
- Entity rendering, player movement, AI patrol
- Game preview page with canvas, FPS counter, debug panel

### Milestone 4: Visual Scene Editor ✅
- Canvas-based visual editor with zoom/pan
- Entity templates (Player, Enemy, Coin, Wall)
- Property inspector (Transform, Components)
- Scene save/load as JSON
- Keyboard shortcuts, grid, snapping

### Milestone 4.1: Quality Fixes ✅
- Code editor visibility fixed
- Dark mode contrast (WCAG AA)
- AI Command honest preview mode
- Fullscreen preview toggle
- Focus indicators for accessibility

### Milestone 4.5: AI-Native UX Foundation ✅ (v0.5.0)
- Command Palette (Ctrl+K)
- Floating AI assistant (FAB)
- Toast notification system
- Code-splitting (lazy pages, vendor chunks)
- Sidebar command search bar

### Milestone 5: AI-Native UX + Real AI + Asset Pipeline ✅ (v0.5.0 → v0.6.1)

| Task | Status | Version |
|------|--------|---------|
| AI backend integration | ✅ Done | v0.5.2 — OpenRouter API connected |
| Toast integration in editors | ✅ Done | v0.5.1 — FileWorkspace wired |
| Asset generation workflow | ✅ Done | v0.6.0 — Placeholder SVGs, real AI to follow |
| Asset Studio UI | ✅ Done | v0.6.0 — Three-panel, CRUD, filtering |
| Command Palette | ✅ Done | v0.5.0 — Ctrl+K, keyboard nav |
| Floating AI Assistant | ✅ Done | v0.5.0 — FAB on all project pages |
| Error Boundaries | ✅ Done | v0.5.3 — Graceful failure |
| Onboarding Tour | ✅ Done | v0.5.3 — 4-step AI-first intro |
| Logger utility (frontend) | ✅ Done | v0.6.1 — Silent in prod, verbose in dev |
| 404 Page | ✅ Done | v0.6.1 — Styled not-found page |
| Documentation cleanup | ✅ Done | v0.6.1 — Memory, README, CHANGELOG aligned |

### Milestone 6 Phase 1: Backend Quality ✅ (v0.7.0)

| Task | Status | Version |
|------|--------|---------|
| Backend logger migration (console → pino) | ✅ Done | v0.7.0 — All 8 console.* calls replaced |
| Vitest test framework setup | ✅ Done | v0.7.0 — 9 API smoke tests passing |
| Build fix (TS export conflict) | ✅ Done | v0.7.0 — RealAIService logger migration |
| M5 docs officially closed | ✅ Done | v0.7.0 — Roadmap, sprint, memory aligned |

---

## Current Phase: Milestone 6 — Phase 2+ (In Progress)

| Task | Status | Notes |
|------|--------|-------|
| Real AI asset generation (ComfyUI) | ⏳ Not Started | #1 differentiator — flagship feature |
| Scene editor ↔ Asset pipeline integration | ⏳ Not Started | Drag assets from library into scenes |
| Export/packaging pipeline | ⏳ Not Started | Let users ship games |
| Visual scripting foundation | ⏳ Not Started | Node-based event system |

---

## Future Milestones

### Milestone 7: Git + OpenClaw Operations 🔄

| Task | Status | Notes |
|------|--------|-------|
| Git integration UI | ⏳ Not Started | Git interface in web dashboard |
| Auto-commit on save | ⏳ Not Started | Auto-commit code changes |
| Branch management | ⏳ Not Started | Create/switch branches |

### Milestone 8: Visual Scripting ✨

| Task | Status | Notes |
|------|--------|-------|
| Node-based event system | ⏳ Not Started | Visual scripting editor |
| AI-assisted scripting | ⏳ Not Started | AI generates visual logic |
| Debug visualizer | ⏳ Not Started | Visual debugging tools |

---

## MVP Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| ✅ User can create a project from browser | Complete | Dashboard → Create Project flow |
| ✅ User can inspect file changes in editor | Complete | CodeMirror with syntax highlighting |
| ✅ User can run game in browser preview | Complete | 2D canvas with FPS/debug |
| ✅ User can visually edit a 2D scene | Complete | Scene editor with drag-drop |
| ✅ User can describe feature and AI implements | Complete | OpenRouter API connected |
| 🚧 User can generate an asset via AI | In Progress | Placeholder SVGs, ComfyUI next |
| ⏳ User can init and commit to Git | Future | M7 Git + OpenClaw |

---

## Known Issues & Technical Debt

1. **Asset generation is placeholder** — SVG rectangles, not real AI art. ComfyUI integration is M6 flagship.
2. **Scene editor ↔ Asset gap** — Two powerful features working in isolation.
3. **No Sprite Image Loading** — Scene editor uses color placeholders only.
4. **No Undo/Redo** — Scene editor and editor pages lack undo history.

---

See also:
- [Current Sprint](../tasks/current_sprint.md)
- [Backlog](../tasks/backlog.md)
- [PM Feedback](../ai/pm_feedback.md)
- [UI/UX Feedback](../ai/uiux_feedback.md)
- [Game Dev Feedback](../ai/game_dev_feedback.md)

## Last Updated: 2026-04-08
