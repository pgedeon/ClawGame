# Changelog

## [Unreleased]
### Added
- **Genre Kits** (M13): 4 genre kits with 13 configurable behavior graph templates — PlatformerKit (patrol enemy, jumping enemy, collectible, hazard), TopDownKit (wander enemy, shooter enemy, item drop), RPGKit (quest NPC, turn-based enemy AI, villager NPC), TacticsKit (melee unit, ranged unit, support unit). All build on BehaviorGraph types. 35 new tests.
### Added
- **Behavior Graph Module** (M13): Data model and runtime executor for visual logic authoring. `BehaviorGraph` type with composable nodes (composite: sequence/selector/parallel, decorator: inverter/repeater/until-fail/timer/cooldown, condition, action). `BehaviorExecutor` runs graphs tick-bytick with per-entity state tracking. Built-in conditions (always, never, random-chance, entity-in-range, entity-has-tag, health-below/above, input-pressed, timer-elapsed, custom). Built-in actions (set-velocity, move-to, move-toward-entity, apply-damage, heal, destroy-self, fire-event, set-tag, remove-tag, set-variable, change-state, custom). Extensible via registered custom condition evaluators and action executors. 20 tests. Foundation for M13 Gameplay Authoring Layer.
- **PhysicsSystem + CollisionSystem** (M12): Physics system with gravity, friction, AABB collision response, world bounds clamping, and grounded detection. Collision system with broad-phase AABB detection, typed collision events (enter/pickup/damage/trigger), and once-only trigger semantics. Both integrated into Engine update loop. 12 new tests (43 engine total, 209 project-wide).
- **Behavior Presets Library** (M13): Pre-built behavior graphs for common enemy/NPC patterns via `BehaviorPresets`. Four configurable presets: `patrol` (back-and-forth between two points), `chase` (detect + pursue + idle), `alertChaseFlee` (full alert→chase→flee→idle state machine with health-based flee), `guard` (patrol radius + chase intruder + return to post). Each preset uses configurable parameters (ranges, speeds, thresholds). Includes `bindToType`/`bindToEntity` helpers for attaching graphs to entities. 16 tests. Engine total: 90 tests (262 project-wide).
- **Export runtime = preview runtime** (M12): Rewrote standalone export HTML inline engine to use the same simulation rules as the web preview (useGamePreview). Enemy chase AI (patrol when far, chase when <200px), obstacle collision per axis, projectile system (SPACE to shoot), collectible types (rune/health/coin) with glow rendering, HUD with health/mana/score/rune-count/FPS/minimap, NPC rendering with hat/name, player invincibility frames, victory (all runes collected) and game-over (health depleted) screens. M12 complete — all 172 tests pass.
- **Engine Events Bus** (M12): Typed `EventBus` class in `@clawgame/engine` with on/once/onAny/clear/history/mute. 20 predefined event types covering lifecycle, entity, input, gameplay, and AI events. Integrated into `Engine` class (emits scene:load, scene:unload, engine:start, engine:stop, engine:error). 20 tests.
- **Canonical Entity/Component Schema** (M12): Unified `SerializableEntity` and runtime `Entity` types in `@clawgame/engine`. Added conversion utilities (`toRuntimeEntity`, `toSerializableEntity`, `toRuntimeScene`, `toSerializableScene`). New component types: `StatsComponent`, `PlayerInputComponent`, `CollectibleComponent`, `PhysicsComponent`, `TriggerComponent`, `CameraComponent`, `AnimationComponent`. Scene editor imports from engine schema instead of duplicating types. 6 tests.
- **Data-driven Scene Loader** (M12): `SceneLoader` class in `@clawgame/engine` with pluggable `AssetResolver`, image caching, and `loadIntoEngine()` for data-driven scene loading. Single canonical path for editor, preview, export, and AI-generated scenes. 11 tests.
### Added
- **Quick Sprites workflow** (M11): Prompt-to-sprite-sheet pipeline with animation presets, frame grid generation, placeholder SVG output, and CRUD API routes (`/api/projects/:id/sprites/*`). 14 tests.

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
- **Prompt Recipe Library** — Predefined prompt recipes for common game development tasks, accessible from the AI assistant panel (M9 AI Creator Workspace)
  - 10 curated recipes across 5 categories: Combat, Scenes, AI, Assets, Code, Gameplay
  - Searchable and filterable by category
  - Recipes include parameterized placeholders for customization
  - Integrated into the floating AI panel (AIFAB) with toggle and empty-state access
  - New PromptRecipeLibrary component with full CSS styling

## [0.13.5] - 2026-04-09

#### Fixed
- **AI generates wrong game type** — AI service now includes project metadata (name, genre, artStyle, description) in prompts via `getProjectContext()` helper
- **Game preview canvas is empty** — Added `DEFAULT_SCENE` fallback with player, enemy, and collectible entities when projectScene is null/empty
- **Code editor doesn't show file contents** — FileWorkspace component now uses separate `loading` state for initial file load (was conflated with `saving` state)
- FileWorkspace properly handles `onLoad` prop for CodeEditor content initialization
- CodeEditor displays file content correctly on selection

## [0.13.4] - 2026-04-09

#### Added
- **Playwright E2E Testing Framework** — End-to-end smoke tests for critical user flows
  - Added @playwright/test and playwright packages
  - Created 3 smoke tests covering dashboard functionality
  - Dashboard load verification (title, hero section, projects list)
  - New project creation flow (navigate to create-project page)
  - Project navigation (click project card, verify project URL)
  - Automated onboarding tour dismissal in tests
  - Test scripts: `pnpm test:e2e`, `pnpm test:e2e:headed`, `pnpm test:e2e:debug`
  - Chromium browser installed for headless testing
  - HTML reporter with screenshots on failure
  - Traces on first retry for debugging

#### Changed
- Updated .gitignore to exclude Playwright test results and reports

## [0.13.3] - 2026-04-09

#### Fixed
- **Asset list auto-refresh after generation** — Assets now appear immediately when generation completes
  - Added detection for newly completed generations
  - Immediate asset list refresh when generation status is 'completed'
  - No longer requires manual "Refresh assets" button click
  - Toast notification confirms when new assets are generated

#### Changed
- Removed project data from git tracking (apps/api/data/projects/*)
  - Project files should be gitignore'd for user privacy
  - Data directory now properly excluded from version control

## [0.12.1] - 2026-04-08

#### Fixed
- **Game Preview Page** — Hardcoded "Eclipse of Runes" title now displays actual project name
  - Added `projectName` state variable
  - Load project name from API on component mount
  - Replace all hardcoded references with dynamic `{projectName}`
- **AI Command Timeout** — Increased API timeout from 120s to 180s (3 minutes) to prevent timeout errors
  - Added cancel button during AI processing for user control
  - Input stays enabled after timeout errors (previously disabled)
  - Added retry button to resubmit failed prompts
- **Export Page** — Download trigger now properly triggers file download after export completes
  - Added toast notifications for success/error states
  - Improved error handling with user feedback
- **Settings Page** — Replaced stub with full-featured settings interface
  - Appearance: Theme toggle (dark/light/system) with localStorage persistence
  - AI: Default AI Model selector (dropdown with GLM, GPT-4o, Claude options), Auto-suggestions toggle
  - Keyboard Shortcuts: Reference table showing all shortcuts (⌘K, ⌘S, ⌘W, etc.)
  - About: Version info, links to GitHub, bug reports, changelog
  - Added full CSS styling for all settings components
- **Accessibility** — Fixed WCAG AA contrast failures and added reduced motion support
  - `--text-muted` increased from `#64748b` to `#7c8ca0` for better contrast on cards
  - Added `@media (prefers-reduced-motion: reduce)` to disable animations for `.hero-orb`, `.ai-fab-pulse`, `.build-spinner`, `.pulse-ring`


## [0.12.0] - 2026-04-08

#### Added
- **RPG System Foundation** — Complete type definitions and manager classes for RPG mechanics
  - InventoryManager: item tracking, equipment system, usage effects, stat bonuses
  - DialogueManager: tree-based dialogue with branching choices, conditions, and effects
  - QuestManager: objective tracking (kill, collect, talk, explore, craft), auto-completion
  - SpellCraftingManager: 3x3 rune grid crafting, recipe matching, hotkey assignment
  - SaveLoadManager: localStorage-based save slots with full game state serialization
  - NotificationSystem: toast notifications for loot, quests, info, success, error
- **RPG Type Definitions** — Comprehensive TypeScript interfaces
  - Item, Equipment, EquipmentSlots with rarity and stats
  - DialogueTree, DialogueLine, DialogueChoice with effects and conditions
  - Quest, QuestObjective with status and rewards
  - SpellRecipe, LearnedSpell, Rune with element system
  - SaveSlot, SaveData, SerializedEntity for persistence
  - GameNotification with type and duration
- **Demo RPG Scene** — "Eclipse of Runes" demonstrating all RPG systems
  - NPC Elder Mira with full dialogue tree (greeting, quest offer, completion)
  - Quest "Slime Slayer" with kill tracking and rewards
  - Item drops: Rusty Sword (weapon), Health Potion (consumable), Fire Rune Shard (crafting material)
  - All enemies tagged with enemyType for quest tracking
- **Spell Crafting Recipes** — 6 pre-defined spells (Fireball, Ice Shard, Earth Bolt, Shadow Bolt, Heal, Lightning)
- **RPG Notification Icons** — Context-aware icons (📜 for quests, 🎁 for loot, ✅ for success, ❌ for error)

#### Changed
- Scene "Rune Rush" renamed to "Eclipse of Runes" to reflect RPG theme
- Scene metadata updated to include RPG features: dialogue, quests, inventory, spell-crafting, save-load

#### Fixed
- TypeScript errors in DialogueManager return type annotation
- TypeScript errors in InventoryManager equipment spreading (spread operator conflict with EquipmentSlots interface)


## [0.11.8] - 2026-04-08

#### Added
- **23 missing CSS classes** for game preview end-state screens
  - Status badges: `.status-badge.dead`, `.status-badge.victory` with glow effects
  - Game over overlay: full overlay with shake animation, icon, title, score, stats (time, health), buttons
  - Victory overlay: full overlay with bounce-in animation, icon, title, score, health, time, buttons
  - Buttons: `.restart-btn`, `.back-btn` with hover and active states
  - Start screen info: `.start-screen-info`, `.info-icon`, `.info-item` for keyboard controls
  - Animations: `shake-in` (game over), `victory-pulse` (victory), `bounce-in` (icon entry)

#### Fixed
- **Asset Studio "prev is not iterable" crash** — Fixed parameter shadowing in setState callback. Changed `setAssets(prev => prev.filter(...))` to `setAssets(currentAssets => currentAssets.filter(...))`. Users can now delete assets without full-page crash.
- **AssetSuggestions TypeScript error** — Added optional `projectId` prop with fallback to route parameter. Component is now reusable in different contexts.
- Game over and victory screens now render with proper styling and emotional feedback (shake for loss, bounce/pulse for win)
- Status badges (dead, victory) now show correct colors and visual states


## [0.11.7] - 2026-04-08

#### Fixed
- **Game Preview crash on entity.transform** — Added defensive null/undefined checks for entity.transform before accessing x/y properties. Prevents "Cannot read properties of undefined (reading 'transform')" errors.
- **AI Command messaging clarity** — Added prominent "Demo Mode" banner that clearly distinguishes between mock AI responses and real AI integration. Removed confusing "Connected to:" status text that implied real AI was active.
- **AI Command error handling** — Improved error messages when OpenRouter API is unreachable or misconfigured. Show user-friendly error with actionable guidance instead of raw error text.
- **Scene entity validation** — All entities now get default transforms if missing from scene file during loading. Prevents runtime errors when scene.json is manually edited or corrupted.


## [0.11.5] - 2026-04-08

#### Added
- **Scene analysis API endpoint** — POST /api/projects/:id/scene-analysis reads actual scene.json files
- **SceneAnalysis interface** — captures entity composition, flags (player/enemies/platforms/etc.), dominantGenre inference
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

[565 more lines in file. Use offset=101 to continue.]

### [0.13.6] - 2026-04-09

#### Fixed
- Synced roadmap.md from stale Milestone 6 to current Milestone 8 status
- Removed tracked runtime assets/exports from git (added to .gitignore)
- Updated sprint file with accurate completion status for Priority 0/1 items
- Marked Milestone 7 (Git Center) as completed in roadmap

#### Added
- Playwright E2E smoke test infrastructure (dashboard, navigation, command palette)
- e2e/smoke.spec.ts with 4 core flow tests


### [0.13.6] - 2026-04-09

#### Fixed
- Synced roadmap.md from stale Milestone 6 to current Milestone 8 status
- Removed tracked runtime assets/exports from git (added to .gitignore)
- Updated sprint file with accurate completion status

#### Added
- Playwright E2E smoke test infrastructure (dashboard, navigation, command palette)


### [0.14.0] - 2026-04-09

#### Added
- Camera follow system in game preview — viewport centers on player entity
- Extended world grid and ground plane for better visual context
- Playwright E2E smoke test infrastructure

#### Fixed
- Synced roadmap.md from stale Milestone 6 to Milestone 8
- Removed tracked runtime assets/exports from git
- Projectile out-of-bounds check uses world coordinates

### [0.15.0] - 2026-04-09

#### Added
- Tower Defense game mode (Sacred Bean defense)
- 5 waves of office-themed enemies with wave spawning system
- Tower placement (T key) with auto-targeting and shooting
- Core entity health system with game over/victory conditions
- TD-specific HUD with wave count, tower count, enemy count
- Animated tower rendering with steam effects
- Projectiles integrate with TD tower system

#### Changed
- Strategy genre controls updated to match Tower Defense gameplay
