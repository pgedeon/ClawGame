# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[565 more lines in file. Use offset=101 to continue.]
### [0.12.2] - 2026-04-08

#### Fixed
- Asset Studio crash ("prev is not iterable"): unwrap getGenerations API response to properly handle `{ generations: [] }` format
- Game Preview showing wrong game name: display actual project name instead of hardcoded "Eclipse of Runes"
- Generic start screen description instead of RPG-specific tagline

#### Changed
- Bumped AI service timeout from 120s to 180s for longer code generation tasks

#### Added
- Sidebar section dividers: "Platform" and "Project" labels separate navigation groups
- ARIA accessibility: role="tablist"/"tab" on project hub tabs, aria-selected state
- aria-live="polite" on AI thinking indicator for screen reader announcements
- sidebar-section-title CSS styling with uppercase label, muted color, border separator

### 0.12.3 - 2026-04-08

#### Fixed
- **CRITICAL: Scene Editor Save now persists entities** — Map→Array serialization (was saving `{}`)
- **CRITICAL: Add Entity button now works** — shows template picker dropdown with Player/Enemy/Coin/Wall
- **CRITICAL: Game Preview renders entities** — handles array+object formats, infers type from components
- **CRITICAL: WelcomeModal shows only once per project** — localStorage tracked per project ID
- Entity duplicate names are readable (e.g., `player-1-copy` instead of `entity-1775666322645`)
- Save shows toast feedback with entity count on success, error message on failure
- RenderSystem draws colored rectangles as fallback when no sprite image is loaded
- Sprite type: `image` is now optional, added `color` field for rendering without assets

#### Changed
- Template picker dropdown replaces mode-toggle for Add Entity button
- Entity type inference: uses components (playerInput, ai, collision.type) to classify entities
- Type-based colors: player=blue, enemy=red, collectible=amber, obstacle=gray, npc=green

### 0.12.4 - 2026-04-08

#### Added
- Scene Editor keyboard shortcuts: Delete, Ctrl+D (duplicate), Ctrl+S (save), V (select), G (move), Escape (deselect)
- AI Command fallback notice: users see "AI offline — local code generation" banner when external API is unreachable
- AIFAB (floating AI assistant) now connects to real AI API instead of showing "coming soon"
- AIFAB shows live connection status (🟢 Live / 🔴 Offline) with periodic health checks
- AI health badge on AIFAB panel header
- Extracted hooks: useRPGState (RPG manager reactive state), useGameLoop (game loop engine)
- Extracted components: GameHUD, GameOverlays (start/pause/gameover/victory screens)
- Game loop render helpers: renderEntity, renderProjectile, renderParticle

#### Changed
- AI service: 30s timeout (was 180s), AbortController, 2 retries with exponential backoff
- AI service: circuit breaker (5 failures → 60s cooldown, half-open recovery)
- AI service: streaming SSE support for real-time AI responses
- AI service: local fallback codegen for 8 game system types (player, enemy, collectible, etc.)
- Asset image generation: unified with same AI API, SVG placeholder fallback
- API client: 90s timeout for AI commands, 60s default for other endpoints
- AI routes: SSE streaming endpoint for real-time command responses
- AI Command response includes `fromFallback` flag for UI notification

#### Fixed
- .gitignore: properly excludes apps/api/data/projects/ and exports/ (was leaking user data)
- Removed tracked project data from git history
- AI image generation test rewritten to match new service API
- AIFAB no longer shows contradictory "coming soon" when AI Command shows "Real AI Connected"
- User-facing error messages for AI timeout and failures in AIFAB
