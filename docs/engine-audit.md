# Engine Integrity Audit — `packages/engine/src/systems` + `packages/phaser-runtime/src`

**Date:** 2026-08-23 · **Branch:** `audit/engine-integrity` (from `origin/main` @ `68ff872`)
**Scope:** every `.ts` file in `packages/engine/src/systems/`, `packages/phaser-runtime/src/`, plus `packages/engine/src/behavior/` if present.
**Method:** read-only. Import graph grepped across the whole monorepo (`apps/web`, `apps/api`, `packages/*`, tests included, `dist/` and `node_modules` excluded). Runtime reachability traced from production entry points (`GamePreviewPage.tsx`, `SceneEditorPage.tsx`, API routes).
**Worktree note:** analysis reflects the working tree at branch point, which carries pre-existing uncommitted local changes to `useGamePreview.ts`, `phaserPreviewSession.ts`, `TowerDefenseScene.ts`, `previewTowerDefense.ts` (additive TD wave/speed/level-select features). None of them change the wiring verdicts below.

## Verdict definitions

- **WIRED** — reachable from a production entry point (constructed/invoked at runtime in `apps/web` or `apps/api`).
- **DEAD** — no production call sites; referenced only by tests or by other dead code.
- **PARTIAL** — imported/constructed but never invoked, or only a subset of the unit is used.

Key global fact used throughout: **`new Engine(` has zero occurrences in the entire monorepo** (apps *and* packages, tests included). The `Engine` class in `packages/engine/src/Engine.ts` is never instantiated anywhere. Everything wired into `Engine.gameLoop` is therefore transitively unreachable from any running product.

---

## 1. `packages/engine/src/systems/`

| File | Verdict | Imported by (production) | Constructed / invoked at runtime | Tests |
|---|---|---|---|---|
| `AISystem.ts` (69 L) | **DEAD** (transitive) | `Engine.ts:13`, barrel `index.ts:16` | Constructed + `update()` called inside `Engine.gameLoop` — but `Engine` itself is never instantiated anywhere | none |
| `AnimationSystem.ts` (94 L) | **DEAD** (transitive) | `Engine.ts:16`, barrel | Same as above (`gameLoop`) | `AnimationSystem.test.ts` (dedicated, passing) |
| `CollisionSystem.ts` (66 L) | **DEAD** (transitive) | `Engine.ts:15`, barrel | Same as above (`gameLoop`) | none dedicated |
| `DamageSystem.ts` (61 L) | **PARTIAL → effectively DEAD** | `Engine.ts:18`, barrel | Constructed + `attach(eventBus)` in ctor; **`damageSystem.update()` is never called in `Engine.gameLoop`** (Engine.ts:207–218 calls 8 systems, not this one). Damage events queue in `pendingDamage` and are never drained — health would never decrease even if `Engine` ran | `systems.test.ts` `describe('DamageSystem')` tests it in isolation — passes while integration is broken |
| `EnhancedRenderSystem.ts` (215 L) | **DEAD** | none (not exported from barrel) | never | only `integration-sprite-sheet.test.ts` |
| `InputSystem.ts` (119 L) | **DEAD** (transitive) | `Engine.ts:10`, barrel | `gameLoop` via never-instantiated `Engine`; also `bind()`ed in `setCanvas` | `systems.test.ts` `describe('InputSystem')` |
| `MovementSystem.ts` (85 L) | **DEAD** (transitive) | `Engine.ts:11`, barrel | `gameLoop` | `systems.test.ts` |
| `PhysicsSystem.ts` (168 L) | **DEAD** (transitive) | `Engine.ts:12`, barrel | `gameLoop` | `systems.test.ts` |
| `ProjectileSystem.ts` (116 L) | **DEAD** (transitive) | `Engine.ts:14`, barrel | `gameLoop`; emits `projectile:hit` that only the never-ticked DamageSystem consumes | none dedicated (web's `preview-projectile-scene.test.ts` tests web-side logic, not this class) |
| `RenderSystem.ts` (121 L) | **DEAD** (transitive) | `Engine.ts:17`, barrel | `gameLoop` | `systems.test.ts` has `describe.skip('RenderSystem')` → effectively untested |
| `SpriteSheetSystem.ts` (220 L) | **DEAD** | only `EnhancedRenderSystem.ts` (itself dead) | never | `sprite-sheet.test.ts` (standalone, passing) |
| `index.ts` (barrel, 10 L) | **WIRED** (as part of package barrel) | re-exported via `packages/engine/src/index.ts` | Web imports from `@clawgame/engine` heavily — but exclusively types/data modules (`Entity`, `Scene`, `SerializableEntity`, `compileScene`, `history`, `prefabs`, `tilemap`, `animations`, `asset-pack`). **No app file imports any `*System` class or `Engine`.** | n/a |

**Net:** of 12 files, 0 are runtime-wired. The whole directory is test-supported dead weight *unless* the P0 plan wires `Engine` back in.

### Already deleted (TASK.md stale on these)
`EngineReplaySystem.ts`, `GameLoopCoordinator.ts`, `PreviewHUD.ts`, `AnimationStateMachineSystem.ts`, `TowerDefensePlugin.ts`, and the entire `behavior/` directory **no longer exist** on `main`. `apps/web/src/engine-stubs/GameLoopCoordinator.ts` and `engine-stubs/PreviewHUD.ts` are local web stubs documenting the removal. TASK.md Phase-1 deletion list is ~80% done.

---

## 2. `packages/phaser-runtime/src/`

Live preview pipeline (verified end-to-end):

```
GamePreviewPage.tsx
 └─ useGamePreview(projectId, projectScene ← useSceneLoader = normalized scenes/main-scene.json)
     └─ runPreviewRuntimeSession('phaser4', …)                      apps/web/src/runtime/runPreviewRuntimeSession.ts
         └─ preparePhaserPreviewSession()                           apps/web/src/runtime/phaserPreviewSession.ts
             └─ buildPhaserPreviewBootstrap(sceneData)              packages/phaser-runtime/src/buildPreviewBootstrap.ts
         └─ runPhaserPreviewSession(host, bootstrap, genre)
             └─ new ClawgamePhaserRuntime().mount(host, bootstrap)  packages/phaser-runtime/src/ClawgamePhaserRuntime.ts
                 └─ genre scene: TowerDefenseScene | RPGScene | CosmicDriftScene | NeonLabyrinthScene
                    (all extend ClawgamePhaserScene)                packages/phaser-runtime/src/ClawgamePhaserScene.ts
                 └─ Phaser.Game runs preload/create/update with per-genre gameplay logic living in apps/web
```

| File | Verdict | Evidence |
|---|---|---|
| `ClawgamePhaserRuntime.ts` | **WIRED** (one dead method) | Instantiated + `mount()`ed per preview session (path above). `PHASER4_RUNTIME_DESCRIPTOR` exported here is **duplicated** — `useGamePreview` imports a second copy from `apps/web/src/runtime/previewRuntimeConfig.ts:15`. `loadAssetPack()` (~70 L) has **zero callers** anywhere; `createPreviewBootstrap()` also uncalled externally (`preparePhaserPreviewSession` calls `buildPhaserPreviewBootstrap` directly). Tests: `ClawgamePhaserRuntime.test.ts` (config determinism + renderer fallback). |
| `ClawgamePhaserScene.ts` | **WIRED** | Base class of all four live genre scenes (`TowerDefenseScene.ts:2`, `RPGScene.ts:7`, `CosmicDriftScene.ts:7`, `NeonLabyrinthScene.ts:7`). Its `preload()`/`create()` execute under Phaser every preview session; `update()` intentionally empty (subclasses override). Error-reporter path tested in `ClawgamePhaserScene.test.ts`. |
| `buildPreviewBootstrap.ts` | **WIRED** | Called by `preparePhaserPreviewSession` for every Play-button session; converts canonical scene JSON → bootstrap (entities, bodies solid/trigger/dynamic, assets incl. atlas/spritesheet frame data, camera, physics gravity). Best-tested file: `buildPreviewBootstrap.test.ts` (8 cases). |
| `index.ts` | **WIRED** | All web imports go through it via relative path `../../../../packages/phaser-runtime/src` (6 files). Note: web does **not** use the npm workspace name `@clawgame/phaser-runtime` for imports (package.json dep not even declared in `apps/web`). |
| `types.ts` | **WIRED** | `PhaserPreviewBootstrap`/`PhaserRuntimeError` types imported across `apps/web/src/runtime/*` and `hooks/useGamePreview.ts`. |

---

## 3. Decisive question: can scene-compiler output drive the phaser-runtime preview today?

**NO.**

What `compileScene()` produces: a TypeScript **source string** (`export class XScene extends Phaser.Scene {…}`) from the runtime-ECS `Scene` shape (entities `Map`, components `Map`).

Where it goes today — a modal and nothing else:

```
SceneEditorPage.tsx:715  "Compile" button
  → compileScene(scene, { className, language: 'typescript' })
  → setCompiledCode(code) → setShowCompiledCode(true)   // displayed to user, never executed
```

The live preview instead consumes **raw canonical scene JSON** through `buildPhaserPreviewBootstrap` (path in §2) and gets gameplay from hardcoded genre scene classes. Three exact missing links:

1. **No executor.** Nothing transpiles/bundles/evaluates the compiled string. There is no code path from `compileScene` output to a running Phaser game, in preview or anywhere else.
2. **Shape mismatch.** `compileScene(scene)` expects engine runtime `Scene` (`entities: Map<string, Entity>`, components as `Map`); the preview holds `SerializableScene` JSON. A converter exists (`toRuntimeEntity` in `packages/engine/src/types.ts`, already used by `sceneEditorScene.ts`) but nothing bridges compiler → preview.
3. **Export uses a second, divergent generator.** `apps/api/src/services/exportService.ts:178 compileSceneToPhaser()` hand-rolls its own preload/create emission (different asset handling, different entity-type coverage, different color handling) instead of calling engine `compileScene`. So even the export path ignores the engine compiler.

Consequence for the P0 thesis ("editor and export identical"): there are currently **three independent renderers/logic paths** — editor canvas (`SceneEditorRuntime` → `PhaserSceneEditor`, its own `Phaser.Game`), live preview (`ClawgamePhaserRuntime` + genre scenes with hardcoded gameplay), export (API's inline codegen). Compiled output drives none of them. Additionally, genre gameplay (TD waves, RPG quests, shooter, puzzle) exists only in `apps/web` scene subclasses/utils — the compiler emits static `create()` content with an empty `update()`, so executing compiled output today still would not reproduce preview behavior.

---

## 4. Recommended deletion list vs wiring list (ordered by risk)

### Deletions (lowest risk first)
1. **`systems/EnhancedRenderSystem.ts`** — zero production refs, not barrel-exported, sole consumer is a test. Delete with `integration-sprite-sheet.test.ts`.
2. **`systems/SpriteSheetSystem.ts`** — only consumer is #1 (+ own test). Delete with `sprite-sheet.test.ts`. (Re-add from git history if sprite-sheet tooling returns.)
3. **`systems/DamageSystem.ts`** — constructed but never ticked; broken-by-design inside `Engine` (queue never drains). Web TD implements its own damage. Delete with its `describe` block in `systems.test.ts`, **or** wire `damageSystem.update(scene, dt)` into `Engine.gameLoop` — pick one; current state is worst of both.
4. **`ClawgamePhaserRuntime.loadAssetPack()`** — zero callers. Delete until asset packs actually flow through preview.
5. **Duplicate descriptor** — drop either `previewRuntimeConfig.ts` PHASER4_RUNTIME_DESCRIPTOR (web copy) or the package export; keep one.
6. **DEFER: the `Engine` core eight** (`AISystem`, `AnimationSystem`, `CollisionSystem`, `InputSystem`, `MovementSystem`, `PhysicsSystem`, `ProjectileSystem`, `RenderSystem`) + `Engine.ts` + `SceneLoader.ts`. All transitively dead, but they are the only existing candidate for the P0 "one pipeline" goal. Decide direction first (see below); deleting then rebuilding would be waste. If P0 lands on the bootstrap+genre-scene architecture instead, delete the whole set in one batch (~1,100 L + `EventBus` if then unreferenced).

### Wiring (highest value first)
1. **Single compiler:** make `exportService.compileSceneToPhaser` delegate to engine `compileScene` (or vice-versa). One generator, two consumers. Lowest-effort parity win.
2. **Bridge shapes:** route preview input through `toRuntimeEntity` so preview and compiler consume identical scene state (they already share the same source JSON — formalize it).
3. **Decide the runtime contract, then wire ONE path:** either (a) preview executes compiled scene classes (needs a bundler/eval step + gameplay systems pushed down into `packages/engine`), or (b) preview stays bootstrap-driven and compilation becomes an export-only projection of the same bootstrap. Directive P0 wording favors (a); current architecture is (b) minus the single-source discipline.
4. **If `Engine` core is kept:** add `damageSystem.update(this.scene, deltaTime)` to `Engine.gameLoop`, write the missing `CollisionSystem`/`ProjectileSystem`/`AISystem` tests, unskip `RenderSystem` tests, and give `Engine` its first production instantiation site (e.g. headless tick harness for the roadmap's template integration tests).
5. **`SceneLoader.ts`:** its header claims to be "the single canonical path… used by Scene editor, Game preview, Export" — false on all three counts. Either wire it as that canonical path or correct the docstring before it misleads the next auditor.

### Test coverage summary
- Covered: `buildPreviewBootstrap` (8), `ClawgamePhaserScene` errors (2 suites), `ClawgamePhaserRuntime` config (2), `MovementSystem`, `PhysicsSystem`, `DamageSystem` (isolated), `InputSystem`, `AnimationSystem`, `SpriteSheetSystem`, `SceneLoader` (unit-level).
- Gaps: `AISystem`, `CollisionSystem`, `ProjectileSystem`, `EnhancedRenderSystem` (integration-only), `RenderSystem` (skipped), `Engine.gameLoop` (nothing constructs `Engine`), `loadAssetPack`.

*Audit is read-only; no source files were modified. Findings feed roadmap item "Delete dead systems identified by TASK.md + audit".*
