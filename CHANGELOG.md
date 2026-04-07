# Changelog

All notable changes to ClawGame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-04-07

### Added
- Complete API client module with TypeScript types (`src/api/client.ts`)
- Frontend-backend integration replacing all mock data with real API calls
- Dynamic project-specific sidebar navigation (shows AI/Editor/Asset items when project open)
- Full CRUD functionality: create, list, get, update, delete projects
- AI Command interface with chat-like UI and quick prompts
- Asset Studio interface with browser, previews, and metadata
- Complete CSS theme system with variables (light mode ready)
- Error handling and loading states throughout the entire UI
- Responsive design for all new components

### Fixed
- TypeScript compilation errors (API workspace resolution, missing imports)
- Missing CSS variables for proper styling
- API cannot find `@clawgame/shared` dependency
- Incorrect `useNavigate` vs `useLocation` usage in AppLayout

### Changed
- Updated AppLayout to show current project name in sidebar header
- All project creation forms now submit to real API instead of mock data
- Dashboard displays real projects fetched from backend
- Project pages show real project metadata from API responses

### Technical Details
- **API Integration:** Frontend now connects to Fastify backend on port 3000
- **Data Storage:** Projects stored as `clawgame.project.json` in `/data/projects/{id}/`
- **Dynamic Routing:** Sidebar changes when projects are open
- **Error Handling:** Comprehensive error states for API failures
- **Testing:** Verified all API endpoints work correctly with curl tests

## [0.1.1] - 2026-04-07

### Added
- TypeScript configs for all packages (apps/web, apps/api, packages/shared, packages/engine)
- `@clawgame/engine` runtime skeleton: Engine class with Canvas game loop, scene management, entity rendering
- Engine dependency on `@clawgame/shared`
- PM/CEO agent feedback system (`docs/ai/pm_feedback.md`)
- Updated dev agent prompt with PM feedback integration

### Fixed
- Cleaned up duplicate entries in `.gitignore`

### Verified
- `pnpm install` resolves 192 packages successfully
- `pnpm build` passes all 4 buildable packages
- `pnpm dev:web` starts Vite dev server on localhost:5173
- `pnpm dev:api` starts Fastify on localhost:3000

## [0.1.0] - 2026-04-07

### Added
- Initial project scaffold (monorepo structure)
- `apps/web` - React + Vite frontend shell
- `apps/api` - Fastify backend shell
- `packages/engine` - 2D runtime engine (scaffold)
- `packages/editor-core` - Editor logic (scaffold)
- `packages/ai-orchestrator` - AI provider routing (scaffold)
- `packages/asset-pipeline` - ComfyUI integration (scaffold)
- `packages/project-sdk` - Project manipulation API (scaffold)
- `packages/ui` - Shared UI components (scaffold)
- `packages/shared` - Shared types and utilities with Entity, Scene, Transform types
- Project metadata schema (`clawgame.project.json`)
- Documentation structure:
  - Product vision and roadmap
  - Architecture documentation
  - Task/sprint tracking
  - AI project memory
  - QA known issues tracking
- Comprehensive `.gitignore` for security
- TypeScript base configuration
- pnpm workspace configuration

### Technical Details
- Runtime target: Browser (Canvas/WebGL)
- Language: TypeScript
- Build: pnpm monorepo
- AI Integration: OpenRouter (default), OpenAI, Anthropic
- Asset Generation: ComfyUI