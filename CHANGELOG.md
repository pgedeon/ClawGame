# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Engine types (Entity, Transform, Component, etc.)
  - Project types (CreateProjectRequest, ProjectDetail, etc.)
  - Asset types (AssetMetadata, AssetType, etc.)
  - Helper functions (createPlayerEntity, createEnemyEntity, etc.)
  - Utility functions (generateId, generateProjectId)
- **AI Image Generation Tests** — 6 test suites covering service functionality
  - generateImage with different types/styles
  - getGenerationStatus and getGenerations
  - cleanupOldGenerations
  - healthCheck

#### Changed
- Backend: All console.* calls replaced with Fastify logger (0 console calls remain)
- Asset Studio: Style selection via button grid instead of text input
- FileService: Support for binary file read/write with base64 encoding
- Asset routes: New endpoints for generation management and polling

#### Fixed
- RealAIService export conflict resolved (moved logger injection pattern)
- FileService properly handles binary files and encoding
- Asset generation now returns generation ID for async tracking

## [0.7.0] - 2026-04-07

#### Added
- **Backend Quality Improvements**
  - Fastify logger injection throughout all services
  - All console.* calls replaced with structured logging
  - Vitest setup for API testing
  - 9 API smoke tests covering health, projects, assets, AI
- **File Service Enhancement**
  - Binary file read/write with base64 encoding
  - Support for images and other non-text assets
  - Proper content-type handling
- **Testing Infrastructure**
  - Vitest configuration for apps/api
  - Helper functions for test setup
  - Smoke tests for all major endpoints

#### Changed
- Logger pattern: Dependency injection instead of global logger
- FileService: Binary mode support for images/assets
- Build: Fixed TypeScript export conflict

#### Fixed
- RealAIService export conflict resolved
- All console.* calls removed from production code

## [0.6.1] - 2026-04-07

#### Added
- Documentation updates for Milestone 5 completion
- Sprint tracking file updated
- Project memory synchronized

#### Changed
- Removed debug console.log statements

## [0.6.0] - 2026-04-07

#### Added
- **Asset Pipeline (M6 Phase 1)**
  - Asset service with full CRUD operations
  - File storage for uploaded assets
  - Asset metadata tracking (type, size, tags)
  - Asset Studio UI with upload/management
  - Asset preview on cards
  - Delete asset functionality
  - Asset statistics by type

#### Changed
- File service enhanced to support asset operations
- Routes: Added /api/projects/:projectId/assets endpoints

## [0.5.3] - 2026-04-07

#### Added
- **UX Polish (M5 Phase 3)**
  - Improved color palette with better contrast
  - Refined typography scale
  - Enhanced spacing system
  - Better button states and hover effects
  - Loading states and spinners
  - Error boundaries with fallback UI
  - Toast notifications for user feedback
  - Tooltips on interactive elements

#### Changed
- CSS variables for consistent theming
- Component styling for better visual hierarchy
- App.css reorganized with design tokens

#### Fixed
- Dark mode contrast issues
- Button accessibility improvements

## [0.5.2] - 2026-04-07

#### Added
- **Real AI Integration (M5 Phase 2)**
  - OpenAI API integration via OpenRouter
  - AICommand service for code generation
  - AI Chat interface with real-time responses
  - Context-aware AI suggestions
  - Code explanation and analysis
  - Real-time "thinking" indicator
  - Command history tracking

#### Changed
- AI routes: New endpoints for command processing
- Frontend: AI Command page with chat interface
- Asset generation pipeline stubbed (placeholder for M6)

#### Fixed
- API key configuration
- CORS issues for AI endpoints

## [0.5.0] - 2026-04-07

#### Added
- **AI-Native UX Foundation (M5 Phase 1)**
  - Command palette (⌘K) for quick actions
  - Floating AI assistant button (FAB)
  - Contextual AI assistance hints
  - AI-first onboarding tour
  - AI-themed branding elements

#### Changed
- AppLayout: Integrated command palette and FAB
- Navigation: AI-first design language

## [0.4.0] - 2026-04-07

#### Added
- **Scene Editor (M4 Phase 3)**
  - Canvas-based 2D visual editor
  - Entity placement and selection
  - Drag-and-drop entity movement
  - Property inspector panel
  - Viewport controls (zoom, pan, grid)
  - Entity component system
  - Scene save/load
  - Keyboard shortcuts (V, M, Delete, Ctrl+S)

#### Changed
- EditorPage: Split into code editor and scene editor
- Engine: Added Entity, Transform, Component types

## [0.3.3] - 2026-04-07

#### Added
- **Code Editor (M4 Phase 2)**
  - Monaco-style code editor interface
  - File tree with project structure
  - File create/edit/delete
  - Tab-based editing
  - Syntax highlighting support

#### Changed
- EditorPage: New code editing interface
- FileService: Enhanced for code operations

## [0.3.2] - 2026-04-07

#### Added
- **Project Hub (M4 Phase 1)**
  - Project overview page
  - Tabbed navigation (Editor, Scene, AI, Assets, Play)
  - Project statistics display
  - Quick access to all project features

#### Changed
- Routing: Project page with nested routes
- AppLayout: Context-aware sidebar

## [0.3.1] - 2026-04-07

#### Added
- **File System (M3)**
  - File service for CRUD operations
  - File tree browsing
  - Directory creation
  - File content read/write
  - File search functionality

#### Changed
- Routes: File system API endpoints
- Frontend: File workspace component

#### Fixed
- Path handling for nested directories
- File encoding issues

## [0.3.0] - 2026-04-07

#### Added
- **Project CRUD (M2 Phase 1)**
  - Create project with metadata (name, genre, art style, description)
  - List projects
  - Get project details
  - Update project metadata
  - Delete project
  - Project file system initialization
  - Default scene and script templates

#### Changed
- Backend: Project service with full CRUD
- Frontend: Create project form, project cards

#### Fixed
- Project ID generation collisions

## [0.2.0] - 2026-04-07

#### Added
- **Authentication & Dashboard (M1)**
  - User authentication (placeholder)
  - Dashboard with project overview
  - Quick action cards (New Project, Open Project, Examples)
  - Project cards with metadata
  - Navigation system

#### Changed
- Frontend: Dashboard page, settings page
- Routing: Auth-protected routes

## [0.1.0] - 2026-04-07

#### Added
- **Initial Release**
  - Project scaffolding
  - Monorepo structure with pnpm workspaces
  - Shared package for types and utilities
  - Fastify backend
  - React frontend with Vite
  - Basic routing
  - Project model
  - Engine types (Entity, Transform, Component)
