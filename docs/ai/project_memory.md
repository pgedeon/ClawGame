# Project Memory

> AI continuity file for ClawGame. Updated as work progresses.

## Current Status

- **Phase:** Milestone 0 (Foundation) → **Near Complete**
- **Started:** 2026-04-07
- **Last Updated:** 2026-04-07 10:55 UTC

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

## Architecture

```
clawgame/
├── apps/
│   ├── web/         # React editor (port 5173)
│   └── api/         # Fastify backend (port 3000)
├── packages/
│   ├── engine/      # 2D runtime
│   ├── editor-core/ # Editor state/logic
│   ├── ai-orchestrator/ # AI provider routing
│   ├── asset-pipeline/  # ComfyUI client
│   ├── project-sdk/     # Project manipulation
│   ├── ui/              # Shared components
│   └── shared/          # Types, utilities
└── docs/               # Project docs
```

## Completed

- [x] Monorepo scaffold
- [x] Project metadata schema (`clawgame.project.json`)
- [x] Web app shell (React + Vite)
- [x] API shell (Fastify)
- [x] Shared types package
- [x] Documentation structure

## Next Steps

1. Run `pnpm install` to resolve dependencies
2. Test `pnpm dev:web` and `pnpm dev:api`
3. Initialize Git repo
4. Begin Milestone 1 (Core Editor Shell)

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
