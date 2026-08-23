# Export/Preview Parity Probe (Roadmap P0 item 5)

**Date:** 2026-08-23 · **Branch:** `feat/export-parity-probe` · **Scope:** measurement only — no `exportService` refactor.
**Method:** code-path reading with file/line evidence + static smoke test (`apps/api/src/test/export-parity.test.ts`) that diffs `compileSceneToPhaser` output against `buildPhaserPreviewBootstrap` for each shipped template.

## The two pipelines being compared

**Game Preview:** `main-scene.json` → `normalizePreviewScene` (infers runtime `type` per entity from components — `apps/web/src/utils/previewScene.ts:158-194,206`) → `buildPhaserPreviewBootstrap` (`packages/phaser-runtime/src/buildPreviewBootstrap.ts:161`) → `ClawgamePhaserScene` / genre subclass (`apps/web/src/runtime/phaserPreviewSession.ts:96-113`).

**Export (phaser-html):** `main-scene.json` → `prepareExportEntities` (shared `normalizePreviewScene` + shape-type preservation, `apps/api/src/services/exportService.ts`) → `compileSceneToPhaser` string generator → inline HTML with CDN Phaser 4.

A third runtime exists (`format:'html'`, default in ExportPage — `apps/web/src/pages/ExportPage.tsx:74,386`): the hand-written canvas engine in `export-templates.ts`. It is also fed raw type-less JSON and degrades the same way (`export-templates.ts:199` `e.type || 'unknown'`), so per-entity behavior branches (enemy AI at `:309`, collectible rotation at `:342`) never fire for shipped templates. It is out of the matrix below but shares the root cause.

**Root structural gap:** preview normalizes + infers entity types before rendering; the legacy export generators did not. Shipped templates intentionally store entities **without** a `type` field (`apps/web/src/templates/templateScenes.ts:11-13`). Narrowed on `feat/export-convergence-1`: phaser-html now runs the shared `normalizePreviewScene` (implementation moved to `packages/engine/src/preview-scene.ts`; web module re-exports it); the canvas `format:'html'` generator still does not.

## Parity matrix — all three shipped templates

Template genres after creation: platformer → `'action'`, topdown → `'action'`, dialogue → `'adventure'` (`apps/web/src/pages/CreateProjectPage.tsx:25,124,216`). None match a genre scene class (`tower-defense|rpg|shooter|puzzle`, `phaserPreviewSession.ts:96-113`), so **all three previews run the base `ClawgamePhaserScene`**: static render + physics bodies, no input handlers, no update-loop gameplay.

| Dimension | Game Preview (base scene) | Export phaser-html today | Gap |
|---|---|---|---|
| Entity typing | Types inferred (`playerInput`→player, `ai`→enemy, `npc`→npc, collision-type fallbacks; `previewScene.ts:158-194`) | Same inference via shared `normalizePreviewScene` (`prepareExportEntities`); editor shape types (`text\|zone\|circle\|rectangle`) preserved verbatim for their render branches | Closed — both sides infer identically |
| Entity representation | Color-only entities → typed-color rectangles via `getColorForType` (`ClawgamePhaserScene.ts:147-157`); asset entities → image + `setDisplaySize` (`:153-155`) | Every entity → `this.add.sprite(x,y,key)` with `key = sprite.assetRef ?? sprite.assetId \|\| sanitizedName` (`exportService.ts`); templates have no assetRef → texture key is the entity name | All-template |
| Transform | rotation/scale always applied, origin 0.5 (`ClawgamePhaserScene.ts:160-162`) | rotation/scale applied only when non-default (`exportService.ts:223-225`); equivalent for templates | — |
| Physics bodies | Per-body kind from collision flags/type/entity type: solid→static, trigger/sensor→sensor, player/enemy/projectile→dynamic, else none (`buildPreviewBootstrap.ts:33-58`); body sized via `setSize` (`ClawgamePhaserScene.ts:167`), dynamic→`setCollideWorldBounds` (`:168`), sensor→immovable+no-gravity (`:169`) | Same resolution (`resolveExportBody`): flags override → collision.type → normalized entity type; emits `add.existing` + `setSize`, dynamic→`setCollideWorldBounds`, sensor→immovable+no-gravity, else no body | — |
| Physics config | Arcade gravity passthrough from scene.physics (`ClawgamePhaserRuntime.ts:47-48`); world bounds from bootstrap.bounds, default 1280×720 (`buildPreviewBootstrap.ts:12`, `ClawgamePhaserScene.ts:116`); debug flag passthrough (`ClawgamePhaserRuntime.ts:47`) | `resolveExportWorld` reads the same scene fields (`scene.bounds`, `scene.physics`) with the same defaults: game size + `physics.world.setBounds(x,y,w,h)` from bounds (default 1280×720), arcade `gravity`/`debug` passthrough into config (`exportService.ts`) | Closed — both sides derive world identically |
| Asset loading | Keys `asset:${assetRef}` (`buildPreviewBootstrap.ts:61-62`); reads `sprite.assetRef`; URL resolution incl. data:/absolute/baseURL (`:65-79`); image/spritesheet/atlas kinds via frameData/atlasMeta (`:102-135`); load-error fallback gray texture (`ClawgamePhaserScene.ts:52-57,127-129,182`) | Reads **`sprite.assetRef`** with legacy `sprite.assetId` read fallback (`exportService.ts:189-190,226`); `exportToPhaserHTML` embeds project assets and passes them to the compiler (`:152-159`) so preload emits `this.load.image(ref, dataUriConst)` for embedded data URIs (`:196-201`); non-embedded fallback path `assets/${id}.png` still doesn't exist standalone; images only, no spritesheet/atlas | Narrowed to key naming only: preview keys `asset:${ref}`, export keys raw `${ref}`; spritesheet/atlas kinds still preview-only |
| Camera | Camera bounds/scroll/zoom honored from bootstrap.camera (`ClawgamePhaserScene.ts:100-109`); Scale.FIT + keyboard/mouse/touch enabled (`ClawgamePhaserRuntime.ts:54-58`) | No camera code at all in generated scene; fixed canvas, no scale manager config (`exportService.ts:248-262`) | Templates ship no camera metadata → low practical impact today, divergent machinery |
| Input bindings | None registered by base scene (keyboard enabled but unused) — same for all three templates | None registered | Equivalent (both gameplay-less); GENRE_CONTROLS advertises controls that neither path implements for these genres (`useGamePreview.ts:29-44`) |
| Genre gameplay | None for action/adventure genres (genre scenes exist only for td/rpg/shooter/puzzle) | None (no update() emitted; scene is preload+create only, `exportService.ts:180-231`) | Equivalent emptiness; legacy html export *does* ship generic gameplay (movement/enemies/victory, `export-templates.ts:280-390`) → the two export formats disagree with each other too |

## Per-template body-level diff (what the smoke test pins)

Computed by the test from real data paths (preview side normalized exactly like production):

| Template | Entities | Preview bodies (kind≠none) | Export bodies | Export-only dynamic bodies |
|---|---|---|---|---|
| platformer | 12 | 8 (player+enemy dynamic, 6 solids static) | 8 (same kinds) | — |
| topdown | 14 | 12 (player+4 enemies dynamic, 7 walls static) | 12 (same kinds) | — |
| dialogue | 8 | 1 (player dynamic) | 1 (player dynamic) | — |

Entity sets and asset-key sets currently match (templates are asset-free); the asset-path divergence is pinned by a synthetic `sprite.assetRef` probe: both pipelines now load the referenced art (preview key `asset:hero.png`, export key `hero.png` backed by an embedded data URI); a second probe pins the legacy `sprite.assetId` read fallback.

## Gap summary (ranked)

1. ~~**No normalization on export path**~~ **CLOSED 2026-08-23 (`feat/export-convergence-1`)** — phaser-html feeds project JSON through the shared `normalizePreviewScene` (`prepareExportEntities`); inferred runtime types drive per-type branches while shape primitives keep theirs. Canvas `format:'html'` still unnormalized (see gap 5).
2. ~~**Asset field mismatch `assetId` vs `assetRef`** + assets arg never passed~~ **CLOSED 2026-08-23 (`feat/export-convergence-1`)** — export reads `sprite.assetRef` (legacy `assetId` fallback), embeds and passes project assets, loads data URIs in preload. Remaining sliver: texture-key naming (`asset:` prefix) and spritesheet/atlas kinds.
3. ~~**Body semantics divergence**~~ **CLOSED 2026-08-23 (`feat/export-convergence-2`)** — `resolveExportBody` mirrors `buildBodyConfig`: boolean flags override → collision.type → normalized entity type; solid→static, trigger/sensor→sensor+immovable+no-gravity, player/enemy/projectile→dynamic+world-bounds, everything else→no body; all bodies sized via `setSize`.
4. ~~**Physics/world config divergence**~~ **CLOSED 2026-08-24 (`feat/export-convergence-3`)** — `resolveExportWorld` reads `scene.bounds` + `scene.physics` exactly like `buildPhaserPreviewBootstrap`/`buildPhaserGameConfig`: game dimensions and emitted `physics.world.setBounds(...)` from bounds (default 1280×720), arcade gravity/debug passthrough. Legacy `metadata.width/height` no longer consulted.
5. **Two export formats disagree** (phaser-html: no gameplay; html: generic canvas gameplay) — neither matches preview.
6. Camera/input machinery present only on preview side (latent, unexercised by shipped templates).

## Regression guard

`apps/api/src/test/export-parity.test.ts` runs `compileSceneToPhaser` against `buildPhaserPreviewBootstrap(normalizePreviewScene(template))` for all three templates and asserts the exact divergence baseline above (entity sets equal, asset keys equal, body-count deltas pinned). The export side is fed through `prepareExportEntities` — the same production prep `exportToPhaserHTML` uses — with dedicated probes for asset loading (gap 2), inferred typing (gap 1), shape-type preservation, and physics/world config passthrough incl. defaults (gap 4). New divergences fail the test; when a gap is deliberately closed, update the pinned baseline in the same commit.
