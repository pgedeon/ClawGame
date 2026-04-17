# Changelog

## [Unreleased]

## [0.20.4] - 2026-04-17

### Added
- **M10 Asset Factory Core Complete** — Full implementation of sprite analysis, slicing, pixel pipeline, tileset forge, and batch utilities with comprehensive UI integration
  - **Sprite Analyzer** (`analyzeSprite`) — Metadata detection with grid pattern recognition (16x16, 32x32, 64x64, etc.), dominant color extraction using quantization, and comprehensive sprite analysis
  - **Sprite Sheet Slicer** (`sliceSpriteSheet`) — Automated frame extraction from sprite sheets with manifest generation, animation metadata support, and individual frame export
  - **Pixel Pipeline** (`pixelize`, `reducePalette`) — Pixelization via downscale/upscale with nearest-neighbor filtering, palette reduction with posterization, and edge cleanup options
  - **Tileset Forge** (`assembleTileset`) — Automated tile assembly in optimal grid layouts, autotile bitmask metadata generation, and canvas-based tile composition
  - **Batch Utilities** (`batchProcess`) — Multi-format batch processing (PNG/WebP/JPG), resize operations with multiple fit modes, automatic transparent trim, and concurrent asset processing
  - **AssetProcessingToolbar UI Component** — Interactive processing tools integrated into Asset Studio with real-time results and animation previews
  - **REST API Endpoints** — Complete set of processing endpoints: `/assets/analyze`, `/assets/slice`, `/assets/pixelize`, `/assets/palette-reduce`, `/assets/assemble-tileset`, `/assets/batch`
  - **SpriteSelector Component** — Asset-to-entity binding for scene integration with recommended asset suggestions
  - **AnimationPreview Component** — Live animation display for sliced sprite sheets with configurable playback
  - **Sharp Image Processing** — Production-grade image processing using Sharp library for all operations
- **Quality Gates** — All 7 asset factory tests passing + 289+ total tests across all packages, build compilation successful, TypeScript compilation clean, linting passes

### Fixed
- **Asset Factory test failures** — Replaced raw buffer PNG creation with proper Sharp-generated PNG files in test fixtures to resolve "unsupported image format" errors
- **API base URL consistency** — Updated AssetProcessingToolbar to use proper API endpoint paths for asset processing operations

### Tests
- `apps/api/src/test/asset-factory.test.ts` — 7 comprehensive tests covering all M10 functionality: sprite analysis, grid detection, slicing, pixelization, palette reduction, and error handling
- Integration tests with Sharp image processing library
- UI component testing for AssetProcessingToolbar and AssetStudio integration

## [Unreleased]

### Added
- **Genre Kits** (M13): 4 genre kits with 13 configurable behavior graph templates — PlatformerKit (patrol enemy, jumping enemy, collectible, hazard), TopDownKit (wander enemy, shooter enemy, item drop), RPGKit (quest NPC, turn-based enemy AI, villager NPC), TacticsKit (melee unit, ranged unit, support unit). All build on BehaviorGraph types. 35 new tests.
- **Behavior Graph Module** (M13): Data model and runtime executor for visual logic authoring. `BehaviorGraph` type with composable nodes (composite: sequence/selector/parallel, decorator: inverter/repeater/until-fail/timer/cooldown, condition, action). `BehaviorExecutor` runs graphs tick-bytick with per-entity state tracking. Built-in conditions (always, never, random-chance, entity-in-range, entity-has-tag, health-below/above, input-pressed, timer-elapsed, custom). Built-in actions (set-velocity, move-to, move-toward-entity, apply-damage, heal, destroy-self, fire-event, set-tag, remove-tag, set-variable, change-state, custom). Extensible via registered custom condition evaluators and action executors. 20 tests. Foundation for M13 Gameplay Authoring Layer.
- **PhysicsSystem + CollisionSystem** (M12): Physics system with gravity, friction, AABB collision response, world bounds clamping, and grounded detection. Collision system with broad-phase AABB detection, typed collision events (enter/pickup/damage/trigger), and once-only trigger semantics. Both integrated into Engine update loop. 12 new tests (43 engine total, 209 project-wide).
- **Behavior Presets Library** (M13): Pre-built behavior graphs for common enemy/NPC patterns via `BehaviorPresets`. Four configurable presets: `patrol` (back-and-forth between two points), `chase` (detect + pursue + idle), `alertChaseFlee` (full alert→chase→flee→idle state machine with health-based flee), `guard` (patrol radius + chase intruder + return to post). Each preset uses configurable parameters (ranges, speeds, thresholds). Includes `bindToType`/`bindToEntity` helpers for attaching graphs to entities. 16 tests. Engine total: 90 tests (262 project-wide).
- **Export runtime = preview runtime** (M12): Rewrote standalone export HTML inline engine to use the same simulation rules as the web preview (useGamePreview). Enemy chase AI (patrol when far, chase when <200px), obstacle collision per axis, projectile system (SPACE to shoot), collectible types (rune/health/coin) with glow rendering, HUD with health/mana/score/rune-count/FPS/minimap, NPC rendering with hat/name, player invincibility frames, victory (all runes collected) and game-over (health depleted) screens. M12 complete — all 172 tests pass.
- **Engine Events Bus** (M12): Typed `EventBus` class in `@clawgame/engine` with on/once/onAny/clear/history/mute. 20 predefined event types covering lifecycle, entity, input, gameplay, and AI events. Integrated into `Engine` class (emits scene:load, scene:unload, engine:start, engine:stop, engine:error). 20 tests.
- **Canonical Entity/Component Schema** (M12): Unified `SerializableEntity` and runtime `Entity` types in `@clawgame/engine`. Added conversion utilities (`toRuntimeEntity`, `toSerializableEntity`, `toRuntimeScene`, `toSerializableScene`). New component types: `StatsComponent`, `PlayerInputComponent`, `CollectibleComponent`, `PhysicsComponent`, `TriggerComponent`, `CameraComponent`, `AnimationComponent`. Scene editor imports from engine schema instead of duplicating types. 6 tests.
- **Data-driven Scene Loader** (M12): `SceneLoader` class in `@clawgame/engine` with pluggable `AssetResolver`, image caching, and `loadIntoEngine()` for data-driven scene loading. Single canonical path for editor, preview, export, and AI-generated scenes. 11 tests.
- **Quick Sprites workflow**

### Fixed
- **NavigationPage TypeScript compilation errors** — Fixed incorrect Toast API usage in NavigationPage.tsx by replacing `toast.success()` calls with correct `toast.showToast({ type: 'success', message: '...' })` API calls. Resolved TypeScript compilation failures on lines 277 and 308.
- **Onboarding overlay reappears on navigation** — OnboardingTour and ProjectOnboarding now initialize dismiss state from localStorage synchronously (was using useEffect, causing a flash/remount on every navigation). Added "Don't show again" to OnboardingTour. Both components now persist dismissal reliably across route changes.
- **VERSION.json stale** — Updated from M11/in-progress to M13/in-progress (v0.19.0).
- **CHANGELOG duplicate headers** — Consolidated three "### Added" headers in Unreleased section into one. (M11): Prompt-to-sprite-sheet pipeline with animation presets, frame grid generation, placeholder SVG output, and CRUD API routes (`/api/projects/:id/sprites/*`). 14 tests.
- **Assets tab infinite browser hang** — `loadGenerations()` ↔ `pollGenerations()` infinite recursion caused complete browser freeze on Assets tab. Fixed with polling guard ref, stable `useCallback` references, and removed re-entrant call path.

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).