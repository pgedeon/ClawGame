# Project Memory

> AI continuity file for ClawGame. Updated as work progresses.

## Current Status

- **Phase:** Milestone 0 (Foundation) → **COMPLETE**
- **Started:** 2026-04-07
- **Completed:** 2026-04-07
- **Next:** Milestone 1 (Core Editor Shell)

## What We're Building

AI-first, web-based 2D game engine and editor with native OpenClaw integration.

## Key Decisions

| Decision | Rationale | Date |
|----------|------------|------|
| TypeScript-first | Best AI tooling, web-native | 2026-04-07 |
| pnpm monorepo | Clean workspace deps | 2026-04-07 |
| Fastify for API | Fast, type-safe, good DX | 2026-04-07 |
| React + Vite for web | Modern, fast HMR | 2026-04-07 |
| ComfyUI for assets | Already integrated with OpenClaw | 2026-04-07 |
| Canvas 2D for initial runtime | Simplest viable rendering path | 2026-04-07 |

## Architecture

```
clawgame/
├── apps/
│   ├── web/         # React editor (port 5173)
│   └── api/         # Fastify backend (port 3000)
├── packages/
│   ├── engine/      # 2D runtime (Canvas-based)
│   ├── editor-core/ # Editor state/logic
│   ├── ai-orchestrator/ # AI provider routing
│   ├── asset-pipeline/  # ComfyUI client
│   ├── project-sdk/     # Project manipulation
│   ├── ui/              # Shared components
│   └── shared/          # Types, utilities
└── docs/               # Project docs
```

## Milestone 0 Completion Summary

- Monorepo scaffold with 5 workspace packages
- All TypeScript configs in place
- `@clawgame/shared`: Project metadata, entity/component, scene/layer types
- `@clawgame/engine`: Basic Engine class with Canvas game loop, scene management, entity rendering
- `apps/web`: React + Vite shell, builds and serves on :5173
- `apps/api`: Fastify shell with health + project endpoints, serves on :3000
- `pnpm build` passes cleanly across all packages
- Git repo initialized with 3 commits

## Build Verification

```
pnpm install → 192 packages
pnpm build → 4/5 packages build (5th has no build script)
pnpm dev:web → localhost:5173 ✅
pnpm dev:api → localhost:3000 ✅
```

## Next Steps (Milestone 1)

1. Project dashboard UI with layout and routing
2. Project open/create flows
3. Navigation sidebar
4. Placeholder panels (AI command, asset studio)
5. Project metadata stored and displayed

## Integration Points

### OpenClaw
- Project metadata: `clawgame.project.json`
- Memory: `docs/ai/project_memory.md`
- Sprint: `docs/tasks/current_sprint.md`
- Agent roles: `director-agent`, `gameplay-agent`, `ui-agent`, `tools-agent`, `asset-agent`, `qa-agent`

### ComfyUI
- Default URL: `http://127.0.0.1:8188`
- Asset types: sprites, tilesets, textures, icons, portraits, UI elements

---

See also:
- [Current Sprint](../tasks/current_sprint.md)
- [Known Issues](../qa/known_issues.md)
- [Architecture](../architecture/architecture.md)
