# ClawGame Roadmap

**Current Status:** Post-M10 — Codebase Improvement Phase 🚧
**Goal:** Clean up technical debt, unify types, improve test coverage, then resume feature work.
**Started:** 2026-06-18

---

## Completed Milestones

### M0-M5: Foundation → AI-Native UX ✅
- Monorepo scaffold, React + Vite frontend, Fastify backend
- Project CRUD, file API, CodeMirror editor
- 2D game engine, scene editor, live preview
- Command palette, floating AI assistant, error boundaries, onboarding
- OpenRouter AI integration, asset studio UI

### M6: Backend Quality ✅
- Pino logger migration, Vitest setup, build fixes

### M6.5: RPG Engine Systems ✅
- Save/load, dialogue, quests, inventory, spell crafting, RPG HUD
- Zustand state store, GamePreviewPage integration

### M7: Git Integration ✅
- Git Center UI (init, status, diff, commit, revert)

### M8: Feature Expansion ✅
- AI UI overhaul (markdown, diff, confidence)
- GamePreviewPage decomposition (1058→203 lines)
- Critical bug fixes, recovery sprint

### M9-M10: Asset Factory ✅
- Sprite analyzer, sheet slicer, pixel pipeline, tileset forge, batch utilities
- Full API + UI integration

---

## Current Phase: Codebase Improvement (2026-06-18)

See `IMPROVEMENT-PLAN.md` for detailed phases.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Ground truth cleanup (versions, backups, docs) | ✅ Done |
| 1 | Type system unification | ⏳ Next |
| 2 | `any` reduction & type safety | Pending |
| 3 | Split mega-files | Pending |
| 4 | Stub handler resolution | Pending |
| 5 | CSS consolidation | Pending |
| 6 | Test coverage expansion | Pending |
| 7 | Runtime strategy decision | Pending |
| 8 | Developer experience | Pending |

---

## Future Feature Milestones

### Next Feature Work (after improvement phases)

| Task | Priority | Notes |
|------|----------|-------|
| Real AI asset generation (ComfyUI) | High | Flagship differentiator |
| Scene editor ↔ Asset pipeline | High | Two powerful features in isolation |
| Export/packaging pipeline | Medium | Let users ship games |
| Visual scripting foundation | Medium | Node-based event system |
| Playwright browser testing | Medium | Automated smoke tests |
| Auto-commit on save | Low | Git workflow automation |

---

## Known Technical Debt

1. **Duplicated types** — `packages/shared` and `packages/engine` define same components differently
2. **192 `any` usages** — 112 `as any` casts across 70 files
3. **Mock AI service** — `aiService.ts` is placeholder; `realAIService.ts` falls back to mock
4. **14 stub handlers** — RPG crafting/spells/dialogue/replay exposed in UI but not wired
5. **Legacy canvas runtime** — Feature-complete but deprecated; Phaser 4 runtime incomplete
6. **17K lines CSS** — 40+ globally-scoped files

---

See also:
- [Improvement Plan](../../IMPROVEMENT-PLAN.md)
- [Current Sprint](../tasks/current_sprint.md)
- [Backlog](../tasks/backlog.md)
- [Known Issues](../qa/known_issues.md)

**Last Updated:** 2026-06-18
