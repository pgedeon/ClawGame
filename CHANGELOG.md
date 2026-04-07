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

