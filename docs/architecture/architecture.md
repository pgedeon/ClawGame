# ClawGame Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Dashboard  │ │ Scene Editor│ │ Code Editor │            │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
│         │               │               │                    │
│  ┌──────┴───────────────┴───────────────┴──────┐            │
│  │              Editor Core (State)             │            │
│  └──────────────────────┬──────────────────────┘            │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │              Live Preview (Engine)           │            │
│  │    ┌──────────────┐  ┌──────────────────┐   │            │
│  │    │ Legacy Canvas│  │   Phaser 4       │   │            │
│  │    │  (deprecated)│  │   (active)       │   │            │
│  │    └──────────────┘  └──────────────────┘   │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/SSE
┌─────────────────────────┴───────────────────────────────────┐
│                      Backend (API)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Files     │ │    Git      │ │  AI Router  │            │
│  └─────────────┘ └─────────────┘ └──────┬──────┘            │
│                                         │                    │
│  ┌─────────────┐ ┌─────────────┐ ┌──────┴──────┐            │
│  │  Projects   │ │   Assets    │ │ Image Proc  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Actual Package Structure

```
clawgame/
├── apps/
│   ├── web/                    # React editor UI (Vite + React 18)
│   │   ├── src/
│   │   │   ├── api/            # API client + types
│   │   │   ├── components/     # UI components (scene editor, game, asset studio, etc.)
│   │   │   ├── hooks/          # useGamePreview, useSceneLoader, useRPGState, useUndoRedo
│   │   │   ├── pages/          # Route-level pages
│   │   │   ├── runtime/        # Preview runtime sessions (legacy canvas + Phaser 4)
│   │   │   ├── rpg/            # RPG game systems (inventory, dialogue, quests, spells, replay)
│   │   │   └── utils/          # Shared utilities (preview scene, tower defense, sprites)
│   │   └── package.json
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── routes/         # REST endpoints (projects, files, AI, assets, export, git, saves, etc.)
│       │   ├── services/       # Business logic (AI, assets, export, files, projects, SFX, sprites, images)
│       │   ├── test/           # Smoke + export tests
│       │   ├── types/          # API-specific types
│       │   └── utils/          # Env config
│       └── package.json
├── packages/
│   ├── engine/                 # Framework-agnostic ECS + scene compiler
│   │   ├── src/
│   │   │   ├── systems/        # Input, Movement, AI, Render, Physics, Collision, Projectile, Animation, Damage
│   │   │   ├── types.ts        # Engine component types (to be unified with shared)
│   │   │   ├── Engine.ts       # Core engine
│   │   │   ├── EventBus.ts     # Event system
│   │   │   ├── SceneLoader.ts  # Scene loading + validation
│   │   │   ├── scene-compiler.ts  # Compile scenes → Phaser 4 TS/JS code
│   │   │   ├── asset-pack.ts   # Asset pack serialization
│   │   │   ├── animations.ts   # Animation config + code gen
│   │   │   ├── tilemap.ts      # Tilemap data model + code gen
│   │   │   ├── prefabs.ts      # Prefab templates
│   │   │   ├── ai-workflows.ts # AI edit operations with diff preview
│   │   │   └── history.ts      # Undo/redo stack
│   │   └── package.json
│   ├── phaser-runtime/         # Phaser 4 live editor runtime
│   │   ├── src/
│   │   │   ├── ClawgamePhaserRuntime.ts   # Phaser game instance manager
│   │   │   ├── ClawgamePhaserScene.ts     # Scene class with entity rendering + physics debug
│   │   │   ├── buildPreviewBootstrap.ts   # Scene config → Phaser bootstrap
│   │   │   └── types.ts
│   │   └── package.json
│   └── shared/                 # Shared types, utilities, constants
│       └── src/
│           └── index.ts        # (TODO: split into multiple modules)
├── docs/                       # Documentation
├── .github/workflows/ci.yml   # CI pipeline
├── VERSION.json               # Single source of truth for version
├── CLAWGAME_SPEC.md           # Full product spec
└── pnpm-workspace.yaml        # Monorepo config
```

## Major Subsystems

### 1. Frontend Editor App (`apps/web`)

React 18 + Vite application providing:
- Project dashboard with create/open flows
- Visual 2D scene editor (drag-drop entities, property inspector, layers)
- CodeMirror 6 code workspace
- Asset studio with AI generation + image processing toolbar
- AI command center with streaming responses
- Live game preview (legacy canvas + Phaser 4 runtimes)
- RPG game systems (inventory, quests, dialogue, spell crafting, replay)
- Export center (standalone HTML)
- Git center (init, commit, diff, revert)

### 2. Backend API (`apps/api`)

Fastify server handling:
- Project CRUD + metadata storage
- File operations (tree, read, write, search, mkdir)
- AI command routing (OpenRouter / z.ai with circuit breaker + fallback)
- Asset management + generation (SVG placeholder, multi-model support)
- Image processing (sprite analysis, slicing, pixel pipeline, tileset forge, batch)
- Export pipeline (standalone HTML with embedded assets)
- Save/load system (RPG save slots)
- Git operations (init, status, diff, commit, revert)
- SFX generation
- Sprite sheet processing
- Generative media forge

### 3. Engine (`packages/engine`)

Framework-agnostic 2D game engine:
- Entity-Component-System (ECS) architecture
- Systems: Input, Movement, AI, Render, Physics, Collision, Projectile, Animation, Damage
- Scene compiler → standalone Phaser 4 TypeScript/JavaScript
- User code region preservation (USER_IMPORTS, USER_PRELOAD, USER_CREATE, USER_UPDATE, USER_CUSTOM_METHODS)
- Asset pack system with preload code generation
- Animation + tilemap code generation
- Prefab templates with override tracking
- AI workflow operations with diff preview
- Undo/redo history stack

### 4. Phaser Runtime (`packages/phaser-runtime`)

Phaser 4 integration for live editor preview:
- Game instance lifecycle management
- Scene class with entity rendering (colored rectangles → sprites)
- Physics debug overlay
- Grid snapping + entity selection
- Scene config → Phaser bootstrap

### 5. Shared (`packages/shared`)

Common types and utilities:
- Component interfaces (Transform, Sprite, Movement, Stats, Collision, etc.)
- Asset type system + enums
- Math utilities (distance, normalize, clamp, lerp, rotate)
- Game templates (platformer, RPG, shooter)
- ID generation (nanoid)
- Legacy compatibility maps

## Runtime Strategy

Two preview runtimes exist:

| Runtime | Status | Features |
|---------|--------|----------|
| Legacy Canvas | **Deprecated** | Full RPG, tower defense, replay, all genres |
| Phaser 4 | **Active** | Basic entity rendering, physics debug, scene editing |

The legacy canvas runtime is feature-complete but deprecated. New development should target Phaser 4. Game logic (RPG, tower defense, replay) should be extracted into engine-level systems that both runtimes can share.

## Data Flow

1. **User Intent** → AI Command Center or Scene Editor
2. **AI** → Analyzes project context → Proposes plan (with diff preview)
3. **User** → Reviews/approves plan
4. **AI** → Executes changes via file API
5. **Backend** → Writes files, optionally commits to Git
6. **Frontend** → Refreshes view
7. **User** → Playtests in live preview immediately

## Key Files

| File | Purpose |
|------|---------|
| `VERSION.json` | Single source of truth for version |
| `CLAWGAME_SPEC.md` | Full product specification |
| `docs/ai/project_memory.md` | AI continuity memory |
| `docs/tasks/current_sprint.md` | Current work items |
| `docs/architecture/architecture.md` | This file |

---

See also:
- [Engine Notes](engine_notes.md)
- [Known Issues](../qa/known_issues.md)
- [Roadmap](../product/roadmap.md)
