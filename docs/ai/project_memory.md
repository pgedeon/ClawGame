# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 5 Complete — AI-Native UX + Asset Pipeline
- **Current Version:** v0.7.0 (quality-gate)
- **Current Stage:** Full IDE with AI integration, asset pipeline, scene editor, game preview, documentation debt resolved
- **Next Phase:** Milestone 6 — Real AI asset generation (ComfyUI), test coverage, scene editor ↔ asset integration
- **Timeline:** v0.6.1 with clean docs, working backend logger, vitest setup

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — wants game studio metaphor, not IDE
- **game_dev_feedback.md:** Real user testing feedback — API works, web UI click issues remain
- **pm_feedback.md:** Documentation debt resolved, backend logger flagged, test coverage missing
- **CHANGELOG.md:** Full version history v0.1.0 → v0.6.1
- **current_sprint.md:** M6 in progress — real AI assets, tests, integration improvements

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
- 📋 **M6 Real AI + Quality + Integration:** ComfyUI asset generation, test coverage, scene editor ↔ asset integration, backend logger migration

## Current Capabilities (v0.6.1)
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load, console cleanup via logger utility
- **Scene Editor:** Canvas-based visual editor, entity templates (Player/Enemy/Coin/Wall), drag-and-drop, zoom/pan, grid+snap, property inspector, component management
- **Game Preview:** Live 2D canvas with keyboard input (arrows+WASD), play/stop/reset, FPS counter, debug panel
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant (FAB), command palette (Ctrl+K), thinking indicators
- **Asset Pipeline:** Full CRUD REST API, asset studio with three-panel UI, placeholder SVG generation, type filtering, search, preview mode badges
- **UX Polish:** Error boundaries, onboarding tour, toast notifications, code-splitting, responsive design, 404 page, logger utility (frontend)
- **Documentation:** Aligned tracking docs, clean CHANGELOG, updated README badges, project_memory matches current version

## Known Issues & Gaps
- **Web UI click issues:** Some interactive elements unresponsive (genre dropdown, project creation) — reported by Game Dev agent
- **Asset generation is placeholder:** Generates SVG rectangles, not real AI art — needs ComfyUI integration (M6 flagship)
- **No test coverage:** Zero test files — vitest setup in progress
- **Backend console statements:** 8 console.* calls in API code — migrating to Fastify logger in progress
- **Scene editor ↔ Asset gap:** Two powerful features working in isolation — integration planned for M6
- **No Sprite Image Loading:** Scene editor uses color placeholders only — will be fixed with real asset integration

## AI Integration Status
- ✅ **Real Backend:** OpenRouter API connected (USE_REAL_AI env var)
- ✅ **Interface:** AICommandPage with natural language input
- ✅ **Floating Assistant:** FAB accessible on all project pages
- ✅ **Command Palette:** Ctrl+K for quick navigation and AI commands
- ✅ **Thinking Indicators:** Animated progress while AI processes
- 📋 **Asset Generation:** Placeholder only — ComfyUI integration planned for M6
- 📋 **Visual Scripting:** Not started
- 📋 **Scene Generation:** AI-generated scenes from descriptions — not started

## Development Priorities (from PM)
1. **🔴 Backend quality** — Replace console.* with Fastify logger (8 calls pending)
2. **🔴 Test coverage** — Add vitest + basic API smoke tests (currently zero coverage)
3. **🟡 Real AI asset generation** — ComfyUI integration for actual sprite/texture generation (M6 flagship)
4. **🟡 Scene editor integration** — Connect asset library to scene editor (drag assets into scenes)
5. **🟢 Export/deploy** — Let users package and ship games

## Agent Communication
- **agent_messages.md:** Direct messages between agents
- **game_dev_feedback.md:** User testing feedback (crucial for usability)
- **pm_feedback.md:** Code quality, documentation, strategic direction
- **uiux_feedback.md:** Visual design, interaction patterns, AI-first UX
- **standup_notes.md:** Team standup meetings (template ready, not yet active)

## Recent Key Accomplishments (v0.4.0 → v0.6.1)
1. v0.4.0 — Visual Scene Editor with drag-and-drop, entity templates, property inspector
2. v0.4.1 — Code editor visibility fix, AI honest "Preview Mode" messaging, fullscreen toggle
3. v0.5.0 — Command Palette, Floating AI Assistant, Toast system, code-splitting
4. v0.5.2 — Real AI backend with OpenRouter, thinking indicators
5. v0.5.3 — Error boundaries, onboarding tour, AI-branded dashboard
6. v0.6.0 — Full Asset Pipeline (CRUD API, Studio UI, placeholder generation)
7. v0.6.1 — Documentation debt fix, logger utility (28 console.* replaced), 404 page, preview badges

## Current Version: v0.7.0
**Codename:** doc-cleanup
**Status:** Released with documentation debt resolved

## Next Milestone: M6 Real AI Assets + Quality + Integration
- ComfyUI integration for real AI asset generation (flagship feature)
- Basic test coverage with vitest
- Scene editor → asset pipeline integration (drag assets into scenes)
- Backend logger migration (Fastify pino instead of console.*)
- Export/packaging pipeline

## Last Updated: 2026-04-08
*M6 in progress — backend quality improvements, test coverage, real AI assets*