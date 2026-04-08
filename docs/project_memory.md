# ClawGame Project Memory

## Project Overview
ClawGame is an AI-first web-based game development platform that allows users to create, edit, preview, and export 2D games entirely in the browser. Built with React, TypeScript, and custom game engine.

**Current Version:** v0.9.1 (operational-excellence)
**Milestone 7:** Git + OpenClaw Operations

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Fastify + TypeScript
- **Game Engine**: Custom Canvas-based 2D engine
- **AI Integration**: OpenRouter API (Qwen model)
- **Build System**: pnpm + monorepo packages
- **Storage:** File system-based (JSON project files)

### Package Structure
```
/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── engine/       # Game engine core
└── docs/
```

## Current Features

### Core Workflows
1. **Project Creation**: Genre selection, art style, description
2. **Scene Editor**: Visual entity placement with properties panel
3. **Code Editor**: TypeScript game scripts with syntax highlighting
4. **AI Command**: AI-powered code generation and explanations
5. **Asset Studio**: AI-generated game assets
6. **Game Preview**: Real-time game testing
7. **Export**: Standalone HTML export

### Key Components
- **AppLayout**: Global layout with sidebar navigation
- **Dashboard**: Project overview with quick actions
- **ProjectPage**: Nested project workspace with tabs
- **SceneEditor**: Canvas-based visual editor with entity management
- **FileWorkspace**: Code editor with file management
- **AICommand**: Chat-based AI assistant

## Known Issues

### Critical (Blocks Core Functionality)
1. **Click Interaction Timeouts** - Some clickable elements (Play button, navigation) don't respond reliably
   - Location: Play button in ProjectPage, navigation elements
   - Status: Investigating

2. **Scene Editor Keyboard Shortcuts** - `v` and `m` keys fire even in input fields
   - Location: SceneEditorPage.tsx useEffect 
   - Status: Fixed - added input field checks

### High Priority
3. **Missing Default Templates** - Projects created empty with no starting content
   - Location: CreateProjectPage.tsx
   - Status: TODO

### Medium Priority  
4. **Inconsistent Navigation** - Some URL updates not working consistently
   - Location: Various navigation components
   - Status: Investigating

### Low Priority
5. **Limited Mobile Responsiveness** - Basic mobile layout
6. **Error Handling** - Unclear error messages for failed operations

## Recent Milestones

### M6 v0.9.0 - Export & Packaging ✅
- Complete create→build→export loop
- Standalone HTML export functionality
- Asset integration pipeline

### M7 v0.9.1 - Git + Operations 🚧 In Progress
- [x] Project memory documentation (just completed)
- [x] Unified design system CSS variables
- [x] Export options UI improvements ("Coming Soon" badges)
- [x] TypeScript typecheck in CI
- [x] Responsive design improvements
- [ ] Click interaction timeouts fix
- [ ] Navigation consistency fixes
- [ ] Interactive tutorial/onboarding
- [ ] Default game templates

## Code Quality & Process

### Testing
- TypeScript compiler: ✅ Works
- Build system: ✅ Working
- CI Integration: ✅ Typecheck runs in test command
- Test Coverage: ~30% (needs expansion)

### Git Hygiene
- Commit-after-work discipline: ⚠️ Needs enforcement (PM feedback)
- Version tracking: ✅ VERSION.json maintained
- CHANGELOG: ✅ Updated with releases

### Documentation
- Project memory: ✅ Just created
- Sprint tracking: ✅ current_sprint.md
- API docs: Limited
- Component documentation: Missing

## Development Notes

### Project Service (Backend)
- Uses file system storage (`data/projects/`)
- Auto-fixes missing dates using file mtime
- Caching layer for performance
- Full CRUD operations

### File System Structure
```
project/
├── clawgame.project.json  # Project metadata
├── scenes/               # Level data
├── scripts/              # TypeScript game code  
├── assets/               # Generated/imported assets
└── docs/                 # Project documentation
```

### AI Integration
- Uses Qwen3.6-Plus model via OpenRouter
- Support for code generation, explanations, refactoring
- Asset generation with style controls
- Context-aware command processing

### Performance Considerations
- Lazy-loaded pages for code splitting
- Canvas-based rendering for game preview
- Asset caching to prevent redundant generation
- Entity pooling in game engine

## Technical Debt

### Architecture
- Component consistency needs design system audit
- API response types could be more consistent
- Error handling is scattered across components

### Code Quality  
- Some components are too large (SceneEditorPage)
- TypeScript generics could be more consistent
- CSS styling needs unification

### Testing
- Mock API endpoints for testing
- Integration tests for game loop
- E2E tests for user flows

## Future Improvements

### Phase 1 (Current M7)
- [ ] Fix click interaction timeouts
- [ ] Improve navigation consistency
- [ ] Add default game templates
- [ ] Create interactive tutorial

### Phase 2 (M8)
- [ ] Expand test coverage to >50%
- [ ] Visual scripting interface
- [ ] Template gallery
- [ ] Real-time collaboration

### Phase 3 (M9+)  
- [ ] Asset market integration
- [ ] Advanced AI features
- [ ] Mobile app
- [ ] 3D support

## Key Learnings

1. **File System Storage**: Simple and effective for MVP, needs database for scale
2. **Canvas Performance**: 60fps achievable with optimized render loops
3. **AI Integration**: Context is key - users need clear examples of what AI can do
4. **Component Architecture**: Large components work but need careful refactoring
5. **User Onboarding**: Clear starting points essential for new users

## Last Updated
2026-04-08 - Project memory created for v0.9.1 milestone