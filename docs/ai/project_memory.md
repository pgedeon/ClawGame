# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 6 Phase 3 Complete — Scene Editor ↔ Asset Integration Shipped
- **Current Version:** v0.8.0 (asset-integration)
- **Current Stage:** Scene editor integrated with asset browser, drag-and-drop working, sprite rendering from real assets, component decomposition complete
- **Next Phase:** M6 Phase 4 — Export & Packaging (standalone HTML export, asset bundling, download workflow)
- **Timeline:** Asset browser panel shipped in v0.8.0, health endpoint version fixed, SceneEditorPage decomposed from 1270 → 528 lines

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — wants game studio metaphor, not IDE
- **game_dev_feedback.md:** Real user testing feedback — API works, web UI click issues remain
- **pm_feedback.md:** Documentation debt resolved, backend logger flagged, test coverage missing
- **CHANGELOG.md:** Full version history v0.1.0 → v0.8.0, properly ordered (newest first)
- **current_sprint.md:** M6 Phase 3 complete, Phase 4 in progress

## Architecture
- **Monorepo:** apps/web (React + Vite) and apps/api (Fastify)
- **Multi-Agent Team:** Dev (30m), PM/CEO (2h), Game Dev (3h), Standup (2d)
- **Tech Stack:** React + Vite frontend, Fastify backend, Canvas 2D engine, CodeMirror editor
- **Design System:** theme.css variables, dark theme with purple/cyan accents
- **Component Architecture:** SceneEditorPage now orchestrates three decomposed components (AssetBrowserPanel, SceneCanvas, PropertyInspector)

## Milestone Status
- ✅ **M0 Foundation:** Repo structure, basic components, routing, sidebar
- ✅ **M1 Editor Shell:** Dashboard, navigation, project CRUD, settings
- ✅ **M2 Code + AI:** File tree, CodeMirror editor, AI command interface
- ✅ **M3 Runtime + Preview:** 2D engine, keyboard input, entity rendering, game loop, FPS counter
- ✅ **M4 Scene Editor:** Visual scene editor with canvas, drag-and-drop, entity templates, property inspector, component management, zoom/pan, save/load
- ✅ **M5 AI-Native UX + Asset Pipeline:** Command palette, floating AI assistant, real AI backend (OpenRouter), error boundaries, onboarding tour, asset CRUD + studio UI, logger utility, 404 page, documentation cleanup
- ✅ **M6 Phase 1:** Backend quality improvements (Fastify logger migration, test coverage setup) - v0.7.0
- ✅ **M6 Phase 2:** Real AI asset generation via OpenRouter LLM, enhanced Asset Studio, shared type exports, CHANGELOG ordering fix, project_memory sync - v0.7.1
- ✅ **M6 Phase 3:** Scene Editor ↔ Asset Integration (browser panel, drag-and-drop, sprite rendering from real assets, component decomposition) - v0.8.0
- 📋 **M6 Phase 4:** Export & Packaging (standalone HTML export, asset bundling, download workflow)

## Current Capabilities (v0.8.0)
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load, console cleanup via logger utility
- **Scene Editor:** Canvas-based visual editor, entity templates (Player/Enemy/Coin/Wall), drag-and-drop, zoom/pan, grid+snap, property inspector, component management
- **Asset Browser Panel:** Left sidebar showing all project assets with thumbnails, search/filter by type, drag-and-drop to canvas
- **Scene Canvas:** Main canvas area with entity placement, selection, asset image rendering (SVG/PNG/WebP), viewport controls, keyboard shortcuts
- **Property Inspector:** Right sidebar for entity properties, component management (add/remove), entity list, transform editing
- **Game Preview:** Live 2D canvas with keyboard input (arrows+WASD), play/stop/reset, FPS counter, debug panel
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant (FAB), command palette (Ctrl+K), thinking indicators
- **Asset Pipeline:** Full CRUD REST API, asset studio with three-panel UI, **real AI asset generation** (OpenRouter LLM), actual SVG preview, style selection, progress tracking, drag-and-drop to scene editor
- **Component Architecture:** SceneEditorPage (528 lines) orchestrates AssetBrowserPanel (207 lines), SceneCanvas (332 lines), PropertyInspector (167 lines) — clean separation of concerns
- **UX Polish:** Error boundaries, onboarding tour, toast notifications, code-splitting, responsive design, 404 page, logger utility (frontend)
- **Documentation:** Aligned tracking docs, clean CHANGELOG, updated README badges, project_memory matches current version

## Known Issues & Gaps
- **Asset preview gap FIXED:** Now displays actual AI-generated SVGs instead of placeholder rectangles
- **CHANGELOG ordering FIXED:** Now newest versions at top, oldest at bottom
- **Documentation sync FIXED:** project_memory.md now matches v0.8.0 reality
- **Health endpoint version FIXED:** Now returns actual version from VERSION.json instead of hardcoded '0.1.0'
- **SceneEditorPage monolith FIXED:** Decomposed from 1270 lines → 528 lines orchestrator + three focused components
- **Web UI click issues:** Some interactive elements unresponsive (genre dropdown, project creation) — reported by Game Dev agent
- **Export capability:** Users cannot yet export games to standalone HTML — Phase 4 upcoming

## AI Integration Status
- ✅ **Real Backend:** OpenRouter API connected (USE_REAL_AI env var)
- ✅ **Real Asset Generation:** LLM-powered SVG generation from text prompts (pixel, vector, cartoon, etc.)
- ✅ **Interface:** AICommandPage with natural language input
- ✅ **Floating Assistant:** FAB accessible on all project pages
- ✅ **Command Palette:** Ctrl+K for quick navigation and AI commands
- ✅ **Thinking Indicators:** Animated progress while AI processes
- ✅ **Asset Generation:** Working SVG generation with progress tracking
- ✅ **Asset Integration:** Drag-and-drop from asset browser to scene editor, real sprite rendering
- 📋 **Visual Scripting:** Not started
- 📋 **Scene Generation:** AI-generated scenes from descriptions — not started

## Development Priorities (from PM)
1. **🟢 Phase 4: Export & Packaging** — Let users package and ship games (standalone HTML, asset bundling, download workflow)
2. **🟡 Web UI click issues** — Fix unresponsive interactive elements
3. **🟡 Test coverage expansion** — Add tests for scene editor, engine, asset service, project service

## Agent Communication
- **agent_messages.md:** Direct messages between agents
- **game_dev_feedback.md:** User testing feedback (crucial for usability)
- **pm_feedback.md:** Code quality, documentation, strategic direction
- **uiux_feedback.md:** Visual design, interaction patterns, AI-first UX
- **standup_notes.md:** Team standup meetings (template ready, not yet active)

## Recent Key Accomplishments (v0.7.0 → v0.8.0)
1. v0.7.0 — Vitest test framework (9 smoke tests), backend logger migration, build quality
2. v0.7.1 — Real AI asset generation via OpenRouter, actual SVG preview, CHANGELOG ordering fix, project_memory sync
3. v0.8.0 — **Scene Editor ↔ Asset Integration** (asset browser panel, drag-and-drop, real sprite rendering), SceneEditorPage decomposition (1270 → 528 lines), health endpoint version fix, project_memory sync to v0.8.0

## Current Version: v0.8.0
**Codename:** asset-integration
**Status:** Released with Scene Editor ↔ Asset Integration and component decomposition

## Current Sprint: Milestone 6 (Real AI Assets + Quality + Integration)
- ✅ Phase 1: Backend quality improvements (Fastify logger, test coverage) - v0.7.0
- ✅ Phase 2: Real AI asset generation via OpenRouter LLM - v0.7.1
- ✅ Phase 3: Scene editor ↔ asset integration (browser panel, drag-and-drop, sprite rendering, component decomposition) - v0.8.0
- 📋 Phase 4: Export & packaging (standalone HTML, asset bundling, download workflow)

## Next Milestone: M7 (Git + OpenClaw Operations)
- Future focus: Export/packaging, deeper AI integration, web UI fixes

## Last Updated: 2026-04-08
*M6 Phase 3 complete — Scene editor ↔ asset integration shipped, SceneEditorPage decomposed, health endpoint version fixed*
