# ClawGame Project Memory

## Project Overview
ClawGame is an AI-first web-based game development platform that allows users to create, edit, preview, and export 2D games entirely in the browser. Built with React, TypeScript, and custom game engine.

**Current Version:** v0.9.5 (template-system)
**Milestone 7:** Git + OpenClaw Operations - Phase 2 Complete

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Fastify + TypeScript
- **Game Engine**: Custom Canvas-based 2D engine
- **AI Integration**: OpenRouter API (Qwen model)
- **Build System:** pnpm + monorepo packages
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
1. **Project Creation**: Genre selection, art style, description, template choice
2. **Scene Editor**: Visual entity placement with properties panel
3. **Code Editor**: TypeScript game scripts with syntax highlighting
4. **AI Command**: AI-powered code generation and explanations
5. **Asset Studio**: AI-generated game assets
6. **Game Preview**: Real-time game testing (60fps stable)
7. **Export**: Standalone HTML export

### Key Components
- **AppLayout**: Global layout with sidebar navigation
- **Dashboard**: Project overview with quick actions
- **ProjectPage**: Nested project workspace with tabs
- **SceneEditor**: Canvas-based visual editor with entity management
- **FileWorkspace**: Code editor with file management
- **AICommand**: Chat-based AI assistant
- **WelcomeModal**: Post-creation onboarding guidance
- **TemplateSystem**: Three production-ready game templates

## Known Issues

### Critical (Blocks Core Functionality)
1. **Click Interaction Timeouts** - FIXED in v0.9.5
   - Location: GamePreviewPage infinite re-render bug
   - Status: ✅ Resolved - Game loop now stable with no performance issues

### High Priority
2. **Scene Editor Keyboard Shortcuts** - FIXED in v0.9.2
   - Location: SceneEditorPage.tsx useEffect 
   - Status: ✅ Resolved - Added input field checks

3. **Invalid Date Bug** - FIXED in v0.9.3
   - Location: Dashboard project display
   - Status: ✅ Resolved - Auto-migration for old projects

### Medium Priority  
4. **Limited Mobile Responsiveness** - IMPROVED in v0.9.4
   - Location: All major components
   - Status: ✅ Comprehensive mobile layout with bottom navigation

5. **Missing Default Templates** - FIXED in v0.9.5
   - Location: CreateProjectPage.tsx
   - Status: ✅ Resolved - 3 templates: Platformer, Top-Down, Dialogue

## Recent Milestones

### M6 v0.9.0 - Export & Packaging ✅
- Complete create→build→export loop
- Standalone HTML export functionality
- Asset integration pipeline

### M7 v0.9.5 - Git + Operations ✅ Phase 2 Complete
- [x] Project memory documentation
- [x] Unified design system CSS variables
- [x] Export options UI improvements ("Coming Soon" badges)
- [x] TypeScript typecheck in CI
- [x] Responsive design improvements
- [x] Click interaction timeouts fixed
- [x] Navigation consistency fixed
- [x] Interactive onboarding (WelcomeModal)
- [x] Default game templates (3 templates)
- [x] Contextual AI assistant
- [x] Mobile-first responsive design

## Code Quality & Process

### Testing
- TypeScript compiler: ✅ Works (v5.9.3)
- Build system: ✅ Working
- CI Integration: ✅ Typecheck runs in test command
- Test Coverage: ~30% (needs expansion - Phase 3 task)

### Git Hygiene
- Commit-after-work discipline: ✅ Improved (PM feedback addressed)
- Version tracking: ✅ VERSION.json maintained
- CHANGELOG: ✅ Updated with releases
- Documentation sync: 📋 Needs automation (Phase 3 task)

### Documentation
- Project memory: ✅ Updated to v0.9.5
- Sprint tracking: ✅ current_sprint.md
- API docs: Limited
- Component documentation: Missing
- Documentation sync process: 📋 To be created in Phase 3

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
- Inline contextual AI assistant (v0.9.4)

### Performance Considerations
- Lazy-loaded pages for code splitting
- Canvas-based rendering for game preview
- Asset caching to prevent redundant generation
- Entity pooling in game engine
- GamePreviewPage optimized: Ref-based stats (v0.9.5)

### Design System (v0.9.1+)
- Unified CSS variables for spacing (xs to 3xl)
- Typography scale with line heights
- Consistent color scheme
- Dark mode support
- Mobile breakpoints at 768px and 480px

## Technical Debt

### Architecture
- Component consistency needs design system audit (Phase 3)
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

### Phase 3 (Current M7)
- [ ] Expand test coverage to >50%
- [ ] Document documentation sync process
- [ ] Component consistency audit for design system compliance
- [ ] Add pre-commit hook for git hygiene

### Phase 2 (M8 - Feature Expansion)
- [ ] Visual scripting interface
- [ ] Template gallery
- [ ] Real-time collaboration
- [ ] Advanced AI features

### Phase 3 (M9+)  
- [ ] Asset market integration
- [ ] Mobile app
- [ ] 3D support

## Key Learnings

1. **File System Storage**: Simple and effective for MVP, needs database for scale
2. **Canvas Performance**: 60fps achievable with optimized render loops
3. **AI Integration**: Context is key - users need clear examples of what AI can do
4. **Component Architecture**: Large components work but need careful refactoring
5. **User Onboarding**: Clear starting points essential for new users
6. **Template System**: Templates significantly improve onboarding and first-time UX
7. **Game Loop Stability**: Proper state management (useRef) prevents re-render loops
8. **Mobile First**: Comprehensive mobile layout extends reach and usability

## Release Notes

### v0.9.5 (2026-04-08) - Template System & Bug Fixes
- Template system with 3 production-ready game templates
- WelcomeModal for post-creation onboarding
- Fixed GamePreviewPage infinite re-render bug
- OnboardingTour version sync

### v0.9.4 (2026-04-08) - AI Contextual Integration & Mobile Experience
- Contextual AI Assistant with quick actions
- Comprehensive mobile responsive design
- Enhanced EditorPage with AI-ready status
- Improved build feedback and error handling

### v0.9.3 (2026-04-08) - Project Migration Fixes
- Fixed "Invalid Date" bug in dashboard
- Auto-migration for legacy project files
- Improved project data validation

### v0.9.2 (2026-04-08) - Critical Interaction Fixes
- Fixed scene editor keyboard shortcuts
- Fixed navigation inconsistency
- Improved error handling

### v0.9.1 (2026-04-08) - Operational Excellence
- Unified design system CSS variables
- .env.example file
- TypeScript typecheck in CI
- Responsive design baseline

### v0.9.0 (2026-04-08) - Export & Packaging
- Complete export pipeline
- Standalone HTML export
- Asset embedding

## Last Updated
2026-04-08 - Updated to v0.9.5, Phase 2 complete
