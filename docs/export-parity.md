# Export/Preview Parity Probe (Roadmap P0 item 5)

**Date:** 2026-08-23 · **Branch:** `feat/export-parity-probe` · **Scope:** measurement only — no `exportService` refactor.
**Status 2026-08-24:** phaser-html export ↔ preview parity is **complete** (`feat/export-convergence-1…4`). Zero open gaps remain for the phaser-html pipeline.
**Status 2026-08-26:** the legacy canvas `format:'html'` generator is **deleted** (`chore/remove-legacy-export`) — phaser-html is the only export format (retro-2 ruling #2); gap 5 below is resolved by deletion.
**Method:** code-path reading with file/line evidence + static smoke test (`apps/api/src/test/export-parity.test.ts`) that diffs `compileSceneToPhaser` output against `buildPhaserPreviewBootstrap` for each shipped template.

## The two pipelines being compared

**Game Preview:** `main-scene.json` → `normalizePreviewScene` (infers runtime `type` per entity from components — `apps/web/src/utils/previewScene.ts:158-194,206`) → `buildPhaserPreviewBootstrap` (`packages/phaser-runtime/src/buildPreviewBootstrap.ts:161`) → `ClawgamePhaserScene` / genre subclass (`apps/web/src/runtime/phaserPreviewSession.ts:96-113`).

**Export (phaser-html):** `main-scene.json` → `prepareExportEntities` (shared `normalizePreviewScene` + shape-type preservation, `apps/api/src/services/exportService.ts`) → `compileSceneToPhaser` string generator → inline HTML with CDN Phaser 4.

A third runtime existed until 2026-08-26 (`format:'html'`, formerly default in ExportPage): the hand-written canvas engine in `export-templates.ts`. It was fed raw type-less JSON and degraded the same way (`e.type || 'unknown'`), so per-entity behavior branches never fired for shipped templates. It shared the root cause below and was deleted rather than ported — see gap 5.

**Root structural gap:** preview normalizes + infers entity types before rendering; the legacy export generators did not. Shipped templates intentionally store entities **without** a `type` field (`apps/web/src/templates/templateScenes.ts:11-13`). Narrowed on `feat/export-convergence-1`: phaser-html now runs the shared `normalizePreviewScene` (implementation moved to `packages/engine/src/preview-scene.ts`; web module re-exports it); the canvas `format:'html'` generator never did and is since deleted (gap 5).

## Parity matrix — all three shipped templates

Template genres after creation: platformer → `'action'`, topdown → `'action'`, dialogue → `'adventure'` (`apps/web/src/pages/CreateProjectPage.tsx:25,124,216`). None match a genre scene class (`tower-defense|rpg|shooter|puzzle`, `phaserPreviewSession.ts:96-113`), so **all three previews run the base `ClawgamePhaserScene`**: static render + physics bodies, no input handlers, no update-loop gameplay.

| Dimension | Game Preview (base scene) | Export phaser-html today | Gap |
|---|---|---|---|
| Entity typing | Types inferred (`playerInput`→player, `ai`→enemy, `npc`→npc, collision-type fallbacks; `previewScene.ts:158-194`) | Same inference via shared `normalizePreviewScene` (`prepareExportEntities`); editor shape types (`text\|zone\|circle\|rectangle`) preserved verbatim for their render branches | Closed — both sides infer identically |
| Entity representation | Color-only entities → typed-color rectangles via `getColorForType` (`ClawgamePhaserScene.ts:147-157`); asset entities → image + `setDisplaySize` (`:153-155`) | Same split (`exportService.ts`): color-only runtime-typed entities → typed-color rectangles via `EXPORT_TYPE_COLORS` (mirror of `getColorForType`); asset entities → sprite + `setDisplaySize` with identical dimension precedence (`sprite.width ?? collision.width ?? transform.width ?? 32`, shared `getExportEntityDimensions`); editor shape types keep their dedicated render branches | Closed |
| Transform | rotation/scale always applied, origin 0.5 (`ClawgamePhaserScene.ts:160-162`) | rotation/scale applied only when non-default (`exportService.ts:223-225`); equivalent for templates | — |
| Physics bodies | Per-body kind from collision flags/type/entity type: solid→static, trigger/sensor→sensor, player/enemy/projectile→dynamic, else none (`buildPreviewBootstrap.ts:33-58`); body sized via `setSize` (`ClawgamePhaserScene.ts:167`), dynamic→`setCollideWorldBounds` (`:168`), sensor→immovable+no-gravity (`:169`) | Same resolution (`resolveExportBody`): flags override → collision.type → normalized entity type; emits `add.existing` + `setSize`, dynamic→`setCollideWorldBounds`, sensor→immovable+no-gravity, else no body | — |
| Physics config | Arcade gravity passthrough from scene.physics (`ClawgamePhaserRuntime.ts:47-48`); world bounds from bootstrap.bounds, default 1280×720 (`buildPreviewBootstrap.ts:12`, `ClawgamePhaserScene.ts:116`); debug flag passthrough (`ClawgamePhaserRuntime.ts:47`) | `resolveExportWorld` reads the same scene fields (`scene.bounds`, `scene.physics`) with the same defaults: game size + `physics.world.setBounds(x,y,w,h)` from bounds (default 1280×720), arcade `gravity`/`debug` passthrough into config (`exportService.ts`) | Closed — both sides derive world identically |
| Asset loading | Keys `asset:${assetRef}` (`buildPreviewBootstrap.ts:61-62`); reads `sprite.assetRef`; URL resolution incl. data:/absolute/baseURL (`:65-79`); image/spritesheet/atlas kinds via frameData/atlasMeta (`:102-135`); load-error fallback gray texture (`ClawgamePhaserScene.ts:52-57,127-129,182`) | Reads **`sprite.assetRef`** with legacy `sprite.assetId` read fallback; same key convention `asset:${ref}` via `exportTextureKey`; embedded data URIs preload per kind mirroring `buildAssetRecord` validation/precedence — `atlasMeta` (atlasUrl string + json\|xml) → `load.atlas`/`load.atlasXML`, valid `frameData` (frameWidth+frameHeight, optional endFrame) → `load.spritesheet` with inline frame config, else `load.image`; atlas documents resolve to embedded data URI consts when they match an embedded asset by url/id, data:/remote URLs pass through verbatim like the preview loader; non-embedded fallback path `assets/${id}.png` still doesn't exist standalone | Closed — both sides key and load identically |
| Camera | Camera bounds/scroll/zoom honored from bootstrap.camera (`ClawgamePhaserScene.ts:100-109`); Scale.FIT + keyboard/mouse/touch enabled (`ClawgamePhaserRuntime.ts:54-58`) | No camera code at all in generated scene; fixed canvas, no scale manager config (`exportService.ts:248-262`) | Templates ship no camera metadata → low practical impact today, divergent machinery |
| Input bindings | None registered by base scene (keyboard enabled but unused) — same for all three templates | None registered | Equivalent (both gameplay-less); GENRE_CONTROLS advertises controls that neither path implements for these genres (`useGamePreview.ts:29-44`) |
| Genre gameplay | None for action/adventure genres (genre scenes exist only for td/rpg/shooter/puzzle) | None (no update() emitted; scene is preload+create only, `exportService.ts:180-231`) | Equivalent emptiness; the former legacy html export shipped generic gameplay (`export-templates.ts:280-390`) → the two export formats disagreed with each other too. Resolved 2026-08-26: legacy format deleted, single phaser-html pipeline remains |

## Per-template body-level diff (what the smoke test pins)

Computed by the test from real data paths (preview side normalized exactly like production):

| Template | Entities | Preview bodies (kind≠none) | Export bodies | Export-only dynamic bodies |
|---|---|---|---|---|
| platformer | 12 | 8 (player+enemy dynamic, 6 solids static) | 8 (same kinds) | — |
| topdown | 14 | 12 (player+4 enemies dynamic, 7 walls static) | 12 (same kinds) | — |
| dialogue | 8 | 1 (player dynamic) | 1 (player dynamic) | — |

Entity sets and asset-key sets currently match (templates are asset-free); the asset path is pinned by a synthetic `sprite.assetRef` probe: both pipelines load the referenced art under the **unified key convention `asset:${ref}`** — preview's `buildAssetKey` prefix adopted on the export side too, since exported games are standalone single-file HTML where every texture is an embedded data URI registered under our chosen key (no collision risk, and editor/export stay interchangeable). Further probes pin spritesheet frame config (`load.spritesheet` + inline `{frameWidth, frameHeight[, endFrame]}`), atlas json/xml loader choice (`load.atlas`/`load.atlasXML`), embedded-atlas resolution by url/id, invalid-frameData image fallback, legacy `sprite.assetId` read fallback, and color-only rectangle representation.

## Gap summary (ranked)

1. ~~**No normalization on export path**~~ **CLOSED 2026-08-23 (`feat/export-convergence-1`)** — phaser-html feeds project JSON through the shared `normalizePreviewScene` (`prepareExportEntities`); inferred runtime types drive per-type branches while shape primitives keep theirs. Canvas `format:'html'` stayed unnormalized until its deletion (see gap 5).
2. ~~**Asset field mismatch `assetId` vs `assetRef`** + assets arg never passed~~ **CLOSED 2026-08-23 (`feat/export-convergence-1`) + 2026-08-24 (`feat/export-convergence-4`)** — export reads `sprite.assetRef` (legacy `assetId` fallback), embeds and passes project assets, loads data URIs in preload; texture keys unified on preview's `asset:` prefix; spritesheet/atlas kinds ported mirroring `buildAssetRecord` validation/precedence.
3. ~~**Body semantics divergence**~~ **CLOSED 2026-08-23 (`feat/export-convergence-2`)** — `resolveExportBody` mirrors `buildBodyConfig`: boolean flags override → collision.type → normalized entity type; solid→static, trigger/sensor→sensor+immovable+no-gravity, player/enemy/projectile→dynamic+world-bounds, everything else→no body; all bodies sized via `setSize`.
4. ~~**Physics/world config divergence**~~ **CLOSED 2026-08-24 (`feat/export-convergence-3`)** — `resolveExportWorld` reads `scene.bounds` + `scene.physics` exactly like `buildPhaserPreviewBootstrap`/`buildPhaserGameConfig`: game dimensions and emitted `physics.world.setBounds(...)` from bounds (default 1280×720), arcade gravity/debug passthrough. Legacy `metadata.width/height` no longer consulted.
5. ~~**Two export formats disagree**~~ **RESOLVED 2026-08-26 (`chore/remove-legacy-export`) by deletion** — the legacy canvas engine (`format:'html'`: `exportToHTML` + `export-templates.ts`) is removed per retro-2 ruling #2 (phaser-html is THE single shipped export format). The export route now rejects non-phaser formats with 400 (omitted format defaults to phaser-html); ExportPage no longer offers a canvas option; `listExports` reports `phaser-html` uniformly.
6. ~~Camera/input machinery present only on preview side~~ **OUT OF SCOPE / NON-GAP** — latent only: no shipped template sets camera metadata or input bindings, so there is zero behavioral divergence for real projects today; porting becomes relevant only if projects start shipping camera configs.

**Open gaps: 0.** With the legacy canvas format deleted there are no known divergences beyond the latent camera/input machinery note above.

## Regression guard

`apps/api/src/test/export-parity.test.ts` runs `compileSceneToPhaser` against `buildPhaserPreviewBootstrap(normalizePreviewScene(template))` for all three templates and asserts the exact baseline above (entity sets equal, asset keys equal, body-count deltas pinned). The export side is fed through `prepareExportEntities` — the same production prep `exportToPhaserHTML` uses — with dedicated probes for asset loading incl. unified `asset:` keys, spritesheet/atlas kinds, embedded-atlas resolution and representation parity (gap 2), inferred typing (gap 1), shape-type preservation, and physics/world config passthrough incl. defaults (gap 4). New divergences fail the test; when a gap is deliberately closed, update the pinned baseline in the same commit.
