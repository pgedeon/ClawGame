# Changelog

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



## [0.18.0] - 2026-04-09

### Added
- **SFX Generation Service** (M11: Generative Media Forge) — Genre-aware sound effect pack generation with engine-consumable metadata
  - `POST /api/projects/:projectId/sfx/generate` — Generate SFX pack from genre templates (platformer, RPG, shooter, tower defense, puzzle)
  - `GET /api/projects/:projectId/sfx/packs` — List SFX packs
  - `GET /api/projects/:projectId/sfx/:name` — Get individual SFX descriptor
  - `DELETE /api/projects/:projectId/sfx/:name` — Delete SFX descriptor
  - Per-effect metadata files (`.sfx.json`) stored in `assets/sfx/` for engine consumption
  - Pack-level `pack.json` with full SFX manifest
- 12 tests for SFX generation lifecycle (generate, persist, list, get, delete, genre matching)

## [0.17.0] - 2026-04-09

#### Added
- **AI Command apply/reject smoke tests** — 5 new API-level tests validating the critical "AI builds your game" flow: command → code generation → apply (file write) → verify persistence, reject (skip) → original intact, apply-all → multiple files, and read-after-write consistency. Closes PM Priority 1 validation gap.

#### Tests
- `apps/api/src/test/ai-command-apply.test.ts` — 5 tests covering the full AI Command apply/reject lifecycle

## [0.16.0] - 2026-04-09

#### Added