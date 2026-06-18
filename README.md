# ClawGame — AI-First Visual Game Editor

Build 2D games in your browser with a visual editor that compiles to clean, standalone Phaser 4 code.

## Features

- **Visual Scene Editor**: Drag-and-drop entity placement with real-time Phaser preview
- **Asset Management**: Upload and organize sprites, spritesheets, audio, and tilesets
- **Asset Factory**: Sprite analyzer, sheet slicer, pixel pipeline, tileset forge, batch processing
- **Animations Editor**: Create and preview sprite animations without writing code
- **Tilemap Editor**: Paint tile-based levels with layer management
- **Prefab System**: Reusable entity templates with component schemas
- **Physics Tooling**: Arcade Physics body editing with debug overlay
- **AI-Assisted Editing**: AI commands with previewable diffs and rollback
- **RPG Systems**: Inventory, quests, dialogue, spell crafting, save/load, replay
- **Code Export**: Standalone Phaser 4 TypeScript with user code preservation
- **Git Integration**: Init, commit, diff, and revert from the editor

## Project Structure

```
clawgame/
├── apps/
│   ├── web/                  # React editor UI (Vite + React 18)
│   └── api/                  # Fastify backend (project CRUD, files, AI, assets, export)
├── packages/
│   ├── engine/               # Framework-agnostic ECS, scene compiler, asset pack
│   ├── phaser-runtime/       # Phaser 4 live editor runtime
│   └── shared/               # Shared types, math, templates, utilities
├── docs/                     # Architecture, roadmap, tasks, QA
├── examples/                 # Example projects (placeholder)
├── .github/workflows/ci.yml  # CI pipeline
├── CLAWGAME_SPEC.md          # Full product specification
├── IMPROVEMENT-PLAN.md       # Active codebase improvement plan
└── VERSION.json              # Single source of truth for version
```

## Quick Start

```bash
pnpm install
pnpm dev          # Starts web + API concurrently
```

Or run individually:

```bash
pnpm dev:web      # Frontend only
pnpm dev:api      # Backend only
```

## Quality Gates

```bash
pnpm build         # Build all packages in dependency order
pnpm typecheck     # Typecheck all packages
pnpm test          # Run all tests + typecheck
pnpm lint          # Lint all packages
```

Pre-commit hooks (Husky + lint-staged) automatically run typecheck on staged files.

## Tech Stack

- **Editor**: React 18, TypeScript, Vite, CodeMirror 6
- **Engine**: TypeScript (framework-agnostic ECS)
- **Runtime**: Phaser 4 (Arcade Physics)
- **Backend**: Fastify, pino logger
- **AI**: OpenRouter / z.ai with circuit breaker + fallback
- **Build**: pnpm monorepo, Vitest, Playwright

## Documentation

- [Product Spec](CLAWGAME_SPEC.md)
- [Architecture](docs/architecture/architecture.md)
- [Roadmap](docs/product/roadmap.md)
- [Improvement Plan](IMPROVEMENT-PLAN.md)
- [Known Issues](docs/qa/known_issues.md)

## License

MIT
