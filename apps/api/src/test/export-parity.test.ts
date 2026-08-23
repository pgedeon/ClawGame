/**
 * Export/Preview parity smoke test (Roadmap P0 item 5 — measurement, no refactor).
 *
 * Compares the two shipped Phaser code paths for each template scene:
 * - Preview: normalizePreviewScene (production input path) → buildPhaserPreviewBootstrap
 * - Export:  ExportService.compileSceneToPhaser string output (fed exactly like
 *            exportToPhaserHTML feeds it: raw template JSON, components as Map)
 *
 * Asserts the divergence baseline documented in docs/export-parity.md:
 * - entity sets must match
 * - asset-key sets must match
 * - body-count / asset-key divergences must equal the pinned baseline
 * Any NEW divergence fails; closing a gap intentionally = update baseline here
 * and docs/export-parity.md in the same commit.
 *
 * NOTE: excluded from apps/api tsconfig (cross-package relative imports violate
 * composite rootDir, same convention as packages/engine excluding its tests);
 * vitest transpiles and runs this file regardless.
 */
import { describe, it, expect } from 'vitest';
import { ExportService } from '../services/exportService';
import { buildPhaserPreviewBootstrap } from '@clawgame/phaser-runtime/buildPreviewBootstrap';
import { normalizePreviewScene } from '../../../web/src/utils/previewScene';
import { templateScenes } from '../../../web/src/templates/templateScenes';
import type { TemplateScene } from '../../../web/src/templates/templateScenes';

const fakeLogger = {} as ConstructorParameters<typeof ExportService>[0];
const svc = new ExportService(fakeLogger);

/** Mirror exportToPhaserHTML entityMap construction (exportService.ts:141-148). */
function toExportEntityMap(template: TemplateScene): Record<string, any> {
  const entityMap: Record<string, any> = {};
  for (const e of template.entities) {
    entityMap[e.id] = {
      ...e,
      components: new Map(Object.entries(e.components || {})),
    };
  }
  return entityMap;
}

function extractSpriteNames(sceneCode: string): Set<string> {
  const re = /const\s+([A-Za-z0-9_]+)\s*=\s*this\.add\.sprite\(/g;
  return new Set([...sceneCode.matchAll(re)].map((m) => m[1]));
}

function extractLoadImageKeys(sceneCode: string): Set<string> {
  const re = /this\.load\.image\('([^']+)'/g;
  return new Set([...sceneCode.matchAll(re)].map((m) => m[1]));
}

function extractPhysicsBodyCount(sceneCode: string): number {
  return [...sceneCode.matchAll(/this\.physics\.add\.existing\(/g)].length;
}

interface ParityDiff {
  missingEntitiesExport: string[]; // preview ids with no add.sprite in export
  extraEntitiesExport: string[]; // export sprites with no preview entity
  assetKeysOnlyInPreview: string[];
  assetKeysOnlyInExport: string[];
  previewBodyCount: number;
  exportBodyCount: number;
}

function computeParity(template: TemplateScene): ParityDiff {
  const bootstrap = buildPhaserPreviewBootstrap(normalizePreviewScene(template as any));
  const sceneCode = svc.compileSceneToPhaser(
    'MainScene',
    template.name,
    toExportEntityMap(template),
    undefined,
    undefined,
  );

  const previewIds = bootstrap.entities.map((e) => e.id);
  const exportSprites = extractSpriteNames(sceneCode);
  const expectedSpriteNames = new Set(
    previewIds.map((id) => (id || '').replace(/[^a-zA-Z0-9_]/g, '_')),
  );

  const previewAssetKeys = bootstrap.assets.map((a) => a.key).sort();
  const exportAssetKeys = [...extractLoadImageKeys(sceneCode)].sort();

  return {
    missingEntitiesExport: previewIds.filter(
      (id) => !exportSprites.has((id || '').replace(/[^a-zA-Z0-9_]/g, '_')),
    ),
    extraEntitiesExport: [...exportSprites].filter((n) => !expectedSpriteNames.has(n)),
    assetKeysOnlyInPreview: previewAssetKeys.filter((k) => !exportAssetKeys.includes(k)),
    assetKeysOnlyInExport: exportAssetKeys.filter((k) => !previewAssetKeys.includes(k)),
    previewBodyCount: bootstrap.entities.filter((e) => e.body.kind !== 'none').length,
    exportBodyCount: extractPhysicsBodyCount(sceneCode),
  };
}

/** Pinned baseline — see docs/export-parity.md matrix. */
const EXPECTED_BODY_DELTA: Record<string, number> = {
  platformer: 4, // coin-1..3 + goal-flag become dynamic bodies in export
  topdown: 2, // powerup-1 + treasure-chest
  dialogue: 7, // npc×3 + sign×2 + locked-door + key-golden
};

describe('export/preview parity smoke (docs/export-parity.md)', () => {
  for (const [name, template] of Object.entries(templateScenes)) {
    it(`${name}: entity set + asset keys match, body delta pinned`, () => {
      const diff = computeParity(template as TemplateScene);

      expect(diff.missingEntitiesExport, `entities missing from export: ${diff.missingEntitiesExport}`).toEqual([]);
      expect(diff.extraEntitiesExport, `extra sprites in export: ${diff.extraEntitiesExport}`).toEqual([]);
      expect(diff.assetKeysOnlyInPreview, `asset keys only in preview: ${diff.assetKeysOnlyInPreview}`).toEqual([]);
      expect(diff.assetKeysOnlyInExport, `asset keys only in export: ${diff.assetKeysOnlyInExport}`).toEqual([]);

      const delta = diff.exportBodyCount - diff.previewBodyCount;
      expect(
        delta,
        `${name} body divergence drifted: preview=${diff.previewBodyCount} export=${diff.exportBodyCount} (baseline +${EXPECTED_BODY_DELTA[name]})`,
      ).toBe(EXPECTED_BODY_DELTA[name]);
    });
  }

  it('synthetic sprite.assetRef probe: both pipelines load the referenced asset (field-name gap closed)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetRef = 'hero.png';

    const bootstrap = buildPhaserPreviewBootstrap(normalizePreviewScene(template as any));
    expect(bootstrap.assets.map((a) => a.key)).toEqual(['asset:hero.png']);

    // Production path embeds project assets and passes them through to the compiler.
    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    // Remaining divergence is key naming only: preview prefixes `asset:`, export uses the raw ref.
    expect(extractLoadImageKeys(sceneCode)).toEqual(new Set(['hero.png']));
    expect(sceneCode).toContain("this.load.image('hero.png', hero_png)");
    expect(sceneCode).toContain("this.add.sprite(100, 350, 'hero.png')");
  });

  it('legacy sprite.assetId field still resolves (read-only fallback)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetId = 'hero.png';

    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(extractLoadImageKeys(sceneCode)).toEqual(new Set(['hero.png']));
    expect(sceneCode).toContain("this.add.sprite(100, 350, 'hero.png')");
  });
});
