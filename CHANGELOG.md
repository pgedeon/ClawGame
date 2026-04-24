# Changelog

All notable changes to ClawGame will be documented in this file.

## [1.0.0] - 2026-04-24

### Added
- **Engine Core**: Entity-Component-System (ECS) architecture with typed components
- **Scene Compiler**: Compile scene state to standalone Phaser 4 TypeScript/JavaScript
- **Asset Pack System**: Asset pack creation, serialization, validation, and Phaser preload code generation
- **Animations System**: Sprite animation creation, preview, and code generation
- **Tilemap System**: Tilemap data model, layer management, paint/fill/erase tools, code generation
- **Prefab System**: Reusable entity templates with override tracking and user component schemas
- **AI Workflows**: Typed AI edit operations with diff preview, risk assessment, and rollback
- **Undo/Redo**: History stack for scene edits with push/undo/redo
- **Phaser Runtime**: Live scene editor with physics debug toggle, entity selection, and grid snapping
- **Web UI**: Full editor with scene canvas, hierarchy tree, property inspector, asset browser, and AI bar
- **Keyboard Shortcuts**: Comprehensive shortcut system for edit, view, tools, and file actions
- **Autosave**: Debounced and interval-based autosave with status indicator
- **Empty/Loading/Error States**: Consistent state displays across all views
- **CI Pipeline**: GitHub Actions workflow for install, typecheck, test, and build

### Scene Compiler Features
- User code region preservation with markers (USER_IMPORTS, USER_PRELOAD, USER_CREATE, USER_UPDATE, USER_CUSTOM_METHODS)
- Physics body compilation (Arcade Physics: static/dynamic, size, offset, bounce, immovable, sensor)
- Animation code generation (anims.create with full configuration)
- Tilemap code generation (spritesheet preload, layer creation)
- Prefab instantiation code generation
