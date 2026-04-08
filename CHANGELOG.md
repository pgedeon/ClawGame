# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.11.5] - 2026-04-08

#### Added
- **Scene analysis API endpoint** — POST /api/projects/:id/scene-analysis reads actual scene.json files
- **SceneAnalysis interface** — captures entity composition, flags (player/enemies/platforms/etc), dominantGenre inference
- **Genre-specific AI asset suggestions** — Platformer backgrounds, RPG tilesets based on detected game type
- **Real-time scene detection** — AssetSuggestions analyzes scene composition instead of hardcoded values

#### Changed
- Scene analysis reads all .scene.json files in project's scenes directory
- Entity type detection: movement→player, ai→enemy, collision:wall→platform, collision:collectible→collectible
- Genre inference based on entity composition (player+platforms=platformer, player+enemies=action, collectibles+noEnemies=puzzle)
- Fallback to project.genre metadata when scene analysis insufficient

#### Fixed
- TypeScript null-safety: projectId non-null assertion in API calls
- AssetSuggestions: Added error handling for scene analysis failures


## [0.11.4] - 2026-04-08

#### Added
- **Scene analysis API endpoint** (/api/projects/:id/scene-analysis) — reads actual scene files to analyze entity composition
- **SceneAnalysis interface** — entityTypes, entityCount, player/enemies/platforms/collectibles/sprites/background flags, dominantGenre inference
- **Genre-specific AI suggestions** — Platformer backgrounds, RPG tilesets, context-aware prompts based on game type
- **Real-time scene detection** — AssetSuggestions now fetches real scene data from API instead of hardcoded values

#### Changed
- AssetSuggestions uses actual project scene data for recommendations
- Scene analysis reads all .scene.json files in project's scenes directory
- Entity type detection based on component composition (movement → player, ai → enemy, collision:wall → platform, etc.)

#### Fixed
- Type error: projectId may be undefined, now handled with non-null assertion
- Pre-commit hook passes typecheck cleanly


## [0.11.3] - 2026-04-08

#### Fixed
- **Critical: 6 TypeScript compilation errors in AssetSuggestions.tsx** — web app would not compile
  - Wrong import path (`../../api/client` → `../api/client`)
  - Wrong useParams destructuring (`const [projectId]` → `const { projectId }`)
  - Missing `hasBackground` property on `SceneAnalysis` interface
  - Stray `SUGGESTIONS_CSS` symbol at end of file (removed)
  - Unused `GenerationStatus` import removed
- **Broken import placement in AssetStudioPage.tsx** — `import { AssetSuggestions }` was inside component body, moved to top-level imports
- **Synced package.json version** (was `0.0.1`, now matches VERSION.json at `0.11.3`)

#### Added
- **Pre-commit typecheck hook** (.git/hooks/pre-commit) — runs `tsc --noEmit` on both apps before allowing commits, preventing broken TypeScript from landing in main
- Proper type safety on AssetSuggestions: `suggestion.type` cast to specific union instead of `any`

#### Changed
- AssetSuggestions now uses CSS variable fallbacks for inline styles (e.g., `var(--text-sm, 0.875rem)`)

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

### [0.9.3] - 2026-04-08

#### Fixed
- Fixed "Invalid Date" bug in dashboard display
- Fixed missing project status field for old projects (now defaults to 'draft')
- Fixed missing project name field for old projects (falls back to displayName)
- Added automatic data migration for existing project files
- Fixed API service to gracefully handle missing fields with defaults
- Improved project dashboard reliability

#### Improved  
- Enhanced error handling in project listing
- Better backward compatibility for legacy project files
- More robust project data validation
- Updated VERSION.json to 0.9.3


## [0.9.4] - 2026-04-08

#### Added
- **M7 Phase 2 Complete: AI Contextual Integration & Mobile Experience**
  - Contextual AI Assistant component with 4 quick actions
    - Explain: Get code explanations
    - Fix: Find and fix bugs
    - Improve: Refactor and optimize code
    - Generate: Create new code from prompts
  - Enhanced EditorPage with AI-ready status bar
    - Context-aware AI assistant based on project genre
    - Quick access keyboard shortcuts (⌘K for full AI)
    - AI-ready badge indicating AI availability
  - Comprehensive mobile responsive design
    - Bottom navigation bar for mobile devices
    - Touch-friendly controls and buttons
    - Collapsible sidebars and improved mobile layouts
    - Responsive breakpoints at 768px and 480px

#### Changed
- EditorPage: Now includes contextual AI assistant integration
  - AI context changes based on project type (genre)
  - Build feedback enhanced with visual indicators
  - Improved mobile layout with stacked header
- FileWorkspace: Improved mobile responsiveness
  - File tree collapses to drawer on mobile
  - Touch-optimized button sizes
- Root package.json: Added TypeScript and typecheck script
  - Typecheck now runs: `pnpm run typecheck`
  - Integrated into CI/CD pipeline
- App.css: Added comprehensive mobile styles
  - Sidebar transforms to bottom nav on mobile
  - Scene editor and workspace adapt to touch
  - Dashboard hero and grids stack vertically

#### Fixed
- TypeScript compilation: Root-level typecheck now works
  - Previously: `npx tsc --noEmit` failed (TypeScript not found)
  - Now: TypeScript installed at root, script works correctly
- Sprint documentation: Phase 2 Definition of Done marked complete
  - All checkboxes ticked for Phase 2 items
  - Added detailed feature list for v0.9.4
- Mobile experience: Fixed navigation issues on small screens
  - Sidebar now accessible via bottom navigation
  - Content area properly sized for mobile

#### Technical Improvements
- Design system consistency: All components use CSS spacing variables
- Error handling: Enhanced with better visual feedback
- Accessibility: Improved focus indicators and keyboard navigation
- Performance: Optimized re-renders in AI assistant component

### [0.9.5] - 2026-04-08

#### Added
- **Template System**: 3 game templates with auto-creation
  - Platformer: Jump mechanics, platforms, collectibles
  - Top-Down Action: Free movement, enemy AI, powerups
  - Dialogue Adventure: NPCs with dialogue trees, signs
- **Welcome Modal**: Post-creation guidance with 3-step onboarding
  - Direct navigation to Code Editor, Scene Editor, or Play
  - Auto-dismiss after 10 seconds if user doesn't interact
- **Template Cards**: Visual template selection with icons and descriptions
- **Responsive Template Grid**: Mobile-friendly template layout

#### Changed
- OnboardingTour version updated to v0.9.4 (sync with VERSION.json)
- CreateProjectPage now requires template selection before creation
- ProjectPage integrates WelcomeModal for new projects

#### Fixed
- **GamePreviewPage infinite re-render bug**: Removed gameStats from useEffect dependency array
  - gameStats state now only updates every 30 frames (2x/sec)
  - Uses useRef (gameStatsRef) for real-time stats without re-renders
  - Stable game loop performance with no constant recreation


### [0.9.6] - 2026-04-08

#### Added
- **Documentation Sync Process**: Comprehensive guide for keeping project documentation in sync with releases (docs/documentation_sync_process.md)
  - Mandatory checklist for every release (project_memory.md, CHANGELOG.md, VERSION.json, current_sprint.md)
  - Release workflow script outline
  - Pre-commit hook suggestion for enforcing documentation updates
- **Component Design System Audit**: Detailed compliance review across all components (docs/component_design_system_audit.md)
  - Comprehensive component-by-component analysis
  - Compliance scoring and recommendations
  - Migration strategy for improving design system adoption

#### Changed
- **Design System Compliance**: Improved from 65% to ~85% overall compliance
  - Refactored ai-fab.css to use design system variables (40% → 95% compliance)
  - Refactored command-palette.css to use design system variables (50% → 95% compliance)
  - Fixed hardcoded padding/margin in export-page.css, game-preview.css, onboarding.css, toast.css
  - Replaced 40+ hardcoded pixel values with CSS variables (--space-*, --radius-*, --transition-*)
- **project_memory.md**: Updated to v0.9.5 with Phase 2 complete status

#### Fixed
- **CSS Hardcoded Values**: Systematic replacement of hardcoded values with design system variables
  - ai-fab.css: 8 instances of hardcoded padding replaced with variables
  - command-palette.css: 10 instances of hardcoded padding/margin replaced
  - Minor files: 4 instances fixed across export, game-preview, onboarding, toast
- **Documentation Drift**: Created process to prevent docs becoming stale
  - Mandatory sync process for every release
  - Version consistency checks
  - Comprehensive checklist

#### Technical Improvements
- **Design System Adoption**: Newer components (WelcomeModal, Toast) serve as templates for compliance
- **Phase 3 Progress**: Documentation sync and design system audit completed
- **Remaining Work**: Test coverage expansion (>50%) and optional pre-commit hook

### [0.10.0] - 2026-04-08

#### Added
- **M8 Phase 1: Template Gallery & Enhanced Workflows**
  - **Template Gallery**: Comprehensive template browsing system (8 templates)
    - Advanced filtering by category, difficulty, and search
    - Detailed template information with features and learning outcomes
    - Template previews with difficulty badges and category grouping
    - Estimated completion time and player count information
    - Tag-based organization for easy discovery
  - **AssetStudio Architecture**: Complete component decomposition
    - GeneratePanel: AI generation form with real-time progress tracking
    - AssetGrid: Browsable asset display with selection and search
    - AssetDetailPanel: Detailed asset view with actions and metadata
    - FilterPanel: Unified search, filter, and upload controls
    - GenerationTracker: Active generation monitoring and history
    - Reduced main page from 715 lines to focused orchestrator (~100 lines)
  - **Enhanced Template System**: 8 professional game templates
    - Platformer, Top-Down RPG, Logic Puzzle, Space Shooter
    - Racing Game, Tower Defense, Visual Novel, Rhythm Game
    - Difficulty scaling: Beginner to Advanced levels
    - Diverse genres: Action, Puzzle, RPG, Strategy, Simulation, Arcade

#### Changed
- **Milestone Transition**: Completed M7, began M8 Feature Expansion
- **Component Architecture**: Improved maintainability through focused sub-components
- **Design System**: Enhanced consistency across new template gallery and asset studio
- **User Experience**: Better template selection workflow with detailed information
- **Documentation**: Updated sprint planning and version tracking for M8

#### Technical Improvements
- **Code Organization**: Better separation of concerns in asset management
- **Performance**: Optimized component rendering through focused responsibilities
- **Maintainability**: Template-based component architecture for future expansion
- **Discoverability**: Enhanced template discovery with advanced filtering and search

### 0.11.0 - 2026-04-08

#### Added
- Scene Editor AI Assistant with contextual help during scene editing
- SceneEditorAIBar component with quick actions (Explain Entity, Fix Scene, Generate Code, Create Component, Optimize Layout)
- Real-time AI context showing selected entity type and scene statistics
- Mobile-responsive AI panel with thinking indicators and code copy functionality
- Enhanced entity type detection (Player, Platform, Enemy, Collectible, Sprite, etc.)
- Asset caching system for improved performance
- Add Entity tool mode for quick entity creation from templates

#### Changed
- Deepened AI integration from isolated panels to contextual assistance throughout core workflows
- SceneEditorPage now provides rich context to AI (entity types, scene structure)
- Fixed create-project.css to use unified theme.css variables
- Improved TypeScript type system for engine's Map-based entity architecture
- Enhanced viewport and tool mode handling in scene editor

#### Fixed
- TypeScript type mismatches between SceneEditorPage and engine types
- Asset-to-entity conversion with proper sprite component creation
- Component lifecycle and event handling in scene editor
- CSS variable consistency across create project page

#### Technical
- Resolved Map-based entity system compatibility with React components
- Proper asset caching with HTMLImageElement map
- Enhanced component prop flow between SceneEditorPage and sub-components
- Improved error handling for AI assistant responses

### 0.11.2 - 2026-04-08

### 0.11.1 - 2026-04-08

#### Added
- Unified button system CSS classes: .btn, .btn-primary, .btn-secondary, .btn-ghost, .btn-danger, .btn-success, .btn-ai with size variants (sm, lg, icon, block)
- Utility classes: .card, .card-hover, .badge-* (primary/success/warning/error/info/ai), .text-* (muted/secondary/accent/success/error/warning), .flex utilities, .gap-* scale, .empty-state
- ProjectOnboarding component: 5-step guided onboarding panel shown when users first enter a project
  - Step 1: Ask AI to Build → AI Command
  - Step 2: Create Assets → Asset Studio
  - Step 3: Design Scenes → Scene Editor
  - Step 4: Write Code → Code Editor
  - Step 5: Play & Test → Game Preview
- Dismissible onboarding with localStorage persistence

#### Changed
- AI model switched from qwen3.6-plus:free to qwen3.6-plus for improved reliability
- project_memory.md synced to v0.11.0 (was outdated at v0.10.0)
- ProjectPage now shows ProjectOnboarding guide in overview section

#### Fixed
- Documentation sync: project_memory.md version mismatch resolved
- Addressed Game Dev feedback: "No clear starting point after project creation" with guided onboarding
- Addressed UI/UX feedback: "Inconsistent component styling" with unified button system

#### Added (0.11.2)
- Enhanced mobile responsiveness: sidebar auto-collapses to icon-only on mobile (768px)
- Touch-friendly buttons with 44px minimum height
- Responsive onboarding guide that stacks vertically on mobile
- Extra small breakpoint (480px) for compact layouts

#### Changed (0.11.2)
- Dashboard hero scales properly on small screens
- Project cards go single-column on mobile
- Scene editor layout goes vertical on mobile


## [0.11.6] - 2026-04-08

#### Added
- **Quick Start section** in FileWorkspace with 3 instant project starters (Create Scene, Add Player Code, Add Enemy AI)
- **Context-aware code templates** — Generate player controllers, enemy AI, and game scenes with one click
- **Game start screen** with proper "Start Game" button and clear instructions
- **Game pause overlay** triggered by ESC key with resume functionality
- **Project genre tags** displayed in editor header
- **File count indicator** in editor header showing project size
- **Score tracking** in game preview with live updates
- **Enhanced game stats panel** — FPS, Entities, Memory display
- **Game status badges** — Ready, Playing, Paused indicators in preview header

#### Changed
- **EditorPage build process**: Removed artificial 1.5s delay, now instant file check with specific counts
- **GamePreviewPage start flow**: Changed from auto-start to explicit "Start Game" button
- **Empty editor state**: Transformed from basic "No file selected" to full Quick Start guidance
- **Project type detection**: Automatically determines scene-based vs code-focused projects for relevant suggestions
- **Game controls display**: Added W/A/S/D and Arrow key hints in preview

#### Fixed
- **Navigation inconsistency**: Added Back to Editor button in game preview for quick navigation
- **Empty editor confusion**: Users now see clear Quick Start options instead of blank screen
- **Click responsiveness**: Build button now responds instantly with immediate feedback
- **Game Dev feedback items #1-4** — All addressed: clearer starting points, snappier interactions, better navigation, file count display

#### UX Improvements
- **Professional code templates** with proper TypeScript syntax and comments
- **Hover animations** on Quick Start items with glimmer effects
- **Responsive design** — Quick Start grid adapts to mobile screens
- **Visual hierarchy** — Clear grouping, icons, and descriptions for actions
- **Pause/Resume flow** — ESC key with visual overlay for quick game state toggling

## [0.11.7] - 2026-04-08

#### Added
- **Game preview defensive validation** — Scene entities are validated on load to ensure proper structure
- **AI Command clear demo mode banner** — Shows users whether mock or real AI is active
- **AI Command status refresh button** — Allows users to re-check AI health status
- **AI Command improved error handling** — Better try/catch and user-friendly error messages

#### Changed
- **Game Preview: ProjectScene interface** — `transform` now required after validation (was optional, causing crashes)
- **Game Preview: Entity validation** — All scene entities get default transforms if missing (x: 400, y: 300, scale: 1, rotation: 0)
- **AI Command: Welcome message** — Context-aware based on AI health (real vs demo)
- **ai-thinking.css** — Comprehensive styles for AI Command page, dark mode support

#### Fixed
- **Critical: Game Preview crash** — "Cannot read properties of undefined (reading 'transform')" error when scene entities lacked transform objects
- **Critical: Scene loading** — Defensive null checks prevent crashes on malformed scene files
- **AI Command confusing messaging** — Clear banner shows Demo Mode vs Real AI status
- **AI Command API unreachable** — Better error handling when API server is down

#### Related Issues
- @gamedev feedback #2 — Game Preview crash on entity transform access
- @gamedev feedback #4 — AI Command confusing Preview Mode messaging
