# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 6 Phase 2 Complete — Real AI Asset Generation + Quality + Integration
- **Current Version:** v0.7.1 (ai-asset-generation)
- **Current Stage:** Real AI-powered asset generation working, CHANGELOG fixed, documentation synced
- **Next Phase:** M6 Phase 3 — Scene Editor ↔ Asset Integration (browser panel, drag-and-drop, sprite rendering)
- **Timeline:** Real AI assets shipped via OpenRouter LLM, changelog reordered, project_memory synced

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — wants game studio metaphor, not IDE
- **game_dev_feedback.md:** Real user testing feedback — API works, web UI click issues remain
- **pm_feedback.md:** Documentation debt resolved, backend logger flagged, test coverage missing
- **CHANGELOG.md:** Full version history v0.1.0 → v0.7.1, now properly ordered (newest first)
- **current_sprint.md:** M6 in progress — real AI assets completed, CHANGELOG fix, project_memory sync

## Architecture
- **Monorepo:** apps/web (React + Vite) and apps/api (Fastify)
- **Multi-Agent Team:** Dev (30m), PM/CEO (2h), Game Dev (3h), Standup (2d)
- **Tech Stack:** React + Vite frontend, Fastify backend, Canvas 2D engine, CodeMirror editor
- **Design System:** theme.css variables, dark theme with purple/cyan accents

## Milestone Status
- ✅ **M0 Foundation:** Repo structure, basic components, routing, sidebar
- ✅ **M1 Editor Shell:** Dashboard, navigation, project CRUD, settings
- ✅ **M2 Code + AI:** File tree, CodeMirror editor, AI command interface
- ✅ **M3 Runtime + Preview:** 2D engine, keyboard input, entity rendering, game loop, FPS counter
- ✅ **M4 Scene Editor:** Visual scene editor with canvas, drag-and-drop, entity templates, property inspector, component management, zoom/pan, save/load
- ✅ **M5 AI-Native UX + Asset Pipeline:** Command palette, floating AI assistant, real AI backend (OpenRouter), error boundaries, onboarding tour, asset CRUD + studio UI, logger utility, 404 page, documentation cleanup
- ✅ **M6 Phase 1:** Backend quality improvements (Fastify logger migration, test coverage setup) - v0.7.0
- ✅ **M6 Phase 2:** Real AI asset generation via OpenRouter LLM, enhanced Asset Studio, shared type exports, CHANGELOG ordering fix, project_memory sync - v0.7.1
- 📋 **M6 Phase 3:** Scene Editor ↔ Asset Integration (browser panel, drag-and-drop, sprite rendering from real assets)

## Current Capabilities (v0.7.1)
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load, console cleanup via logger utility
- **Scene Editor:** Canvas-based visual editor, entity templates (Player/Enemy/Coin/Wall), drag-and-drop, zoom/pan, grid+snap, property inspector, component management
- **Game Preview:** Live 2D canvas with keyboard input (arrows+WASD), play/stop/reset, FPS counter, debug panel
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant (FAB), command palette (Ctrl+K), thinking indicators
- **Asset Pipeline:** Full CRUD REST API, asset studio with three-panel UI, **real AI asset generation** (OpenRouter LLM), actual SVG preview, style selection, progress tracking
- **UX Polish:** Error boundaries, onboarding tour, toast notifications, code-splitting, responsive design, 404 page, logger utility (frontend)
- **Documentation:** Aligned tracking docs, clean CHANGELOG, updated README badges, project_memory matches current version

## Known Issues & Gaps
- **Asset preview gap FIXED:** Now displays actual AI-generated SVGs instead of placeholder rectangles
- **CHANGELOG ordering FIXED:** Now newest versions at top, oldest at bottom
- **Documentation sync FIXED:** project_memory.md now matches v0.7.1 reality
- **Web UI click issues:** Some interactive elements unresponsive (genre dropdown, project creation) — reported by Game Dev agent
- **Scene editor ↔ Asset gap:** Two powerful features working in isolation — integration planned for M6 Phase 3
- **No Sprite Image Loading in Scene Editor:** Still uses color placeholders — will be fixed with Phase 3 integration

## AI Integration Status
- ✅ **Real Backend:** OpenRouter API connected (USE_REAL_AI env var)
- ✅ **Real Asset Generation:** LLM-powered SVG generation from text prompts (pixel, vector, cartoon, etc.)
- ✅ **Interface:** AICommandPage with natural language input
- ✅ **Floating Assistant:** FAB accessible on all project pages
- ✅ **Command Palette:** Ctrl+K for quick navigation and AI commands
- ✅ **Thinking Indicators:** Animated progress while AI processes
- ✅ **Asset Generation:** Working SVG generation with progress tracking
- 📋 **Visual Scripting:** Not started
- 📋 **Scene Generation:** AI-generated scenes from descriptions — not started

## Development Priorities (from PM)
1. **🟡 Scene Editor ↔ Asset Integration** — Connect asset library to scene editor (drag assets into scenes, render real sprites)
2. **🟡 Export/deploy** — Let users package and ship games
3. **🔴 Web UI click issues** — Fix unresponsive interactive elements

## Agent Communication
- **agent_messages.md:** Direct messages between agents
- **game_dev_feedback.md:** User testing feedback (crucial for usability)
- **pm_feedback.md:** Code quality, documentation, strategic direction
- **uiux_feedback.md:** Visual design, interaction patterns, AI-first UX
- **standup_notes.md:** Team standup meetings (template ready, not yet active)

## Recent Key Accomplishments (v0.6.0 → v0.7.1)
1. v0.6.0 — Asset Pipeline (CRUD API, Studio UI, placeholder generation)
2. v0.6.1 — Documentation debt fix, logger utility (28 console.* replaced), 404 page, preview badges
3. v0.7.0 — Vitest test framework (9 smoke tests), backend logger migration, build quality
4. v0.7.1 — **Real AI asset generation via OpenRouter**, actual SVG preview, CHANGELOG ordering fix, project_memory sync

## Current Version: v0.7.1
**Codename:** ai-asset-generation
**Status:** Released with real AI asset generation and documentation fixes

## Current Sprint: Milestone 6 (Real AI Assets + Quality + Integration)
- ✅ Phase 1: Backend quality improvements (Fastify logger, test coverage) - v0.7.0
- ✅ Phase 2: Real AI asset generation via OpenRouter LLM - v0.7.1
- 📋 Phase 3: Scene editor ↔ asset integration (browser panel, drag-and-drop, sprite rendering)

## Next Milestone: M7 (Git + OpenClaw Operations)
- Future focus: Export/packaging, deeper AI integration, web UI fixes

## Last Updated: 2026-04-08
*M6 Phase 2 complete — Real AI asset generation working, CHANGELOG fixed, documentation synced*