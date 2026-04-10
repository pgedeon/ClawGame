# Current Sprint: M13 Gameplay Authoring Layer

**Status:** 🟡 In Progress  
**Started:** 2026-04-10  
**Previous:** M12 Unified Runtime ✅ Complete

---

## Context

M12 shipped all 6 deliverables with 172 tests. The unified runtime is the architectural foundation. M13 builds the authoring layer on top.

**Strategic priority:** Make ClawGame feel like an AI-native game authoring platform, not a raw engine. Visual logic, behavior graphs, genre kits.

---

## M13 Progress

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Behavior graph data model + executor | ✅ Done | BehaviorGraph types, BehaviorExecutor with composites/decorators/conditions/actions, custom extensions, 20 tests |
| Behavior graphs for enemies and NPCs | ✅ Done | BehaviorPresets: patrol, chase, alertChaseFlee, guard — configurable, tested, 16 tests |
| Event graph / visual logic editor | ✅ **DONE** | Full visual editor with drag-and-drop nodes, canvas rendering, zoom/pan, edge creation, save/load functionality |
| Navigation/waypoint tooling | 📋 TODO | |
| Genre kits (platformer, top-down, RPG, tactics) | ✅ Done | 13 templates across 4 kits, 35 tests |
| AI-assisted graph generation | ✅ **DONE** | Natural language to behavior graph generation: "make this enemy patrol, alert, chase, retreat" with 41 tests |
| Animation state machines | 📋 TODO | |
| Cutscene/dialogue sequencing tools | 📋 TODO | |

### This Run (2026-04-10)
- **Fixed TypeScript errors in NavigationPage** — Fixed Toast API usage errors by replacing `toast.success()` calls with correct `toast.showToast({ type: 'success', message: '...' })` calls in NavigationPage.tsx (lines 277 and 308)
- **Verified navigation tests are passing** — All 21 navigation tests pass, confirming NavigationSystem implementation is working correctly
- **Quality gates: ✅ build, ✅ test (359 total), ✅ typecheck, ✅ lint**

### Quality Gates

| Gate | Status |
|------|--------|
| `pnpm build` | ✅ Pass |
| `pnpm test` | ✅ Pass (359 tests: 187 engine + 93 api + 79 web) |
| `pnpm typecheck` | ✅ Pass |
| `pnpm lint` | ✅ Pass |

---

## Completed Sprints

| Sprint | Status | Date |
|--------|--------|------|
| M12 Unified Runtime | ✅ Complete | 2026-04-10 |
| M11 Generative Media Forge | ✅ Complete (partial) | 2026-04-09 |
| M10 Asset Factory Core | ✅ Complete | 2026-04-09 |
| M9 AI Creator Workspace | ✅ Complete | 2026-04-09 |
| Recovery Sprint | ✅ Complete | 2026-04-09 |

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-10 07:49 UTC