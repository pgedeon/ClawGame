# ClawGame Project Memory

## Project Overview
- **Status:** M11 Generative Media Forge - Ready to begin after M10 completion
- **Current Version:** v0.20.4 (M10 Asset Factory Core complete)
- **Current Stage:** M10 Asset Factory Core ✅ Complete - All deliverables implemented and tested
- **Next Phase:** M11 Generative Media Forge
- **Timeline:** AI image generation, sprite workflows, audio/video generation, asset pack planning

## Key Documents
- **README.md:** Vision, roadmap, multi-agent development docs
- **uiux_feedback.md:** Detailed UI/UX analysis — unified button system now added, needs continued mobile/spacing work
- **game_dev_feedback.md:** Real user testing feedback — onboarding confusion addressed with ProjectOnboarding component
- **pm_feedback.md:** Latest PM review with v0.20.4 status assessment, M10 Asset Factory Core complete
- **CHANGELOG.md:** Full version history v0.1.0 → v0.20.4, M10 implementation documented
- **current_sprint.md:** M10 Asset Factory Core complete, all deliverables implemented
- **follow_up_sprints.md:** M11 Generative Media Forge next deliverable

## Architecture
- **Monorepo:** apps/web (React + Vite) and apps/api (Fastify)
- **Multi-Agent Team:** Dev (30m), PM/CEO (2h), Game Dev (3h), Standup (2d)
- **Tech Stack:** React + Vite frontend, Fastify backend, Canvas 2D engine, CodeMirror editor
- **Design System:** Dark studio theme with unified CSS variables in theme.css, App.css has button system + utility classes
- **Component Architecture:** Clean separation across all pages; AssetStudio decomposed (715→100 lines), SceneEditor decomposed into focused sub-components
- **M10 Implementation:** Sharp image processing, Canvas-based tile assembly, REST API endpoints, React UI components

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
- ✅ **M9 AI Creator Workspace:** Ambient AI assistance, accurate service status, workflow integration (v0.20.2)
- ✅ **Recovery Sprint:** Technical debt resolution, quality gates verification, foundation validation (v0.20.3)
- ✅ **M10 Asset Factory Core:** Sprite analysis, slicing, pixel pipeline, tileset forge, batch utilities (v0.20.4)
- 📋 **M11 Generative Media Forge:** Multi-model image generation, sprite workflows, audio/video, asset pack planner (next)

## Current Capabilities (v0.20.4)
- **Template System:** 8 professional game templates with progressive difficulty, filtering, search
- **Scene Editor AI:** Contextual AI assistant (SceneEditorAIBar) with 5 quick actions
  - Explain Entity, Fix Scene Issues, Generate Code, Create Component, Optimize Layout
  - Real-time entity type detection and scene statistics
  - Mobile-responsive with thinking indicators and code copy
- **Code Editor:** CodeMirror with file tree, multi-file support, save/load
- **Scene Editor:** Canvas-based visual editor with entity templates, drag-and-drop, zoom/pan
- **Asset Studio:** Complete M10 Asset Factory Core with full processing pipeline:
  - **Sprite Analyzer:** Metadata detection, grid pattern recognition, color analysis
  - **Sprite Sheet Slicer:** Frame extraction, manifest generation, animation preview
  - **Pixel Pipeline:** Pixelization, palette reduction, edge cleanup
  - **Tileset Forge:** Tile assembly, autotile metadata, preview
  - **Batch Utilities:** Format conversion, resize, crop, trim
- **AI Integration:** Real OpenRouter API backend, AI command interface, floating AI assistant, command palette
- **Export System:** Standalone HTML game exports with embedded assets
- **Design System:** Unified button system (.btn-primary/secondary/ghost/danger/ai), utility classes, badges
- **Onboarding:** WelcomeModal + ProjectOnboarding guided steps for new users
- **Asset Processing Pipeline:** Complete M10 implementation with Sharp library, REST APIs, and React UI

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
- ✅ **M10 Asset Factory Core** — Complete sprite analysis, slicing, pixel pipeline, tileset assembly (v0.20.4)
- 📋 **M11 Generative Media Forge** — Multi-model image generation, sprite workflows, audio/video processing (next)
- 📋 Visual scripting editor (future)
- 📋 AI-powered asset suggestions based on scene context

## Development Priorities
1. **M11 Generative Media Forge:** Multi-model image generation with style presets, sprite animation workflows, video-to-sprite conversion, audio generation, asset pack planning
2. **M11 Implementation:** Advanced media processing features, format conversion, optimization, compression
3. **Mobile responsiveness audit** — improve touch interactions across all pages
4. **Template preview demos** — Add interactive examples for each template

### 2026-04-17
- **M10 Asset Factory Core Complete:** All deliverables implemented and tested including:
  - Sprite Analyzer with metadata detection and grid pattern recognition
  - Sprite Sheet Slicer with frame extraction and manifest generation
  - Pixel Pipeline with pixelization and palette reduction
  - Tileset Forge with tile assembly and autotile metadata
  - Batch Utilities with format conversion and processing
  - Full UI integration with AssetProcessingToolbar and AssetStudioPage
  - REST API endpoints with proper error handling
- **Quality Gates Verified:** Build, test, typecheck, and lint all pass across all packages
- **M10 Exit Criteria Met:** All tests passing, documentation updated, ready for M11

### 2026-04-17 (Recovery Sprint)
- **Recovery Sprint Complete:** All critical technical debt resolved including navigation tests, TypeScript compilation errors, and asset factory test failures
- **Quality Gates Verified:** Build, test, typecheck, and lint all pass across all packages
- **M10 Foundation Ready:** Asset Factory Core tests (7/7) passing, enabling full implementation
- Fixed image format issues in asset factory tests by replacing raw buffer PNG creation with proper Sharp-generated PNG files

### 2026-04-15
- Wired DamageSystem into legacy canvas preview session. Non-TD projectile hits now go through engine damage pipeline instead of inline health manipulation.
- Enemy entities now get StatsComponent in the runtime scene. `applyPreviewRuntimeScene` syncs health back.
- The `projectile:hit` handler in legacyCanvasSession.ts was replaced with `entity:damage` + `entity:defeated` listeners.
- Still TODO: wire TD projectile damage through DamageSystem (TD enemies are excluded from the runtime scene).

### 2026-04-14
- Added engine `DamageSystem` that subscribes to `projectile:hit` events, applies damage to `StatsComponent`, and emits `entity:damage` / `entity:defeated` events. Removes defeated entities from scene.
- Added `entity:damage` and `entity:defeated` typed events to `EngineEvents` in EventBus.
- This is the first step toward engine-owned combat/death bookkeeping instead of page-level simulation in `useGamePreview.ts`.