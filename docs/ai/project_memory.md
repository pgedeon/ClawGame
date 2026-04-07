# ClawGame Project Memory

## Project Overview
- **Status:** Milestone 3 Complete - 2D Runtime + Preview
- **Current Stage:** Core functionality working, improving quality and UX
- **Next Phase:** AI integration with real services, scene editor
- **Timeline:** v0.3.x with bug fixes and engine improvements

## Key Documents
- **README.md:** Comprehensive vision and roadmap documentation
- **uiux_feedback.md:** Detailed UI/UX analysis and recommendations  
- **game_dev_feedback.md:** Real user testing feedback
- **CHANGELOG.md:** Version history and development tracking
- **current_sprint.md:** Sprint progress and task tracking

## Architecture Decisions
- **Monorepo Structure:** apps/web (React) and apps/api (FastAPI) working
- **Multi-Agent Development:** 4-agent team working (Dev, PM/CEO, Game Dev, Standup)
- **Technology Stack:** React + Vite frontend, FastAPI backend, Canvas 2D engine
- **Design System:** Modern UI with theme.css variables

## Current Implementation Status
- ✅ **M0 Foundation:** Repo structure, basic components, routing
- ✅ **M1 Editor Shell:** Dashboard, navigation, project CRUD
- ✅ **M2 Code + AI:** File tree, CodeMirror editor, AI command interface (mock)
- ✅ **M3 Runtime + Preview:** 2D engine with keyboard input, entity rendering, game loop
- 🚧 **M4 Scene Editor:** Next priority for visual scene building
- 📋 **M5 Asset Pipeline:** ComfyUI integration for AI assets
- 📋 **M6 Git + OpenClaw:** Native version control and agent ops

## UI/UX Foundation
- **Design System:** theme.css with dark/light mode support
- **Components:** File tree, Code editor, Game preview, AI command panel
- **Navigation:** AppLayout sidebar with project context
- **Layout:** Modern sidebar + main content area with panels

## Engine Capabilities
- ✅ **2D Runtime:** Canvas-based rendering with delta time
- ✅ **Keyboard Input:** Arrow keys + WASD with preventDefault
- ✅ **Entity System:** Components (Transform, Sprite, Movement, AI, Collision)
- ✅ **Rendering System:** Shadows, borders, grid, FPS counter
- ✅ **Movement System:** Player-controlled with diagonal normalization
- ✅ **AI System:** Basic patrol patterns for enemies

## Competitive Analysis
- **Unity:** Professional dark theme, organized inspector panels
- **Construct 3:** Visual event system, intuitive drag-and-drop
- **GDevelop:** Scene-based workflow, visual scripting
- **PlayCanvas:** Real-time collaboration features
- **Godot:** Developer-friendly extensibility

## AI Integration Status
- ✅ **Interface:** AICommandPage with natural language input
- ⚠️ **Backend:** Mock implementation - needs real AI service integration
- 📋 **Roadmap:** Real code generation, visual scripting, asset generation
- 📋 **Features:** Progress tracking, AI suggestions, contextual help

## Development Priorities
1. **High Priority:** Fix CodeEditor useEffect content dependency issue
2. **High Priority:** Wire debug panel to actual engine functionality
3. **High Priority:** Update outdated documentation
4. **Medium Priority:** Responsive canvas design
5. **Medium Priority:** AI backend service integration
6. **Low Priority:** Advanced AI features and collaboration tools

## Agent Communication System
- **Game Dev → Feedback:** game_dev_feedback.md (crucial for usability)
- **PM → Quality:** pm_feedback.md (code quality, documentation debt)
- **UI/UX → Design:** uiux_feedback.md (visual improvements, AI-first patterns)
- **Agent Messages:** agent_messages.md for direct communication
- **Team Standup:** Standup template exists, needs activation

## Recent Key Fixes
1. **CRITICAL:** Keyboard input not working (fixed with preventDefault)
2. **CRITICAL:** File content not visible (fixed CodeMirror deps)
3. **CRITICAL:** Player movement not responding (fixed MovementSystem)
4. **QUALITY:** RenderSystem FPS/scene info overlap (fixed HUD rendering)
5. **QUALITY:** Engine missing destroy() method (added proper cleanup)

## Known Gaps
- Documentation severely outdated (memory and roadmap files)
- AI service not connected (only mock responses)
- File tree needs file watcher for auto-refresh
- Debug panel checkboxes now functional but need more features
- Bundle size warning (766KB > 500KB threshold)

## Current Version: v0.3.2
**Codename:** bug-fixes  
**Status:** Core functionality working, quality improvements in progress

## Next Milestone: M4 Scene Editor
- Visual 2D scene editing with component inspector
- Real-time entity manipulation
- Scene save/load functionality
- Enhanced debug panel for editing

## Last Updated: 2026-04-07
*This memory file reflects the actual current state of ClawGame after significant development and bug fixes.*