# Project Memory

> AI continuity file for ClawGame. Updated as work progresses.

## 🎯 UNIFIED GOAL

**Make the best web-based AI-first game development platform that exists.**

All agents share this goal. Every decision, every line of code, every feature should move us toward this objective.

### Key Differentiators

1. **AI-First:** Natural language game creation, not just tools
2. **Web-Based:** No install, runs in browser
3. **Intuitive:** Non-technical users can make games
4. **Powerful:** Experts can go deep
5. **Fast:** Responsive, real-time editing

## Current Status

- **Phase:** Milestone 0 (Foundation)
- **Started:** 2026-04-07
- **Last Updated:** 2026-04-07 12:05 UTC

## 🤖 Multi-Agent System

ClawGame is built by an autonomous multi-agent team united by one goal.

### Dev Agent (`clawgame-dev-continuation`)
- **Cron ID:** `6805c4fa-a84c-4bcc-b297-59419292cfdc`
- **Schedule:** Every 30 minutes
- **Role:** Implements features, fixes bugs, builds the product
- **Priority:** Standup > PM > UI/UX > Game Dev > Sprint
- **Reads:** All feedback files

### PM/CEO Agent (`clawgame-pm-review`)
- **Cron ID:** `5657aedb-e4e5-452e-95d0-1f8b7b04e090`
- **Schedule:** Every 2 hours
- **Role:** Reviews quality, sets strategy, ensures excellence
- **Reads:** All feedback files

### Game Dev Agent (`clawgame-game-dev`)
- **Cron ID:** `10cc62e4-e17f-4271-a334-a79442ea5088`
- **Schedule:** Every 3 hours
- **Role:** Uses the engine to build games, provides real-world UX feedback
- **Reads:** All feedback files

### UI/UX Agent (`clawgame-uiux-review`)
- **Schedule:** Every 2 hours
- **Role:** Reviews visual design, UI/UX, competitive research
- **Model:** `qwen3.6-plus:free` (visual-focused)
- **Reads:** Standup notes, current state
- **Output:** `docs/ai/uiux_feedback.md`

### Team Standup (`clawgame-team-standup`)
- **Cron ID:** `f5002fc9-60cd-49fa-86e8-baf3ad3857f3`
- **Schedule:** Every 2 days (10:00 UTC)
- **Role:** All agents align, review feedback, make decisions
- **Reads:** All feedback files

### Feedback Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEAM STANDUP (Every 2d)                      │
│   Reviews all feedback, makes decisions, updates sprint         │
└─────────────────────────────────────────────────────────────────┘
         ↓ updates              ↓ reads              ↓ reads
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   DEV AGENT     │   │    PM AGENT     │   │  GAME DEV AGENT │
│   (Every 30m)   │←──│    (Every 2h)   │←──│    (Every 3h)   │
│   Builds code   │   │   CEO/Strategy  │   │    Real user    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         ↑                     ↑                     ↓
         │              ┌─────────────────┐         │
         └──────────────│  UI/UX AGENT    │─────────┘
                        │    (Every 2h)   │
                        │ Visual/Research │
                        └─────────────────┘
```

### Communication Files

| File | Who Writes | Who Reads |
|------|-----------|-----------|
| `pm_feedback.md` | PM Agent | All agents |
| `game_dev_feedback.md` | Game Dev Agent | All agents |
| `uiux_feedback.md` | UI/UX Agent | All agents |
| `standup_notes.md` | Standup Facilitator | All agents |
| `project_memory.md` | All agents | All agents |
| `current_sprint.md` | Standup/Dev | All agents |

## Research & Competitive Analysis

All agents should:
1. **Research competitors** - What are Unity, Godot, Construct, GDevelop doing?
2. **Identify trends** - What's new in game dev tools?
3. **Learn from others** - What works? What doesn't?
4. **Adapt features** - If it makes sense, add it
5. **Innovate** - Find ways to be better

### Known Competitors

| Platform | Strengths | Weaknesses | Our Advantage |
|----------|-----------|------------|---------------|
| Unity | Powerful, huge ecosystem | Complex, requires install | Simpler, web-based, AI-first |
| Godot | Open source, lightweight | Less polished, smaller ecosystem | More AI, better UX |
| Construct | Easy for non-coders | Limited depth | AI enables both easy AND deep |
| GDevelop | Visual, beginner-friendly | Limited capabilities | AI + full code access |
| PlayCanvas | Web-based | Not AI-first | We ARE AI-first |

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
| Multi-agent team | PM + Dev + Game Dev + UI/UX + Standup | 2026-04-07 |
| qwen3.6-plus:free for UI/UX | Visual focus, cost-effective | 2026-04-07 |

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
│   ├── ai/          # Memory, all agent feedback
│   └── qa/          # Known issues
└── scripts/         # Agent prompts, utilities
```

---

See also:
- [PM Feedback](pm_feedback.md) - CEO direction
- [Game Dev Feedback](game_dev_feedback.md) - User feedback
- [UI/UX Feedback](uiux_feedback.md) - Visual design feedback
- [Standup Notes](standup_notes.md) - Team alignment
- [Current Sprint](../tasks/current_sprint.md)
- [Known Issues](../qa/known_issues.md)
