# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-04-08

#### Added
- **Phase 4 Complete: Export & Packaging**
  - Game export to standalone HTML files - v0.9.0
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
  - Drag-and-drop assets from browser to canvas
  - Sprite rendering from actual asset images (SVG/PNG/WebP)
  - Real-time asset image caching for smooth canvas rendering
  - Asset search and filter by type (all/sprites/tilesets/textures)
  - Attach assets to selected entities via inspector
  - AI-generated badges on asset browser items
  - Asset refresh button to reload project assets
- **Bug Fix: Project Date Display** — "Invalid Date" issue resolved
  - Backfilled missing createdAt/updatedAt in 13 existing projects
  - ProjectService now auto-fixes missing dates using file mtime
  - Safe date sorting that handles invalid dates gracefully
  - formatDate helper properly validates dates before formatting

#### Changed
- SceneEditorPage: Full rewrite to support asset integration
- Scene editor layout: Three-column (assets, canvas, inspector)
- Asset cache: Ref-based Map for efficient image loading
- Entity rendering: Supports asset ID references in sprite component

#### Fixed
- Projects with missing createdAt/updatedAt now display correctly
- Date sort in project list handles edge cases
- Asset images load and render on canvas entities

## [0.7.2] - 2026-04-08

#### Fixed
- Asset preview now displays actual AI-generated SVG content instead of placeholder rectangles
- CHANGELOG.md reorganized with newest versions first (0.7.1 at top)
- project_memory.md synced to v0.7.1 with Phase 2 COMPLETE status

## [0.7.1] - 2026-04-08

#### Added
- **Real AI Asset Generation** — LLM-powered SVG output from text prompts
  - AIImageGenerationService using OpenRouter (qwen/qwen3.6-plus:free)
  - Generate actual game assets (not placeholder rectangles)
  - Multiple art styles: pixel, vector, hand-drawn, cartoon, realistic
  - Multiple asset types: sprite, tileset, texture, icon, audio, background
  - Customizable size (default 64x64), format (SVG/PNG/WebP), background color
- **Generation Progress Tracking** — Real-time status updates (0-100%)
  - Generation status API: `/api/projects/:projectId/assets/generations/:generationId`
  - List all generations: `/api/projects/:projectId/assets/generations`
  - Poll endpoint to create assets from completed generations
  - Async support: returns generation ID immediately if not ready
- **Enhanced Asset Studio UI** — Style selection, progress tracking, AI badges
  - Style buttons (Pixel Art, Vector, Hand-drawn, Cartoon, Realistic)
  - Real-time generation progress with progress bar and percentage
  - Active generations list showing in-flight work
  - AI-generated badges on asset cards and detail views
  - Generation metadata: style, duration, prompt, generation ID
- **Shared Type Exports** — All types now exported from @clawgame/shared

#### Changed
- AssetStudioPage: Real asset generation replaces placeholder system
- API client: Added generation endpoints and polling
- Asset metadata: Extended with aiGeneration field

#### Fixed
- AI-generated assets now display correctly in preview
- Asset list shows generation status and progress
- Generations are properly tracked and cleaned up

## [0.7.0] - 2026-04-07

#### Added
- **Phase 1 Complete: Documentation & Backend Quality**
  - Backend logger migration from console.log to Fastify/pino
  - Vitest test framework with 9 smoke tests
  - Test coverage for API health, projects CRUD, assets CRUD
  - Test coverage for AI endpoints
  - CI-ready test runner with pnpm test command
- **Backend Infrastructure**
  - Fastify logger instance passed to all services
  - Centralized logging with structured JSON output
  - Async-safe logging for concurrent requests
  - Test helper utilities for mock project creation
- **Project Documentation**
  - Roadmap updated through Milestone 6
  - Sprint tracker with phase-based organization
  - Memory file for cross-session context

#### Changed
- ProjectService: Uses Fastify logger instead of console.log
- FileService: Uses Fastify logger instead of console.log
- AssetService: Uses Fastify logger instead of console.log
- All 8 console.* calls replaced with logger methods

#### Fixed
- RealAIService export conflict from logger migration
- Test imports and module resolution

## [0.6.1] - 2026-04-07

#### Fixed
- CHANGELOG.md reorganized with newest versions at top
- project_memory.md synced to v0.6.0 with M5 COMPLETE status
- All tracking documents now in sync

## [0.6.0] - 2026-04-07

#### Added
- **Phase 4 Complete: Asset Pipeline**
  - Full asset management system
  - Asset upload (drag-and-drop, file picker)
  - Asset preview (SVG/PNG/WebP support)
  - Asset metadata (type, tags, AI generation info)
  - Asset CRUD operations (create, read, update, delete)
  - Asset listing with filtering (type, tag, search)
  - Asset file serving with proper MIME types
- **Asset Studio Page**
  - Asset browser with grid view
  - Asset detail panel
  - Upload dialog
  - Asset editor (name, tags, type)
  - Delete confirmation
  - Asset usage statistics

#### Changed
- AssetService: Full CRUD implementation with caching
- API routes: Asset endpoints added
- FileWorkspace: Asset panel integration

## [0.5.3] - 2026-Workspace

#### Added
- **Phase 3 Complete: UX Polish & Branding**
  - Game Hub design with gradient backgrounds
  - Purple/indigo color scheme
  - Clean card-based layouts
  - Hover effects and transitions
  - Responsive design
  - Project overview with quick actions
  - Tabbed interface for project tools

#### Changed
- DashboardPage: Complete redesign with Game Hub theme
- ProjectPage: New tabbed layout
- EditorPage: Integrated into project workflow
- Color scheme: Unified across all pages

## [0.5.2] - 2026-04-07

#### Added
- **Phase 2 Complete: Real AI Integration**
  - AI Command page with chat interface
  - Real-time AI responses
  - AI history tracking
  - AI command context (selected files, code)
  - AI thinking indicators

#### Changed
- AICommandPage: Complete rewrite with real AI
- API client: Added AI endpoints

## [0.5.0] - 2026-04-07

#### Added
- **Phase 1 Complete: AI-Native UX Foundation**
  - Dashboard with project listing
  - Project creation flow
  - Project opening flow
  - Examples page
  - Settings page
  - Command palette (Cmd+K)
  - Responsive layout

#### Changed
- AppLayout: New sidebar navigation
- AppRoutes: Complete route structure
- Branding: ClawGame identity

## [0.1.0] - 2026-04-07

#### Added
- Initial MVP setup
- Basic project structure
- File workspace
- Scene editor (basic)
- Asset browser (placeholder)
- Game preview (placeholder)
