# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-04-07

#### Fixed
- Removed debug console.log statements from CreateProjectPage and FileWorkspace
- Fixed CSS variable naming inconsistencies across codebase
- Updated file-tree.css to use theme.css variables (--border, --fg, etc.)
- Updated game-preview.css to use theme.css variables
- Improved CodeEditor focus management and auto-focus behavior
- Fixed TreeNode click handlers with proper event propagation
- Added keyboard navigation support to file tree (Enter/Space keys)
- Added accessibility attributes (role, tabIndex) to file tree

#### Refactored
- Split engine package into modular architecture
- Created types.ts with all component interfaces
- Created Engine.ts as main engine class
- Created InputSystem for keyboard event handling
- Created MovementSystem for entity movement updates
- Created AISystem for patrol/chase behaviors
- Created RenderSystem for drawing and rendering
- Updated GamePreviewPage to use new refactored engine API
- Improved engine extensibility and maintainability
- Better separation of concerns across engine modules

## [0.3.0] - 2026-04-07

### Added
- Game engine with 2D runtime (delta time, game loop)
- Keyboard input (arrow keys + WASD)
- Player movement with bounds checking
- AI patrol patterns for enemies
- Entity rendering with shadows, highlights, borders
- Grid background and scene name display
- GamePreviewPage with canvas
- Play/Stop/Reset controls
- FPS counter
- Debug panel UI
- Route: /project/:projectId/preview

### Changed
- Dev agent now enforces commit/push after each session
- Agent messaging system enhanced
- PM, UI/UX, Game Dev feedback files updated

## [0.2.0] - 2026-04-07

### Added
- File workspace with tree, editor, search
- Backend file API (tree, read, write, delete, mkdir, search)
- AI command panel scaffold
- Asset studio scaffold

## [0.1.0] - 2026-04-07

### Added
- Initial project scaffold (pnpm monorepo)
- React + Vite frontend
- Fastify backend
- Project CRUD API
- Dashboard, editor, settings pages
- Sidebar navigation
- Multi-agent development system
- Fair Source license (<$100k/year free)


### [0.3.2] - 2026-04-07

#### Fixed
- Fixed keyboard input not working in game preview (arrow keys/WASD scrolling issue)
- Fixed file content not visible in CodeMirror editor (was recreating on keystroke)
- Fixed player movement not responding to keyboard input in game preview
- Added playerInput marker component to distinguish player entities
- Updated MovementSystem to properly read input state and apply velocity
- Added preventDefault to game keys to stop page scrolling when game is active
- Improved editor ref management to prevent focus issues
- Fixed diagonal movement normalization for smooth player control
- Enhanced boundary checking to keep player within canvas bounds

#### Changed
- Bumped version from 0.3.1 to 0.3.2 for bug fix milestone
- Added game developer quality gates before session end

#### Technical Improvements
- Refactored CodeEditor useEffect dependencies to avoid recreation on content changes
- Improved InputSystem with editable element detection
- Enhanced player entity creation with proper component setup
- Better error handling in editor save operations

### [0.3.3] - 2026-04-07

#### Fixed
- Fixed CodeEditor useEffect dependency causing CodeMirror recreation on every keystroke
- Fixed RenderSystem overlapping scene info and FPS displays (combined into single HUD)
- Fixed debug panel checkboxes to actually control engine configuration (dead UI now functional)
- Fixed engine missing destroy() method for proper cleanup
- Fixed NodeJS type namespace issues in GamePreviewPage

#### Improved
- Made canvas responsive with proper scaling for different screen sizes
- Updated severely outdated project_memory.md to reflect current M3 complete status
- Updated roadmap.md to show completed milestones and future plans
- Enhanced player movement with proper diagonal normalization
- Improved editor focus management and auto-focus behavior

#### Technical Debt
- Bumped version from 0.3.2 to 0.3.3 for quality milestone
- Maintained clean TypeScript compilation (no errors)
- Improved component separation and refactoring
- Updated documentation to actual current state

#### Known Issues
- AI service still uses mock responses (needs backend integration)
- Bundle size warning (766KB > 500KB threshold)
- File tree needs file watcher for auto-refresh
- More debug features needed beyond grid/hitboxes

### [0.4.0] - 2026-04-07

#### Added
- **Milestone 4: Visual Scene Editor** — Complete 2D scene editing system
- Entity templates (Player, Enemy, Coin, Wall) for quick placement
- Canvas-based visual editor with mouse drag-and-drop
- Zoom and pan controls (buttons + mouse wheel)
- Grid display with snapping option for aligned placement
- Entity selection with visual highlight and resize handles
- Property inspector for Transform (X, Y, Rotation, Scale X/Y)
- Component management (Sprite, Movement, AI, Collision) — add/remove
- Entity list panel with click-to-select
- Keyboard shortcuts: V (select), +/- (zoom), 0 (reset view), Delete (entity), Ctrl+S (save)
- Scene serialization to JSON (scenes/main-scene.json)
- Route: /project/:projectId/scene-editor
- Scene Editor navigation button on ProjectPage

#### Changed
- Updated project page to prioritize Scene Editor as primary action
- Bundle size: 782KB (up from 765KB due to new Scene Editor feature)

#### Technical
- Full TypeScript with proper typing throughout Scene Editor
- Canvas 2D rendering with efficient re-render on state changes
- Responsive canvas that adapts to container size
- Clean separation: editor logic, rendering, state management
- Integrated with existing engine types (Entity, Transform, Component)

#### Documentation
- Updated pm_feedback.md with M3 completion status

---

### [0.4.1] - 2026-04-07

#### Added
- AI branding tokens (--ai-primary, --ai-primary-hover, --ai-glow, --ai-gradient)
- Fullscreen toggle to Game Preview with Esc key exit support
- Keyboard hints with kbd styling
- Visual feedback for canvas overlay and fullscreen state
- Honest "Preview Mode" messaging for AI Command interface

#### Changed
- File workspace layout: added proper flex sizing with min-height: 0 for nested scrolling
- Code editor visibility: fixed height constraints in editor page layout
- Dark mode contrast: lightened --text-muted from #64748b to #94a3b8 for WCAG AA compliance
- Game preview canvas: added fullscreen wrapper with dynamic sizing

#### Fixed
- **Critical:** Code editor not visible - fixed flex layout with proper height containers
- **Critical:** AI Command showing fake implementation plans - now clearly indicates mock/preview status
- **Critical:** Dark mode contrast issue with --text-muted failing WCAG AA - now passes 4.5:1 ratio
- Added keyboard focus indicators for accessibility
- AI Command interface now transparent about limitations


### [0.5.0] - 2026-04-07

#### Added
- **Command Palette** (Ctrl/Cmd+K) — quick navigation, AI commands, and search across the app
  - Keyboard navigation: ↑↓ to browse, Enter to select, Esc to close
  - Categorized commands: Navigate, AI Commands, Actions
  - Context-aware: shows project-specific commands when in a project
- **Floating AI Assistant** (FAB) — omnipresent AI chat button on all project pages
  - Collapsible chat panel with message history
  - Typing indicator animation
  - Preview mode badge with honest messaging
  - Mobile responsive (full-width bottom sheet on small screens)
- **Toast Notification System** — contextual feedback for user actions
  - Success, error, warning, and info variants
  - Auto-dismiss with manual close
  - Accessible: role="alert" and aria-live region
- **Code-splitting** — lazy-loaded pages and vendor chunks
  - React.lazy() for all project pages (SceneEditor, Editor, Preview, AI Command, Assets)
  - Manual vendor chunks: react, codemirror, lucide-react
  - Bundle: 786KB single chunk → 7 optimized chunks, no size warnings
  - Suspense loading fallback with spinner
- **Sidebar Command Search** — quick access command palette trigger in sidebar header
- **Scene Editor navigation** — added to sidebar when in project context

#### Changed
- AppLayout now wraps content in ToastProvider for global toast access
- App.tsx uses React.lazy for heavy pages instead of eager imports
- Vite config: added manualChunks for vendor splitting (react, codemirror, lucide)
- Sidebar: Scene Editor now appears in project navigation

#### Technical
- Bundle size warning eliminated (was 786KB > 500KB, now properly split)
- All new components fully TypeScript typed
- CSS files co-located with components
- Mobile-first responsive design for all new components

### [0.5.1] - 2026-04-07

#### Added
- Toast notifications integration in FileWorkspace (save, create, delete, search, refresh)
- CodeEditor loading state with badge indicator
- CodeEditor onLoad prop for external content loading

#### Changed
- FileWorkspace uses toast system for all user-facing actions
- CodeEditor handles loading state from parent component
- Better error messaging on file operations


## [0.5.2] - 2026-04-07

#### Added
- Real AI backend integration with OpenRouter API
- AI Thinking Indicator component with animated progress visualization
- Support for toggling between real and mock AI via USE_REAL_AI environment variable
- AI health check endpoint to detect service status
- System prompt engineering for game development context
- Code extraction and structured response parsing from AI
- Context-aware file content reading for AI prompts
- Risk level assessment for AI-generated changes
- Confidence scores for AI suggestions

#### Changed
- Updated AICommandPage to handle real AI responses
- Improved welcome message based on AI service status
- Enhanced AI response rendering with structured data display
- Toast notifications now integrated throughout the app

#### Fixed
- TypeScript compilation issues with async/await in AI service
- Build process successfully compiles with no errors

#### Technical
- Added axios dependency to API package
- API backend can now generate real code changes
- AI service includes project context and file tree awareness
- Supports both simulation mode and real LLM-powered responses

---


### [0.5.3] - 2026-04-07

#### Added
- Onboarding tour component with 4-step AI-first introduction
- Error boundary component for graceful component failures
- AI-branded dashboard hero with floating orbs animation
- Dashboard keyboard shortcuts hint (Ctrl+K for AI command)
- AI-powered badge on "New Project" quick action
- Responsive design improvements for mobile dashboard

#### Changed
- Enhanced dashboard with AI-themed gradient background
- Improved quick actions grid with better visual hierarchy
- Projects grid layout from list to card grid
- Added AI tips section with command palette shortcut

#### Fixed
- Removed console.log from SceneEditorPage (PM feedback)
- Fixed TypeScript type errors for import.meta.env
- Improved accessibility with proper focus indicators


### [0.6.0] - 2026-04-07

#### Added
- Asset Pipeline with full CRUD operations (list, get, generate, upload, delete, stats)
- Asset Studio page with three-panel layout (generation, grid, details)
- Asset API endpoints in backend (`/api/projects/:projectId/assets/*`)
- Asset service with file storage and metadata management
- Asset type filtering (sprite, tileset, texture, icon, audio, background)
- Asset search by name, prompt, and tags
- Asset generation workflow with placeholder SVG output
- Asset upload functionality with base64 support
- Asset detail view with preview, metadata, and tags
- Asset stats (total count, by type, total size)
- ToastList component for displaying notifications
- "Coming Soon" badge removed from Asset Studio in project overview
- Asset Studio now fully functional and integrated

#### Changed
- Bumped version from 0.5.3 to 0.6.0 (minor version - significant feature)
- Updated Toast system to use object-based API (`{ type, message, duration }`)
- Updated all toast calls across components to use new API
- Integrated ToastList into AppLayout for consistent notifications
- Removed ProjectPage "Coming Soon" badge from Asset Studio

#### Technical
- Asset storage in `data/assets/{projectId}/` directories
- Asset metadata as JSON files alongside asset files
- Type-safe AssetMetadata and AssetType interfaces
- Asset service singleton pattern with caching
- Asset type colors and icons for visual distinction
- Responsive three-panel layout for Asset Studio
- Client-side asset preview with data URIs
- RESTful API design for asset operations


### [0.6.1] - 2026-04-07

#### Added
- 404 Not Found page with styled UI (gradient 404 code, back/home buttons)
- Logger utility (`utils/logger.ts`) — silent in production, console in dev
- Preview Mode badge on Asset Studio generate button (honest about placeholder status)
- Preview mode badge styling (subtle pill, hover state)

#### Changed
- Updated project_memory.md from v0.3.2 → v0.6.0 (was 3 versions behind, agents relied on this)
- Updated VERSION.json status from `in-progress` to `released`
- Updated README version badge from 0.1.0 to 0.6.0
- Replaced 28 `console.error`/`console.log` calls across 12 files with logger utility
- ErrorBoundary retains direct `console.error` (intentional error reporting)

#### Fixed
- Documentation debt: project_memory.md was misleading agents about actual project state
- Missing 404 handling: unknown routes now show helpful page instead of silent redirect
- Console noise in production: errors no longer log to browser console
- Asset Studio: generate button now clearly indicates preview mode

### [0.7.0] - 2026-04-08

#### Added
- Vitest test framework for API (9 smoke tests: health, projects CRUD, AI health, assets CRUD/stats/validation)
- Test helper for building Fastify app without starting server
- `pnpm test` and `pnpm test:watch` scripts in API package

#### Changed
- All 8 backend console.log/error calls replaced with Fastify logger (pino)
- AssetService and RealAIService now receive logger via constructor injection
- Routes instantiate services with `app.log` instead of importing singletons
- VERSION.json bumped to M6 (milestone 6)
- Sprint file updated: Phase 1 (Backend Quality) marked COMPLETE
- Roadmap updated: M5 COMPLETE, M6 Phase 1 COMPLETE
- project_memory.md updated to v0.7.0 reality

#### Fixed
- TypeScript build error from RealAIService export conflict during logger migration
- Missing closing brace in realAIService.ts after cleanup
