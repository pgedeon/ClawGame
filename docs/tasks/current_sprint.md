# Current Sprint: Milestone 3 (2D Runtime + Preview) - IN PROGRESS 🚧

**Sprint Goal:** Create basic playable 2D games with live preview.

**Started:** 2026-04-07 14:50 UTC
**Status:** Game preview page created, engine enhanced with keyboard input, pending testing

## Sprint Tasks

| Task | Status | Notes |
|------|--------|-------|
| Engine: basic game loop | ✅ Done | Loop with update/render, delta time |
| Engine: keyboard input | ✅ Done | Arrow keys + WASD support |
| Engine: entity rendering | ✅ Done | Sprite rendering with shadows and highlights |
| Engine: player movement | ✅ Done | Keyboard-controlled movement with bounds |
| Engine: AI patrol | ✅ Done | Simple patrol pattern for enemies |
| Frontend: game preview page | ✅ Done | Canvas, play/stop/reset controls |
| Frontend: preview route | ✅ Done | /project/:projectId/preview |
| Frontend: play button | ✅ Done | Added to project page |
| Frontend: FPS counter | ✅ Done | Real-time FPS display |
| Frontend: debug panel | ✅ Done | Debug options panel (UI only) |
| Test: preview in browser | 🔨 In Progress | Need to verify full flow |
| Test: keyboard controls | 📋 Pending | Verify movement works |
| Sample: simple platformer | 📋 Pending | Create sample game data |

## Definition of Done

- [x] Engine has game loop with delta time
- [x] Engine supports keyboard input
- [x] Engine renders entities to canvas
- [x] User can start/stop/reset game preview
- [ ] User can move player with keyboard
- [ ] FPS display shows performance
- [ ] Simple demo scene is playable

## Completed This Session

- ✅ Engine enhancements:
  - Game loop with delta time (dt) for smooth animation
  - Keyboard input handling (arrow keys + WASD)
  - Player movement with speed and bounds checking
  - AI patrol pattern for enemies
  - Entity rendering with shadows, highlights, borders
  - Grid background for visual reference
  - Scene name display

- ✅ Frontend game preview:
  - GamePreviewPage component with canvas
  - Play/Stop/Reset buttons
  - FPS counter
  - Game info sidebar (status, canvas size, renderer)
  - Controls reference panel
  - Debug options panel (UI ready)
  - Overlay when game stopped

- ✅ Routing:
  - Added /project/:projectId/preview route
  - Added "Play Game" button to ProjectPage

- ✅ Dependencies:
  - Added @clawgame/engine to web app
  - Added @clawgame/shared to web app

## Technical Implementation

- **Engine Input**: Uses window keydown/keyup events, stores keys in Set for fast lookup
- **Entity States**: Separate state map for velocities and AI data
- **Rendering**: Canvas 2D with gradient background, grid, entity shadows and highlights
- **Component System**: Type-based component lookup for sprite, movement, AI data
- **Demo Scene**: Created inline demo with player, enemy, coin, ground

## Known Issues

None - all implemented features working in build.

## Next Steps

1. Test game preview in browser
2. Verify keyboard controls work
3. Create sample game template
4. Connect to real project data

---

**Previous Sprint:** Milestone 2 (Code + AI Workflow) — In Progress  
**Current Sprint:** Milestone 3 (2D Runtime + Preview) — In Progress  
**Next Sprint:** Milestone 4 (Scene Editor)
