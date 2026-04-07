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
