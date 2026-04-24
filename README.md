# ClawGame — Visual Phaser 4 Game Editor

Build 2D games in your browser with a visual editor that compiles to clean, standalone Phaser 4 code.

## Features

- **Visual Scene Editor**: Drag-and-drop entity placement with real-time Phaser preview
- **Asset Management**: Upload and organize sprites, spritesheets, audio, and tilesets
- **Animations Editor**: Create and preview sprite animations without writing code
- **Tilemap Editor**: Paint tile-based levels with layer management
- **Prefab System**: Reusable entity templates with component schemas
- **Physics Tooling**: Arcade Physics body editing with debug overlay
- **AI-Assisted Editing**: AI commands with previewable diffs and rollback
- **Code Export**: Standalone Phaser 4 TypeScript with user code preservation

## Project Structure

```
clawgame/
├── apps/
│   └── web/                  # React editor UI (Vite)
├── packages/
│   ├── engine/               # Core ECS, scene compiler, asset pack, animations, tilemaps, prefabs
│   ├── phaser-runtime/       # Phaser 4 live editor runtime
│   └── api/                  # Project storage API
├── .github/workflows/ci.yml  # CI pipeline
└── clawgame-1.0.md           # Full milestone plan
```

## Quick Start

```bash
pnpm install
pnpm dev
```

## Quality Gates

All gates must pass before merging:

```bash
pnpm --filter @clawgame/engine typecheck && pnpm --filter @clawgame/engine test
pnpm --filter @clawgame/web typecheck && pnpm --filter @clawgame/web test
pnpm --filter @clawgame/phaser-runtime lint && pnpm --filter @clawgame/phaser-runtime test
pnpm build
```

## Tech Stack

- **Editor**: React 18, TypeScript, Vite
- **Engine**: TypeScript (framework-agnostic ECS)
- **Runtime**: Phaser 4 (Arcade Physics)
- **Build**: pnpm monorepo, Vitest
