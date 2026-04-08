# ClawGame Project Memory

## Project Overview
ClawGame is an AI-first web-based game development platform that provides a complete create→build→export workflow for 2D games. The platform features visual editing, code editing, AI-powered assistance, and real-time preview capabilities.

## Architecture
- **Monorepo structure** using pnpm workspaces
- **Frontend**: React + TypeScript + Vite (apps/web)
- **Backend**: Fastify + TypeScript (apps/api) 
- **Engine**: Custom game engine (packages/engine)
- **Shared utilities**: TypeScript utilities (packages/shared)
- **Navigation**: React Router with nested route structure

## Key Components
- **Dashboard**: Project management and overview
- **Editor**: Code workspace with file explorer
- **Scene Editor**: Visual level design canvas
- **AI Command**: AI-powered coding assistance
- **Asset Studio**: Asset management and generation
- **Game Preview**: Real-time game testing

## Project Status

### Milestone 6 - COMPLETE ✅ (v0.9.0 - "operational-excellence")
- **Phase 1**: Documentation & Backend Quality
- **Phase 2**: Real AI Asset Generation  
- **Phase 3**: Scene Editor ↔ Asset Integration
- **Phase 4**: Export & Packaging

### Milestone 7 - CURRENT (v0.9.1 - "git-hygiene")
**Goal**: Operational excellence, unified design system, bug fixes, and architectural cleanup.

**Phase 1 Status**: ✅ NEAR COMPLETE
- ✅ Update project_memory.md to v0.9.0 
- ✅ Add unified design system CSS variables
- ✅ Fix export options UI "Coming Soon" 
- ✅ Add .env.example file
- ✅ Add TypeScript typecheck to CI
- ✅ Improve responsive design baseline

**Phase 2 - Next Priority**:
- 🔄 Fix click interaction timeouts (HIGH PRIORITY)
- 🔄 Fix navigation inconsistency
- 🔄 Improve error handling
- 🔄 Add interactive tutorial/onboarding
- 🔄 Add default game template

## Known Issues

### Critical (Blockers)
1. **Click interaction timeouts** - Play button, New File button, and navigation elements don't respond reliably
2. **Navigation inconsistency** - URL updates and page transitions don't work correctly
3. **Invalid dates on dashboard** - All projects show "Invalid Date" instead of creation dates

### Medium Priority  
4. **No project_memory.md** - Now created (this file)
5. **Mobile responsiveness** - Basic but functional
6. **Dark mode consistency** - Implemented but could be enhanced

### Low Priority
7. **AI integration depth** - AI feels separate from workflow, not seamlessly integrated
8. **Test coverage** - Currently minimal, needs expansion

## Recent Changes

### Route Architecture Refactor (v0.9.1)
- Nested routes implemented using React Router `<Outlet />` pattern
- Routes organized under `ProjectPage` component for better layout nesting
- Reduced Suspense duplication and clearer route hierarchy
- Sets up proper workspace layout for project views

### Design System Enhancements
- Unified CSS variables for spacing, typography, colors
- Consistent color palette with purple/indigo primary colors
- Enhanced responsive design (768px breakpoint)
- Improved mobile layout for dashboard and export pages

## Development Workflow
1. **Development**: `pnpm dev` (runs web + API)
2. **Build**: `pnpm build` (builds all packages)
3. **Test**: `pnpm test` (runs tests + typecheck)
4. **TypeCheck**: `pnpm run -r typecheck` or individual package typecheck
5. **Linting**: `pnpm lint` (ESLint across all packages)

## Environment Setup
- `.env.example` provided with OpenRouter API key configuration
- Ports: Web (5173), API (3000)
- Data directories: `/root/.clawgame/data`
- CORS enabled for local development

## Performance Notes
- Fast startup times for development
- Efficient code-splitting with React.lazy for heavy components
- TypeScript compilation works correctly
- Build process optimized for production

## Future Considerations
- **Visual scripting interface** for non-coders
- **Template gallery** for project starting points  
- **Real-time collaboration** features
- **Asset market integration**
- **Progressive learning system** based on user behavior

---

*Last Updated: 2026-04-08*
*Version: 0.9.1*