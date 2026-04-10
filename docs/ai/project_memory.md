# ClawGame Project Memory

## Project Overview
- **Status:** M12 Unified Runtime complete
- **Current Version:** v0.19.0 (gameplay-authoring)
- **Current Stage:** M13 Gameplay Authoring Layer (in progress)
- **Next Phase:** M13 — finish UI deliverables (event graph editor, animation state machines)
- **Timeline:** Scene Editor AI provides contextual co-pilot experience during game editing

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — unified button system now added, needs continued mobile/spacing work
- **game_dev_feedback.md:** Real user testing feedback — onboarding confusion addressed with ProjectOnboarding component
- **pm_feedback.md:** Latest PM review with v0.11.0 status assessment, documentation sync noted
- **CHANGELOG.md:** Full version history v0.1.0 → v0.11.0, M8 Phase 1+2 documented
- **current_sprint.md:** M8 Phase 2 complete, Phase 3 planning

## Architecture
- **Monorepo:** apps/web (React + Vite) and apps/api (Fastify)
- **Multi-Agent Team:** Dev (30m), PM/CEO (2h), Game Dev (3h), Standup (2d)
- **Tech Stack:** React + Vite frontend, Fastify backend, Canvas 2D engine, CodeMirror editor
- **Design System:** Dark studio theme with unified CSS variables in theme.css, App.css has button system + utility classes
- **Component Architecture:** Clean separation across all pages; AssetStudio decomposed (715→100 lines), SceneEditor decomposed into focused sub-components

## Milestone Status
- ✅ **M0 Foundation:** Repo structure, basic components, routing, sidebar
- ✅ **M1 Editor Shell:** Dashboard, navigation, project CRUD, settings
- ✅ **M2 Code + AI:** File tree, CodeMirror editor, AI command interface
- ✅ **M3 Runtime + Preview:** 2D engine, keyboard input, entity rendering, game loop, FPS counter
- ✅ **M4 Scene Editor:** Visual scene editor with canvas, drag-and-drop, entity templates, property inspector
- ✅ **M5 AI-Native UX + Asset Pipeline:** Command palette, floating AI assistant, real AI backend (OpenRouter), error boundaries, onboarding tour, asset CRUD + studio UI
- ✅ **M6 Phase 1-4:** Backend quality, AI asset generation, scene-asset integration, export & packaging
- ✅ **M7 Phase 1-3:** Operational excellence, web UI bug fixes, architectural debt cleanup
- ✅ **M8 Phase 1:** Template Gallery & Enhanced Workflows (v0.10.0)
- ✅ **M8 Phase 2:** Scene Editor AI Integration (v0.11.0)
- 📋 **M8 Phase 3:** Experience Enhancement (performance, error handling, advanced AI)
- 📋 **M8 Phase 4:** Production Features (test coverage, mobile features)

## Current Capabilities (v0.16.0)
- **Template System:** 8 professional game templates with progressive difficulty, filtering, search
- **Scene Editor AI:** Contextual AI assistant (SceneEditorAIBar) with 5 quick actions
  - Explain Entity, Fix Scene Issues, Generate Code, Create Component, Optimize Layout
  - Real-time entity type detection and scene statistics
  - Mobile-responsive with thinking indicators and code copy
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load
- **Scene Editor:** Canvas-based visual editor with entity templates, drag-and-drop, zoom/pan
- **Asset Studio:** Modular component architecture (GeneratePanel, AssetGrid, AssetDetailPanel, FilterPanel, GenerationTracker)
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant, command palette
- **Export System:** Standalone HTML game exports with embedded assets
- **Design System:** Unified button system (.btn-primary/secondary/ghost/danger/ai), utility classes, badges
- **Onboarding:** WelcomeModal + ProjectOnboarding guided steps for new users

## Known Issues & Gaps
- **UI/UX:** Need continued mobile responsiveness audit, spacing consistency
- **Performance:** Lazy loading and code splitting not yet implemented
- **Error Handling:** AI error recovery could be improved
- **Template Previews:** Static descriptions only, need interactive demos

## AI Integration Status
- ✅ Real OpenRouter API backend
- ✅ AI Command page with natural language
- ✅ Floating AI assistant (FAB) on all project pages
- ✅ Command palette (Ctrl+K)
- ✅ Scene Editor AI with contextual entity assistance
- ✅ Asset generation via LLM-powered SVG creation
- ✅ Export system with AI-generated games
- ✅ **Prompt Recipe Library** — 10 curated recipes (Combat, Scenes, AI, Assets, Code, Gameplay) in AI assistant panel
- 📋 Visual scripting editor (M9?)
- 📋 AI-powered asset suggestions based on scene context

## Development Priorities
1. **M8 Phase 3:** Performance optimization (lazy loading, caching, code splitting)
2. **M8 Phase 3:** Enhanced error handling (better recovery, clearer messages)
3. **M8 Phase 3:** Advanced AI features (code analysis, refactoring, optimization)
4. **Mobile responsiveness audit** — improve touch interactions across all pages
5. **Template preview demos** — Add interactive examples for each template
