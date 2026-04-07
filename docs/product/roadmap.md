# ClawGame Roadmap

## Current Status: Milestone 3 (2D Runtime + Preview) - COMPLETED ✅

**Goal:** Create basic playable 2D games with live preview.

**Status:** ✅ Complete - Core engine and preview functionality working

### Completed Features
- ✅ Engine: 2D game loop with delta time
- ✅ Engine: Keyboard input (arrow keys + WASD)
- ✅ Engine: Entity rendering with shadows and highlights
- ✅ Engine: Player movement with bounds checking
- ✅ Engine: AI patrol patterns for enemies
- ✅ Frontend: Game preview page with canvas
- ✅ Frontend: Play/Stop/Reset controls
- ✅ Frontend: FPS counter and debug panel
- ✅ Frontend: Fixed critical bugs (keyboard input, editor content visibility)
- ✅ Frontend: Responsive canvas design

---

## Current Phase: Quality & AI Integration 🚧

**Goal:** Improve UX, fix remaining issues, connect AI services

## Recent Progress
- **Version 0.3.2**: Critical bugs fixed
- **Quality Improvements:** Fixed overlapping HUD, working debug panel
- **Documentation:** Updated project memory and sprint tracking
- **Build Status:** Working TypeScript compilation, clean builds

---

## Next Phase: Milestone 4 (Scene Editor) 🎯

**Goal:** Visual 2D scene editing component-based workflow

| Task | Status | Notes |
|------|--------|-------|
| Scene canvas editor | 📋 Not Started | Visual scene editor with entity manipulation |
| Component inspector | 📋 Not Started | Edit entity properties visually |
| Entity management | 📋 Not Started | Add/remove entities, set properties |
| Scene save/load | 📋 Not Started | JSON-based scene persistence |
| Enhanced debug panel | 📋 In Progress | Debug panel now functional, needs more features |

---

## Future Milestones

### Milestone 5: Asset Pipeline 🛠️

**Goal:** AI-generated assets via ComfyUI integration

| Task | Status | Notes |
|------|--------|-------|
| ComfyUI API integration | ⏳ Not Started | Connect to ComfyUI backend |
| Asset generation workflow | ⏳ Not Started | Prompt generation, asset creation |
| Asset library management | ⏳ Not Started | Store and organize generated assets |
| Texture/animation export | ⏳ Not Started | Export assets for game use |

### Milestone 6: Git + OpenClaw Operations 🔄

**Goal:** Native version control and agent-native operations

| Task | Status | Notes |
|------|--------|-------|
| Git integration UI | ⏳ Not Started | Git interface in web dashboard |
- Auto-commit on save | ⏳ Not Started | Auto-commit code changes
- Branch management | ⏳ Not Started | Create/switch branches
- Commit history | ⏳ Not Started | Visual commit timeline
- OpenClaw ops | ⏳ Not Started | Agent-native version control

### Milestone 7: AI-First Platform ✨

**Goal:** Full AI integration for game development

| Task | Status | Notes |
|------|--------|-------|
- Real AI backend | 🚧 Critical Next | Connect AI service for real code generation
- AI code completion | ⏳ Not Started | Smart autocomplete and suggestions
- Visual scripting | ⏳ Not Started | Drag-and-drop event system
- AI assistant chat | 🚧 In Progress | Interface exists, needs backend
- Performance prediction | ⏳ Not Started | AI optimization suggestions

---

## MVP Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| ✅ User can create a project from browser | Complete | Project creation works |
| ✅ User can describe a feature and AI implements it | Mock | Interface exists, needs backend |
| ✅ User can inspect AI-made file changes | Complete | CodeMirror editor works |
| ✅ User can run game in browser preview | Complete | 2D engine with canvas preview |
| ✅ User can visually edit a 2D scene | Next sprint | M4 Scene Editor planned |
| ✅ User can generate an asset via ComfyUI | Future | M5 Asset Pipeline |
| ✅ User can init and commit to Git | Future | M6 Git + OpenClaw |
| ✅ Project has stable metadata for OpenClaw | Complete | Multi-agent system working |
| ✅ Sample game template can be created and modified | Complete | Demo scene works |

---

## Quality Gates

| Area | Rating | Gap |
|------|--------|-----|
| Code Quality | B+ | Clean but needs testing coverage |
| Documentation | D+ | Just updated, still needs more detail |
| AI Integration | C | Interface good, backend missing |
| User Experience | B- | Core functionality works, UX polish needed |
| Performance | B | Good FPS, but bundle size high |

---

## Known Issues & Technical Debt

1. **Documentation Debt:** All project docs now updated
2. **Bundle Size:** 766KB > 500KB threshold
3. **AI Service:** Mock responses only
4. **File Tree:** Needs file watcher for auto-refresh
5. **Debug Features:** More options needed beyond grid/hitboxes

---

See also:
- [Current Sprint](../tasks/current_sprint.md)
- [Agent Messages](../ai/agent_messages.md)
- [Game Dev Feedback](../ai/game_dev_feedback.md)
- [PM Feedback](../ai/pm_feedback.md)
- [UI/UX Feedback](../ai/uiux_feedback.md)

## Last Updated: 2026-04-07
*Roadmap updated to reflect completed Milestone 3 and current quality improvements.*