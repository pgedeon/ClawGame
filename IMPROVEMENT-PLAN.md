# ClawGame Improvement Plan

**Created:** 2026-06-18
**Status:** Active

---

## Findings by Severity

### 🔴 Critical

**1. Version mismatch everywhere**
- `VERSION.json` says `0.20.4`, root `package.json` says `0.18.0`, sub-packages all say `0.0.1`. Makes version tracking meaningless.

**2. Duplicated type systems**
- `packages/shared/src/types.ts` and `packages/engine/src/types.ts` both define `Transform`, `Collision`, `Sprite`, `Movement`, `Animation`, `AI` components — with *different shapes*. They'll silently drift.
- `packages/shared/src/index.ts` defines `AssetType` enum and `AssetMetadata` interface. `apps/web/src/api/types.ts` redefines `AssetType` as a union type and a separate `AssetMetadata`. Two source of truth for the same concept.

**3. Architecture docs reference non-existent packages**
- `docs/architecture/architecture.md` lists `packages/ai-orchestrator`, `packages/asset-pipeline`, `packages/editor-core` — none of these exist.

**4. AI service is mostly fake**
- `aiService.ts` (235 lines) is 100% hardcoded mock responses. `realAIService.ts` (1,381 lines) is wired but falls back to mock on any failure.

**5. 14 unimplemented handlers in useGamePreview.ts**
- Crafting, spell learning, hotkey assignment, dialogue, replay seek/step/download are all stubs. Exposed in UI, nothing happens when clicked.

### 🟡 Structural — Technical Debt

**6. ~1,900 lines of backup files in the repo**
- `GamePreviewPage-backup.tsx` (243), `GamePreviewPage-backup-before-notification.tsx` (245), `DevicePreviewFrame-backup.tsx` (164), `ReplayControls-before-tooltips.tsx` (185), `game-preview-before-buttons.css` (957).

**7. `any` pollution: 192 usages, 112 `as any` casts**
- 70 files use `any`. Worst offenders: `useGamePreview.ts`, `legacyCanvasSession.ts`, runtime files.

**8. `packages/shared/src/index.ts` is a 500+ line mega-file**
- Types, enums, utility functions, game templates, debug utilities, legacy compat maps, asset utils — all in one file.

**9. God interface: `PreviewRuntimeSessionOptions`**
- 30+ properties. Anything touching runtime needs this entire interface.

**10. Two parallel runtime systems with unclear ownership**
- `legacyCanvasSession.ts` (535 lines) does far more (RPG, tower defense, replay). `phaserPreviewSession.ts` (119 lines) is a stub by comparison.

**11. Compiled files checked into source**
- `apps/web/src/utils/previewTowerDefense.js`, `.d.ts`, `.d.ts.map` — build artifacts.

**12. 57 console.log/warn/error in source**
- Should use logger utility consistently.

### 🟢 Polish

**13. 17K lines of CSS across 40+ files** — All globally scoped, many single-purpose.

**14. Task tracking scattered and stale** — Multiple sprint files, all outdated.

**15. Only 36 test files for 53K lines** — API has 7 lines of tests. No integration tests.

**16. Missing `examples/` directory** — Referenced in workspace config but doesn't exist.

---

## Phased Improvement Plan

### Phase 0: Ground Truth Cleanup ✅ DONE
*Fix the foundation so everything else builds on correct information.*

- [x] 0.1 Unify versions — Single source of truth in `VERSION.json`
- [x] 0.2 Delete backup files — Remove all `*-backup*`, `*-before*` files and compiled artifacts
- [x] 0.3 Fix architecture docs — Update to reflect actual package structure
- [x] 0.4 Consolidate task tracking — Pick one file, mark roadmap accurately
- [x] 0.5 Create `examples/` placeholder

### Phase 1: Type System Unification ⏳ IN PROGRESS
*Eliminate the silent drift risk between duplicated type definitions.*

- [ ] 1.1 Make `packages/shared` the single source for shared types
- [ ] 1.2 Deprecate engine's local types — Import from shared, re-export for backward compat
- [ ] 1.3 Delete `apps/web/src/api/types.ts` duplications — Import from shared
- [ ] 1.4 Add lint rule to prevent new type duplications

### Phase 2: `any` Reduction & Type Safety
*Target: cut `any` usage by 60%+ in the most critical paths.*

- [ ] 2.1 Break `PreviewRuntimeSessionOptions` into smaller composed interfaces
- [ ] 2.2 Group `useGamePreview` return into typed objects
- [ ] 2.3 Replace `any` in `legacyCanvasSession.ts`
- [ ] 2.4 Add `strict: true` to tsconfigs incrementally

### Phase 3: Split the Mega-Files

- [ ] 3.1 Split `packages/shared/src/index.ts` → `types.ts`, `math.ts`, `assets.ts`, `templates.ts`, `utils.ts`, `legacy.ts`
- [ ] 3.2 Split `realAIService.ts` → `ai-provider.ts`, `ai-context.ts`, `ai-service.ts`, `ai-streaming.ts`
- [ ] 3.3 Split `exportService.ts` → `export-compiler.ts`, `export-storage.ts`, `export-service.ts`

### Phase 4: Stub Handler Implementation or Honest Removal
*Decide: ship working features or remove the dead buttons.*

- [ ] 4.1 Audit each stub in `useGamePreview.ts`
- [ ] 4.2 Wire RPG stubs (crafting, spells, hotkeys, dialogue) or remove UI buttons
- [ ] 4.3 Wire replay stubs or remove replay controls
- [ ] 4.4 Replace mock `aiService.ts` — Delete or mark dev-only with feature flag
- [ ] 4.5 Add feature flags for incomplete features

### Phase 5: CSS Consolidation

- [ ] 5.1 Audit CSS files — Identify which are actually used
- [ ] 5.2 Merge small CSS files into component domains
- [ ] 5.3 Establish CSS Modules convention for future components

### Phase 6: Test Coverage Expansion
*Target: meaningful tests for the most fragile paths.*

- [ ] 6.1 API integration tests — Project CRUD, file ops, AI flow, export
- [ ] 6.2 Runtime session tests — Dispatch, state transitions, RPG sync
- [ ] 6.3 Scene compiler tests — Edge cases, conflict detection
- [ ] 6.4 Type safety tests — Verify exported types don't break consumers

### Phase 7: Runtime Strategy Decision

- [ ] 7.1 Decide: Kill legacy / Equalize both / Deprecate legacy (recommended: C)
- [ ] 7.2 Extract game logic from `legacyCanvasSession.ts` into engine-level systems
- [ ] 7.3 Make both runtimes share extracted systems

### Phase 8: Developer Experience

- [ ] 8.1 Replace 57 console.* calls with appropriate logger
- [ ] 8.2 Add Husky + lint-staged pre-commit hooks
- [ ] 8.3 Add `concurrently` to root dev script
- [ ] 8.4 Update README after Phase 0 changes

---

## Priority Summary

| Phase | Impact | Effort | Risk |
|-------|--------|--------|------|
| 0: Ground Truth | High | Low | None |
| 1: Type Unification | High | Medium | Low |
| 2: `any` Reduction | Medium | Medium | Medium |
| 3: Split Mega-Files | Medium | Low | None |
| 4: Stub Resolution | High | Medium | Low |
| 5: CSS Consolidation | Low | Low | None |
| 6: Test Coverage | High | Medium-High | None |
| 7: Runtime Strategy | High | High | Medium |
| 8: DevEx | Low | Low | None |
