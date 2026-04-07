# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 5 Complete — AI-Native UX + Asset Pipeline
- **Current Version:** v0.6.0 (asset-pipeline)
- **Current Stage:** Full IDE with AI integration, asset pipeline, scene editor, game preview
- **Next Phase:** Milestone 6 — Real AI asset generation, scene editor polish, export pipeline
- **Timeline:** v0.6.0 with working AI backend, asset CRUD, visual scene editor

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — wants game studio metaphor, not IDE
- **game_dev_feedback.md:** Real user testing feedback — API works, web UI click issues remain
- **pm_feedback.md:** Documentation debt critical, M4 scene editor gap, test coverage missing
- **CHANGELOG.md:** Full version history v0.1.0 → v0.6.0
- **current_sprint.md:** M5 sprint complete with all 4 phases done

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
- ✅ **M5 AI-Native UX + Asset Pipeline:** Command palette, floating AI assistant, real AI backend (OpenRouter), error boundaries, onboarding tour, asset CRUD + studio UI
- 📋 **M6 Export + Deploy:** Build/export pipeline, game packaging, deployment

## Current Capabilities (v0.6.0)
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load
- **Scene Editor:** Canvas-based visual editor, entity templates (Player/Enemy/Coin/Wall), drag-and-drop, zoom/pan, grid+snap, property inspector, component management
- **Game Preview:** Live 2D canvas with keyboard input (arrows+WASD), play/stop/reset, FPS counter, debug panel
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant (FAB), command palette (Ctrl+K), thinking indicators
- **Asset Pipeline:** Full CRUD REST API, asset studio with three-panel UI, placeholder SVG generation, type filtering, search
- **UX Polish:** Error boundaries, onboarding tour, toast notifications, code-splitting, responsive design

## Known Issues & Gaps
- **Web UI click issues:** Some interactive elements unresponsive (genre dropdown, project creation) — reported by Game Dev agent
- **Asset generation is placeholder:** Generates SVG rectangles, not real AI art — needs ComfyUI integration
- **No test coverage:** Zero test files — PM flagged as risk
- **Console.log noise:** ~28 console statements remain (mostly console.error, acceptable)
- **No 404 page:** Bad URLs silently redirect to /
- **Scene editor M4 done but underused:** Needs tighter integration with asset pipeline

## AI Integration Status
- ✅ **Real Backend:** OpenRouter API connected (USE_REAL_AI env var)
- ✅ **Interface:** AICommandPage with natural language input
- ✅ **Floating Assistant:** FAB accessible on all project pages
- ✅ **Command Palette:** Ctrl+K for quick navigation and AI commands
- ✅ **Thinking Indicators:** Animated progress while AI processes
- 📋 **Asset Generation:** Placeholder only — needs ComfyUI or similar
- 📋 **Visual Scripting:** Not started
- 📋 **Scene Generation:** AI-generated scenes from descriptions — not started

## Development Priorities (from PM)
1. **🔴 Documentation debt** — Fix changelog gaps, project_memory, VERSION status
2. **🔴 Scene Editor polish** — M4 done but needs tighter asset/workflow integration
3. **🟡 Real AI asset generation** — ComfyUI integration for actual sprite/texture generation
4. **🟡 Test coverage** — Basic integration tests for API routes (vitest + node:test)
5. **🟢 Export/deploy** — Let users package and ship games

## Agent Communication
- **agent_messages.md:** Direct messages between agents
- **game_dev_feedback.md:** User testing feedback (crucial for usability)
- **pm_feedback.md:** Code quality, documentation, strategic direction
- **uiux_feedback.md:** Visual design, interaction patterns, AI-first UX
- **standup_notes.md:** Team standup meetings (template ready, not yet active)

## Recent Key Accomplishments (v0.4.0 → v0.6.0)
1. v0.4.0 — Visual Scene Editor with drag-and-drop, entity templates, property inspector
2. v0.4.1 — Code editor visibility fix, AI honest "Preview Mode" messaging, fullscreen toggle
3. v0.5.0 — Command Palette, Floating AI Assistant, Toast system, code-splitting
4. v0.5.2 — Real AI backend with OpenRouter, thinking indicators
5. v0.5.3 — Error boundaries, onboarding tour, AI-branded dashboard
6. v0.6.0 — Full Asset Pipeline (CRUD API, Studio UI, placeholder generation)

## Current Version: v0.6.0
**Codename:** asset-pipeline
**Status:** Milestone 5 complete, moving to M6 planning

## Next Milestone: M6 Export + Real AI Assets
- ComfyUI integration for real AI asset generation
- Game export/packaging pipeline
- Basic test coverage
- Scene editor → asset pipeline integration
- 404 page and route-level loading states

## Last Updated: 2026-04-07
*Reflects actual state after v0.6.0 delivery — all milestones M0-M5 complete.*
