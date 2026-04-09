# Current Sprint: M9 — AI Creator Workspace

**Status:** M9 In Progress  
**Started:** 2026-04-09  
**Sprint:** M9 AI Creator Workspace → [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md)

---

## M9 Exit Criteria

| Criterion | Status |
|-----------|--------|
| AI accessible without leaving editor, scene, asset, or preview flows | ✅ AIFAB in AppLayout (all pages) |
| Prompts can target files, entities, scenes, or asset groups | ✅ Context injection (page, scene, entities) |
| Notes and prompt recipes are saved per project | ✅ ProjectNotesPanel + PromptRecipeLibrary |
| AI can open a preview target and reason about current game context | ✅ Page context passed to AI commands |
| Model profiles and BYO provider configuration | ✅ AISettingsPage with health check |

### M9 Deliverables — Progress

| Deliverable | Status | Commits |
|-------------|--------|---------|
| Ambient AI side panel (AIFAB) | ✅ Already existed, enhanced with context | e6af36b, 97896fd |
| Project Notes Panel | ✅ New — goals, constraints, TODOs, custom sections | 25e7e37 |
| AI context injection (page, scene, entities) | ✅ Extended API types + AIFAB integration | 97896fd |
| AI Settings page (model status, provider config) | ✅ New — connection health, config guide | 03a775b |
| Prompt Recipe Library | ✅ Already existed — 10 recipes across 5 categories | pre-existing |

### Commits This Sprint

1. `25e7e37` — feat(M9): ProjectNotesPanel — per-project notes, goals, TODOs
2. `97896fd` — feat(M9): AI context injection — pass page context and scene info to AIFAB
3. `03a775b` — feat(M9): AI Settings page — model status, provider config, connection health

---

## Recovery Sprint — CLOSED ✅

**Closed:** 2026-04-09  
All exit criteria met. See git history for details.

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-09
