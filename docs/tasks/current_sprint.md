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
| Event graph / visual logic editor | 📋 TODO | UI for creating/editing behavior graphs |
| Navigation/waypoint tooling | 📋 TODO | |
| Genre kits (platformer, top-down, RPG, tactics) | ✅ Done | 13 templates across 4 kits, 35 tests |
| AI-assisted graph generation | 📋 TODO | "make this enemy patrol, alert, chase, retreat" |
| Animation state machines | 📋 TODO | |
| Cutscene/dialogue sequencing tools | 📋 TODO | |

### This Run (2026-04-10)
- **Fixed onboarding overlay reappearing on navigation** — Root cause: both OnboardingTour and ProjectOnboarding used useEffect to read localStorage, causing a render cycle where the component showed before reading the dismissed flag. Fixed by initializing state synchronously via useState(() => ...) initializer. Also added "Don't show again" button to OnboardingTour and wrapped localStorage access in try/catch for robustness.
- **Updated VERSION.json** — M11/in-progress → M13/in-progress, v0.19.0
- **Fixed CHANGELOG duplicate headers** — Consolidated 3x "### Added" in Unreleased section

### Quality Gates

| Gate | Status |
|------|--------|
| `pnpm build` | ✅ Pass |
| `pnpm test` | ✅ Pass (297 tests: 125 engine + 93 api + 79 web) |
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
**Last Updated:** 2026-04-10
