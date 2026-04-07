# ClawGame Roadmap

## Current Status: Milestone 5 (AI-Native UX Foundation) - IN PROGRESS 🚧

**Goal:** Make AI feel native and omnipresent. Fix UX gaps. Polish.

**Started:** 2026-04-07 19:00 UTC

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

---

## Current Phase: Milestone 5 — Asset Pipeline + Real AI 🎯

**Goal:** Connect real AI services and asset generation

| Task | Status | Notes |
|------|--------|-------|
| AI backend integration | ⏳ Not Started | Connect real LLM for code generation |
| Toast integration in editors | ⏳ Not Started | Add toasts to save/load/create actions |
| Asset generation workflow | ⏳ Not Started | ComfyUI or placeholder generation |
| Enhanced onboarding | ⏳ Not Started | Welcome flow, template gallery |

---

## Future Milestones

### Milestone 6: Git + OpenClaw Operations 🔄

| Task | Status | Notes |
|------|--------|-------|
| Git integration UI | ⏳ Not Started | Git interface in web dashboard |
| Auto-commit on save | ⏳ Not Started | Auto-commit code changes |
| Branch management | ⏳ Not Started | Create/switch branches |

### Milestone 7: Visual Scripting ✨

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
| 🚧 User can describe feature and AI implements | In Progress | Interface ready, backend pending |
| ⏳ User can generate an asset via AI | Future | M5 Asset Pipeline |
| ⏳ User can init and commit to Git | Future | M6 Git + OpenClaw |

---

## Known Issues & Technical Debt

1. **AI Service:** Mock responses — backend integration pending
2. **Bundle Size:** Resolved via code-splitting (largest chunk: 496KB CodeMirror vendor)
3. **File Tree:** Needs file watcher for auto-refresh
4. **No Sprite Image Loading:** Scene editor uses color placeholders only
5. **No Undo/Redo:** Scene editor and editor pages lack undo history

---

See also:
- [Current Sprint](../tasks/current_sprint.md)
- [Backlog](../tasks/backlog.md)
- [PM Feedback](../ai/pm_feedback.md)
- [UI/UX Feedback](../ai/uiux_feedback.md)
- [Game Dev Feedback](../ai/game_dev_feedback.md)

## Last Updated: 2026-04-07
