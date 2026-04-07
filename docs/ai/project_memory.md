# Project Memory

> AI continuity file for ClawGame. Updated as work progresses.

## Current Status

- **Phase:** Milestone 1 (Core Editor Shell) → **70% Complete**
- **Started:** 2026-04-07
- **Next:** Complete API endpoints and project metadata display

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
| Sidebar-first navigation | Clean project management structure | 2026-04-07 |

## Architecture

```
clawgame/
├── apps/
│   ├── web/         # React editor (port 5173)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── AppLayout.tsx        # Sidebar navigation layout
│   │   │   ├── pages/                   # Route components
│   │   │   ├── constants/
│   │   │   │   └── sidebar.ts          # Navigation items, quick actions
│   │   │   └── App.tsx                  # Main router
│   └── api/         # Fastify backend (port 3000)
├── packages/
│   ├── engine/      # 2D runtime (Canvas-based)
│   ├── shared/      # Types, utilities
│   └── ...          # Other packages (scaffolds)
└── docs/               # Project docs
```

## Milestone 1 Progress

### ✅ Completed
- Full routing structure with React Router
- AppLayout sidebar navigation with branding and menu items
- DashboardPage with quick actions (New, Open, Examples projects)
- CreateProjectPage comprehensive form with:
  - Project name
  - Project type (2D platformer, top-down, puzzle, RPG)
  - Genre selection
  - Art style selection (pixel, vector, low-poly, hand-drawn)
  - Optional description
- OpenProjectPage with project listing and status indicators
- ExamplesPage with template selection
- Placeholder pages for Editor, AI Command, Asset Studio, Settings
- Complete CSS styling system with CSS variables
- Form validation and state management
- Mock data for demonstration

### 🔄 Next Steps
- Add API endpoints for project CRUD operations
- Store project metadata in clawgame.project.json files
- Display project metadata on dashboard when projects exist

## Technical Implementation Notes

- Used React Router v6 with proper TypeScript types
- CSS-first design with CSS variables for theming
- Mock projects data for UI demonstration
- Form state management with useState hooks
- Responsive grid layouts for actions and templates
- Semantic HTML5 structure

## API Integration Points

Next phase requires:
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects  
- `GET /api/projects/:id` - Get specific project details
- `PUT /api/projects/:id` - Update project metadata
- File system storage of clawgame.project.json files

## Build Verification

```
pnpm build → ✅ All packages compile
pnpm dev:web → ✅ localhost:5173
pnpm dev:api → ✅ localhost:3000
```

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
