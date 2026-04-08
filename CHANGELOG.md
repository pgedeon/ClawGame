# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2026-04-08

#### Added
- **M7 Phase 1: Operational Excellence**
  - Unified design system CSS variables in theme.css
    - Consistent spacing scale (xs/sm/md/lg/xl/2xl/3xl)
    - Typography scale with line heights (tight/normal/relaxed)
    - Backward-compatible aliases for existing variables
  - .env.example file for new contributor onboarding
    - OpenRouter API key placeholder
    - Server configuration options (ports, directories)
    - CORS, logging, rate limiting settings
  - TypeScript typecheck in CI pipeline
    - typecheck script added to all packages
    - Integrated into `pnpm test` command
  - Responsive design baseline improvements
    - Better mobile breakpoint support (768px)
    - Dashboard and export page mobile optimizations

#### Changed
- Export page: Marked minify and compress options as "Coming Soon"
  - Disabled checkboxes with visual indication
  - Lock icon and badge showing "Coming Soon" status
  - Clear descriptions for future features
- Documentation: Updated project_memory.md to v0.9.0
- Build process: Test script now includes typecheck

#### Fixed
- Export options UX: No longer misleading users with unimplemented features
- Design system: Inconsistent spacing across components addressed
- Onboarding: New contributors now have environment configuration guide

---

## [0.9.0] - 2026-04-08

#### Added
- **Phase 4 Complete: Export & Packaging**
  - Game export to standalone HTML files
  - ExportService packages complete games with embedded assets
  - Assets embedded as base64 data URIs for self-contained exports
  - Export API routes: POST export, GET exports, GET/DELETE export files
  - Export page UI with options panel and export history
  - Export options: include assets, minify (future), compress (future)
  - ProjectPage updated with Export tab and overview quick action
  - Export history with play-in-browser, download, and delete actions
  - Auto-download on export completion
  - Responsive design with loading states and error handling
  - Exported games include minimal game engine that runs in browser
  - No build tools or npm required for exported games
  - Support for multiple exports per project

#### Changed
- M6 Sprint marked COMPLETE with all 4 phases delivered
- ProjectPage: Added Export tab and Export card to overview
- Export system completes the "create → build → ship" loop

---

## [0.8.1] - 2026-04-08

#### Fixed
- **Health endpoint version** — Now returns actual version from VERSION.json instead of hardcoded '0.1.0'
- **SceneEditorPage monolith** — Decomposed from 1270 lines to 528 lines orchestrator
  - Extracted AssetBrowserPanel (207 lines) for asset browsing, search, filter, drag-and-drop
  - Extracted SceneCanvas (332 lines) for canvas rendering, entity manipulation, viewport controls
  - Extracted PropertyInspector (167 lines) for entity property editing, component management
  - Created shared types.ts for scene editor state and constants
- **project_memory.md sync** — Updated to v0.8.0 with Phase 3 COMPLETE status

#### Changed
- SceneEditorPage now orchestrates three focused components (AssetBrowserPanel, SceneCanvas, PropertyInspector)
- Component architecture improved for Phase 4 export workflow integration
- Clean separation of concerns across scene editor UI

## [0.8.0] - 2026-04-08

#### Added
- **Phase 3 Complete: Scene Editor ↔ Asset Integration**
  - Asset browser panel in scene editor (left sidebar)
  - Asset grid showing thumbnails of all project assets
  - Search and filter assets by type (all/sprites/tilesets/textures)
  - Drag assets from browser to canvas to create new entities
  - Auto-generates sprite component with asset ID reference
  - Real-time image caching for smooth canvas rendering
  - Attach assets to selected entities via inspector
  - AI-generated badges on asset cards
  - Refresh assets button
- SceneEditorPage component decomposition (v0.8.1 patch follow-up)

#### Changed
- Scene editor now displays actual asset images (SVG/PNG/WebP) instead of placeholders
- Improved sprite rendering from real assets
- Fixed project date display bug ("Invalid Date" issue)
- ProjectService auto-fixes missing dates using file mtime
- Sprint updated with Phase 3 complete

#### Fixed
- "Invalid Date" on dashboard - projects now show proper creation dates
- Asset preview gap - displays actual AI-generated SVGs instead of placeholders

---

## [0.7.1] - 2026-04-08

#### Added
- **Phase 2 Complete: Real AI Asset Generation**
  - AIImageGenerationService generates real SVG code from text prompts
  - Multiple art styles: pixel, vector, hand-drawn, cartoon, realistic
  - Multiple asset types: sprite, tileset, texture, icon, audio, background
  - Progress tracking with generation status API
  - Async support: returns generation ID, poll for completion
  - Asset Studio UI updated with style selection and progress display
  - 6 test suites for AI image generation service
- Shared type exports from @clawgame/shared package

#### Changed
- Asset generation now produces actual SVG content instead of mock responses
- Asset Studio enhanced with art style dropdown and progress indicators
- CHANGELOG ordering - newest versions at top, oldest at bottom

#### Fixed
- CHANGELOG ordering - now properly ordered (newest first)
- project_memory.md sync - updated to v0.7.1 with Phase 2 complete
- Asset preview - now shows actual generated SVGs, not placeholder rectangles

---

## [0.7.0] - 2026-04-08

#### Added
- **Phase 1 Complete: Documentation & Backend Quality**
  - Vitest setup for API - 9 smoke tests covering health, projects CRUD, AI health, assets CRUD
  - Backend logger migration - all console.* calls replaced with Fastify logger
  - Proper structured logging with request context
  - Health endpoint returns actual version from VERSION.json

#### Changed
- Backend now uses Fastify logger instead of raw console output
- Test coverage foundation established with Vitest

#### Fixed
- Build issue with RealAIService export conflict from logger migration

---

## [0.6.0] - 2026-04-07

#### Added
- **Phase 4 Complete: Asset Pipeline**
  - Full CRUD REST API for assets (create, read, update, delete)
  - Asset Studio with three-panel UI (upload, generate, browse)
  - Asset storage with file system integration
  - Multiple asset types supported (sprites, tilesets, textures, audio, backgrounds)
  - Asset metadata management (tags, description)
  - Asset preview and download

#### Changed
- Asset CRUD now available via REST API
- Asset Studio UI provides full asset management interface

---

## [0.5.3] - 2026-04-07

#### Added
- **Phase 3 Complete: UX Polish & Branding**
  - Error boundaries with graceful fallback UI
  - Onboarding tour for new users
  - Toast notifications for user feedback
  - Code-splitting for performance
  - Responsive design improvements
  - Custom 404 page

#### Changed
- Overall UX polish with better error handling and user feedback

---

## [0.5.2] - 2026-04-07

#### Added
- **Phase 2 Complete: Real AI Integration**
  - Real OpenRouter API backend integration
  - AI command interface with natural language processing
  - Thinking indicators and structured responses

#### Changed
- AI now powered by real OpenRouter LLM instead of mock responses

---

## [0.5.0] - 2026-04-07

#### Added
- **Phase 1 Complete: AI-Native UX Foundation**
  - Command palette (Ctrl+K) for quick navigation
  - Floating AI assistant (FAB) accessible on all pages
  - AI-native design patterns

#### Changed
- UI now prioritizes AI-first interaction patterns

---

## [0.4.0] - 2026-04-07

#### Added
- **Milestone 4 Complete: Scene Editor**
  - Canvas-based visual scene editor
  - Drag-and-drop entity placement
  - Entity templates (Player, Enemy, Coin, Wall)
  - Property inspector for entity editing
  - Component management (add/remove components)
  - Zoom and pan controls
  - Grid and snap features
  - Scene save and load functionality

---

## [0.3.0] - 2026-04-07

#### Added
- **Milestone 3 Complete: Runtime + Preview**
  - 2D game engine with canvas rendering
  - Keyboard input handling (arrows + WASD)
  - Entity rendering with components
  - Game loop with delta time
  - FPS counter
  - Debug panel

---

## [0.2.0] - 2026-04-07

#### Added
- **Milestone 2 Complete: Code + AI**
  - CodeMirror code editor
  - File tree navigation
  - Multi-file support
  - File save and load
  - AI command interface

---

## [0.1.0] - 2026-04-07

#### Added
- **Milestone 1 Complete: Editor Shell**
  - Project CRUD operations
  - Dashboard with project list
  - Navigation sidebar
  - Settings page

#### Added
- **Milestone 0 Complete: Foundation**
  - Monorepo structure
  - Basic routing
  - Sidebar layout
  - Project creation

### [0.9.2] - 2026-04-08

#### Fixed
- Critical interaction timeout issues in scene editor and game preview
- Stale state causing infinite re-renders in game loop
- Scene editor keyboard shortcuts firing in input fields  
- Stray '0' character breaking JSX in SceneEditorPage
- Export button not responding in EditorPage

#### Added  
- Default game template system for new projects
- Player movement script and main scene auto-generation
- Project memory documentation tracking development decisions
- Interactive tutorials coming in next sprint

#### Changed
- Removed UI stats from game preview to prevent performance issues
- Improved keyboard shortcut handling across editors
- Enhanced project creation experience with starter content
