# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 8 Phase 1 Complete — Template Gallery & AssetStudio Architecture
- **Current Version:** v0.10.0 (template-gallery)
- **Current Stage:** M8 Feature Expansion with professional template system and enhanced asset management
- **Next Phase:** M8 Phase 2 - Advanced AI workflows and visual scripting
- **Timeline:** Template system provides professional starter content, clean component architecture enables future advanced features

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — wants unified design system, better responsive design, consistent spacing
- **game_dev_feedback.md:** Real user testing feedback — "Invalid Date" bug fixed, but click timeouts and navigation issues remain
- **pm_feedback.md:** Latest PM review with v0.10.0 status assessment and project memory stale issue noted
- **CHANGELOG.md:** Full version history v0.1.0 → v0.10.0, M8 Phase 1 documented with template system
- **current_sprint.md:** M8 Phase 1 complete, planning for Phase 2 AI workflows

## Architecture
- **Monorepo:** apps/web (React + Vite) and apps/api (Fastify)
- **Multi-Agent Team:** Dev (30m), PM/CEO (2h), Game Dev (3h), Standup (2d)
- **Tech Stack:** React + Vite frontend, Fastify backend, Canvas 2D engine, CodeMirror editor
- **Design System:** Enhanced theme.css with unified CSS variables, improved spacing, better typography
- **Component Architecture:** Clean separation - ExamplesPage template gallery, AssetStudioPage decomposed into focused sub-components

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
- ✅ **M6 Phase 4:** Export & Packaging (standalone HTML export, asset bundling, download workflow) - v0.9.0
- ✅ **M7 Phase 1:** Operational Excellence (unified design system, "Coming Soon" export options, .env.example, responsive improvements) - v0.9.1
- ✅ **M8 Phase 1:** Template Gallery & Enhanced Workflows (professional template system, AssetStudio architecture decomposition) - v0.10.0
- 📋 **M8 Phase 2:** Advanced AI workflows and visual scripting

## Current Capabilities (v0.10.0)
- **Template System:** 8 professional game templates with progressive difficulty (Beginner to Advanced)
  - Platformer, Top-Down RPG, Logic Puzzle, Space Shooter
  - Racing Game, Tower Defense, Visual Novel, Rhythm Game
  - Advanced filtering by category, difficulty, search
  - Detailed features, learning outcomes, completion times
  - Template selection integrated with project creation

- **Code Editor:** CodeMirror with file tree, multi-file support, save/load, console cleanup via logger utility

- **Scene Editor:** Canvas-based visual editor, entity templates (Player/Enemy/Coin/Wall), drag-and-drop, zoom/pan, grid+snap, property inspector, component management

- **Asset Browser Panel:** Left sidebar showing all project assets with thumbnails, search/filter by type, drag-and-drop to canvas

- **Enhanced AssetStudio:** Component architecture with sub-components
  - GeneratePanel: AI generation form with progress tracking
  - AssetGrid: Browsable asset display with search/filter
  - AssetDetailPanel: Selected asset details and actions
  - FilterPanel: Unified controls for management
  - GenerationTracker: Active generation progress display
  - Main page reduced from 715 lines to focused orchestrator (~100 lines)

- **Scene Canvas:** Main canvas area with entity placement, selection, asset image rendering (SVG/PNG/WebP), viewport controls, keyboard shortcuts

- **Property Inspector:** Right sidebar for entity properties, component management (add/remove), entity list, transform editing

- **Game Preview:** Live 2D canvas with keyboard input (arrows+WASD), play/stop/reset, FPS counter, debug panel

- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant (FAB), command palette (Ctrl+K), thinking indicators

- **Asset Pipeline:** Full CRUD REST API, asset studio with three-panel UI, **real AI asset generation** (OpenRouter LLM), actual SVG preview, style selection, progress tracking, drag-and-drop to scene editor

- **Export System:** Standalone HTML game exports with embedded assets, play-in-browser functionality, download workflow, export history, export options panel

- **Component Architecture:** SceneEditorPage (528 lines) orchestrates AssetBrowserPanel (207 lines), SceneCanvas (332 lines), PropertyInspector (167 lines) — clean separation of concerns; ExamplesPage (472 lines) with template gallery integration

- **UX Polish:** Error boundaries, onboarding tour, toast notifications, code-splitting, responsive design, 404 page, logger utility (frontend), unified design system

- **Documentation:** Aligned tracking docs, clean CHANGELOG, updated README badges, project_memory now synced to v0.10.0

## Known Issues & Gaps
- **📋 Project memory now FIXED:** Updated to v0.10.0 with M8 Phase 1 status
- **📋 Sprint tracking needs updating:** M8 Phase 1 complete, Phase 2 planning required
- **📋 Web UI click issues:** Some interactive elements unresponsive (genre dropdown, project creation) — reported by Game Dev agent
- **📋 Template preview system:** Static descriptions only, need interactive demos for each template
- **📋 M8 Phase 2 planning:** Advanced AI workflows and visual scripting capabilities

## AI Integration Status
- ✅ **Real Backend:** OpenRouter API connected (USE_REAL_AI env var)
- ✅ **Real Asset Generation:** LLM-powered SVG generation from text prompts (pixel, vector, cartoon, etc.)
- ✅ **Interface:** AICommandPage with natural language input
- ✅ **Floating Assistant:** FAB accessible on all project pages
- ✅ **Command Palette:** Ctrl+K for quick navigation and AI commands
- ✅ **Thinking Indicators:** Animated progress while AI processes
- ✅ **Asset Generation:** Working SVG generation with progress tracking
- ✅ **Asset Integration:** Drag-and-drop from asset browser to scene editor, real sprite rendering
- ✅ **Export System:** AI-generated games exported as standalone HTML files
- ✅ **Professional Templates:** 8 game templates with progressive difficulty and diverse genres
- ✅ **Enhanced AssetStudio:** Modular component architecture with focused responsibilities
- 📋 **Advanced AI Workflows:** Phase 2 planning - visual scripting, scene generation, advanced prompt engineering
- 📋 **Scene Generation:** AI-generated scenes from descriptions — not started

## Development Priorities (from PM)
1. **🟢 M8 Phase 2:** Advanced AI workflows and visual scripting capabilities
2. **🟡 Sprint documentation update:** Create proper M8 tracking and Phase 2 planning
3. **🟡 Web UI click issues** — Fix unresponsive interactive elements
4. **🟡 Template preview demos** — Add interactive examples for each of the 8 templates