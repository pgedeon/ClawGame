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

**7. `any` pollution: 73 `as any` casts remaining (was 112)**
- Reduced from 112 → 73 across Phases 2.1-2.3. Remaining are mostly Phaser framework typing gaps and AI service fallbacks.

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

**15. Only 42 test files for 53K lines** — API expanded from 3→42 tests. Web expanded from 151→223 tests. Total 399 tests (was 151).

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

### Phase 1: Type System Unification ✅ DONE
*Eliminate the silent drift risk between duplicated type definitions.*

- [x] 1.1 Make `packages/shared` the single source for shared types
- [x] 1.2 Deprecate engine's local types — Import from shared, re-export for backward compat
- [x] 1.3 Delete `apps/web/src/api/types.ts` duplications — Import from shared
- [x] 1.4 Add lint rule to prevent new type duplications

### Phase 2: `any` Reduction & Type Safety
*Target: cut `any` usage by 60%+ in the most critical paths.*

- [x] 2.1 Type critical hooks: useGamePreview.ts, sessionTypes.ts, PreviewCanvas.tsx, PropertyInspector.tsx
- [x] 2.2 Remove redundant `as any` in scene-compiler.ts (11 casts), exportService.ts (15+ types)
- [x] 2.3 Remove redundant `as any` in PhaserSceneEditor.ts (7 collision + 2 entity casts)
- [ ] 2.4 Break `PreviewRuntimeSessionOptions` into smaller composed interfaces
- [ ] 2.5 Add `strict: true` to tsconfigs incrementally

### Phase 3: Split the Mega-Files ✅ DONE

- [x] 3.1 Split `packages/shared/src/index.ts` → `types.ts`, `math.ts`, `assets.ts`, `templates.ts`, `utils.ts`, `legacy.ts`
- [x] 3.2 Split `realAIService.ts` → `ai-provider.ts`, `ai-context.ts`, `ai-service.ts`, `ai-streaming.ts`
- [x] 3.3 Split `exportService.ts` → `export-compiler.ts`, `export-storage.ts`, `export-service.ts`

### Phase 4: Stub Handler Implementation ✅ DONE
*Decide: ship working features or remove the dead buttons.*

- [x] 4.1 Audit each stub in `useGamePreview.ts`
- [x] 4.2 Wire RPG stubs (crafting, spells, hotkeys, dialogue) or remove UI buttons
- [x] 4.3 Wire replay stubs or remove replay controls
- [x] 4.4 Replace mock `aiService.ts` — Delete or mark dev-only with feature flag
- [x] 4.5 Add feature flags for incomplete features

### Phase 5: CSS Consolidation

- [ ] 5.1 Audit CSS files — Identify which are actually used
- [ ] 5.2 Merge small CSS files into component domains
- [ ] 5.3 Establish CSS Modules convention for future components

### Phase 6: Test Coverage Expansion
*Target: meaningful tests for the most fragile paths.*

- [x] 6.1 API tests — fileService (13), projectValidation (14), export-extended (12). Total: 42 API tests (was 3)
- [x] 6.2 Web runtime tests — replay-system (30), combat-log (21), spellcrafting (22). Total: 223 web tests (was 151)
- [x] 6.3 Scene compiler tests — 90 edge case tests (empty scenes, missing fields, collisions, duplicates, NaN transforms, large entities, physics mismatches, output format)
- [ ] 6.4 Type safety tests — Verify exported types don't break consumers

### Phase 7: Runtime Strategy Decision

- [x] 7.1 Decision: Deprecate legacy canvas — Phaser 4 is the only runtime (legacy was redundant, had fewer genres, zero feature value)
- [x] 7.2 Removed `legacyCanvasSession.ts` + `legacyCanvasRuntime.ts` (535 lines deleted)
- [x] 7.3 Simplified runtime selection — single Phaser 4 path, no fallback logic needed
- [x] 7.4 Added 16 Playwright E2E tests (dashboard, project CRUD, TD game preview, Phaser canvas, start game flow)

### Phase 8: Developer Experience ⏳ PARTIAL

- [x] 8.1 Replace 57 console.* calls with appropriate logger
- [x] 8.2 Add Husky + lint-staged pre-commit hooks
- [x] 8.3 Add `concurrently` to root dev script
- [x] 8.4 Update README after Phase 0 changes

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
| 7: Runtime Strategy | High | Done | None |
| 8: DevEx | Low | Low | None |
