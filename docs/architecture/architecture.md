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
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┴───────────────────────────────────┐
│                      Backend (API)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Files     │ │    Git      │ │  AI Router  │            │
│  └─────────────┘ └─────────────┘ └──────┬──────┘            │
│                                         │                    │
│  ┌─────────────┐ ┌─────────────┐ ┌──────┴──────┐            │
│  │  Projects   │ │   Assets    │ │ComfyUI Conn │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Major Subsystems

### 1. Frontend Editor App (`apps/web`)

React-based web application providing:
- Project dashboard
- Scene editor (2D)
- Code workspace
- Asset studio
- AI command center
- Live preview integration

### 2. Backend API (`apps/api`)

Node.js/Express server handling:
- Project CRUD
- File operations
- Git operations
- AI request routing
- ComfyUI communication
- Task/metadata storage

### 3. Engine (`packages/engine`)

2D browser runtime:
- Scene management
- Entity/component model
- Input handling
- Collision/physics basics
- Animation
- Audio
- Save/load

### 4. AI Orchestrator (`packages/ai-orchestrator`)

AI request handling:
- Provider routing (OpenAI, Anthropic, OpenRouter)
- Context assembly
- Prompt construction
- Response parsing
- Tool invocation

### 5. Asset Pipeline (`packages/asset-pipeline`)

ComfyUI integration:
- Workflow templates
- Generation requests
- Metadata tracking
- Asset import

### 6. Editor Core (`packages/editor-core`)

Shared editor state:
- Project model
- Selection state
- Undo/redo
- Action dispatch

## Data Flow

1. **User Intent** → AI Command Center
2. **AI** → Analyzes project context → Proposes plan
3. **User** → Reviews/approves plan
4. **AI** → Executes changes via tools
5. **Backend** → Writes files, updates Git
6. **Frontend** → Refreshes view
7. **User** → Playtests immediately

## Key Files

| File | Purpose |
|------|---------|
| `clawgame.project.json` | Machine-readable project metadata |
| `docs/ai/project_memory.md` | AI continuity memory |
| `docs/tasks/current_sprint.md` | Current work items |
| `docs/architecture/*.md` | Integration docs |

---

See also:
- [Engine Notes](engine_notes.md)
- [AI Integration](ai_integration.md)
- [ComfyUI Integration](comfyui_integration.md)
- [OpenClaw Integration](openclaw_integration.md)
