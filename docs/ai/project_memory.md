# Project Memory

> AI continuity file for ClawGame. Updated as work progresses.

## Current Status

- **Phase:** Milestone 0 (Foundation)
- **Started:** 2026-04-07
- **Last Updated:** 2026-04-07 11:15 UTC
- **Dev Agent:** Runs every 30min
- **PM Agent:** Runs every 2h

## Agent System

### Development Agent (`clawgame-dev-continuation`)
- **Cron ID:** `6805c4fa-a84c-4bcc-b297-59419292cfdc`
- **Schedule:** Every 30 minutes
- **Role:** Implements features, fixes bugs, builds the product
- **Priority:** Follows PM feedback first, then sprint tasks

### PM/CEO Agent (`clawgame-pm-review`)
- **Cron ID:** `5657aedb-e4e5-452e-95d0-1f8b7b04e090`
- **Schedule:** Every 2 hours
- **Role:** Reviews work, provides strategic direction, ensures quality
- **Output:** `docs/ai/pm_feedback.md`

### Feedback Loop
1. PM reviews recent commits and code quality
2. PM writes feedback to `pm_feedback.md`
3. Dev agent reads PM feedback before each run
4. Dev prioritizes PM issues and suggestions
5. Dev implements changes and commits
6. PM reviews new changes on next run

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
| PM + Dev agent system | Quality control, strategic direction | 2026-04-07 |

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
├── docs/
│   ├── product/     # Vision, roadmap
│   ├── architecture/ # System design
│   ├── tasks/       # Sprint, backlog
│   ├── ai/          # Project memory, PM feedback
│   └── qa/          # Known issues
└── scripts/         # Agent prompts, utilities
```

## Completed

- [x] Monorepo scaffold
- [x] Project metadata schema
- [x] Web app shell (React + Vite)
- [x] API shell (Fastify)
- [x] Shared types package
- [x] Documentation structure
- [x] Git initialized with initial commit
- [x] PM feedback loop established

## Next Steps

1. Run `pnpm install` to resolve dependencies
2. Test `pnpm dev:web` and `pnpm dev:api`
3. Complete all package.json files
4. Add TypeScript configs to all packages
5. Begin Milestone 1 (Core Editor Shell)

## Integration Points

### OpenClaw
- Project metadata: `clawgame.project.json`
- Memory: `docs/ai/project_memory.md`
- PM Feedback: `docs/ai/pm_feedback.md`
- Sprint: `docs/tasks/current_sprint.md`
- Agent roles: `director-agent`, `gameplay-agent`, `ui-agent`, `tools-agent`, `asset-agent`, `qa-agent`

### ComfyUI
- Default URL: `http://127.0.0.1:8188`
- Asset types: sprites, tilesets, textures, icons, portraits, UI elements

---

See also:
- [PM Feedback](pm_feedback.md) - CEO direction and quality assessment
- [Current Sprint](../tasks/current_sprint.md)
- [Known Issues](../qa/known_issues.md)
