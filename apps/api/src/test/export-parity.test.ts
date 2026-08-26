/**
 * Export/Preview parity smoke test (Roadmap P0 item 5 — measurement, no refactor).
 *
 * Compares the two shipped Phaser code paths for each template scene:
 * - Preview: normalizePreviewScene (production input path) → buildPhaserPreviewBootstrap
 * - Export:  ExportService.compileSceneToPhaser string output (fed exactly like
 *            exportToPhaserHTML feeds it: prepareExportEntities normalization,
 *            components as Map)
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
import { ExportService, prepareExportEntities, resolveExportWorld } from '../services/exportService';
import { buildPhaserPreviewBootstrap } from '@clawgame/phaser-runtime/buildPreviewBootstrap';
import { normalizePreviewScene } from '@clawgame/engine';
import { templateScenes } from '../../../web/src/templates/templateScenes';
import type { TemplateScene } from '../../../web/src/templates/templateScenes';

const fakeLogger = {} as ConstructorParameters<typeof ExportService>[0];
const svc = new ExportService(fakeLogger);

/** Mirror exportToPhaserHTML entityMap construction (normalize + Map wrap). */
function toExportEntityMap(template: TemplateScene | { name?: string; entities: unknown[] }): Record<string, any> {
  const entityMap: Record<string, any> = {};
  for (const e of prepareExportEntities(template as any)) {
    entityMap[e.id] = {
      ...e,
      components: e.components instanceof Map ? e.components : new Map(Object.entries(e.components || {})),
    };
  }
  return entityMap;
}

function extractSpriteNames(sceneCode: string): Set<string> {
  // Color-only entities emit as typed-color rectangles (representation parity with
  // preview), so count both sprite and rectangle declarations as entity handles.
  const re = /const\s+([A-Za-z0-9_]+)\s*=\s*this\.add\.(?:sprite|rectangle)\(/g;
  return new Set([...sceneCode.matchAll(re)].map((m) => m[1]));
}

function extractLoadTextureKeys(sceneCode: string): Set<string> {
  const re = /this\.load\.(?:image|spritesheet|atlas|atlasXML)\('([^']+)'/g;
  return new Set([...sceneCode.matchAll(re)].map((m) => m[1]));
}

function extractPhysicsBodyCount(sceneCode: string): number {
  return [...sceneCode.matchAll(/this\.physics\.add\.existing\(/g)].length;
}

interface ParityDiff {
  missingEntitiesExport: string[]; // preview ids with no add.sprite/add.rectangle handle in export
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
    [],
    undefined,
  );

  const previewIds = bootstrap.entities.map((e) => e.id);
  const exportSprites = extractSpriteNames(sceneCode);
  const expectedSpriteNames = new Set(
    previewIds.map((id) => (id || '').replace(/[^a-zA-Z0-9_]/g, '_')),
  );

  const previewAssetKeys = bootstrap.assets.map((a) => a.key).sort();
  const exportAssetKeys = [...extractLoadTextureKeys(sceneCode)].sort();

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

/** Pinned baseline — see docs/export-parity.md matrix. Gap 3 closed: body kinds match. */
const EXPECTED_BODY_DELTA: Record<string, number> = {
  platformer: 0,
  topdown: 0,
  dialogue: 0,
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

  it('synthetic sprite.assetRef probe: both pipelines load the referenced asset under the unified asset: key (gap 2 closed)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetRef = 'hero.png';

    const bootstrap = buildPhaserPreviewBootstrap(normalizePreviewScene(template as any));
    expect(bootstrap.assets.map((a) => a.key)).toEqual(['asset:hero.png']);

    // Production path embeds project assets and passes them through to the compiler.
    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    // Key naming unified on the preview convention: `asset:` prefix on both sides.
    expect(extractLoadTextureKeys(sceneCode)).toEqual(new Set(['asset:hero.png']));
    expect(sceneCode).toContain("this.load.image('asset:hero.png', hero_png)");
    expect(sceneCode).toContain("this.add.sprite(100, 350, 'asset:hero.png')");
  });

  it('spritesheet frameData emits load.spritesheet with unified key (gap 2 closed)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetRef = 'hero.png';
    (template.entities[0].components as any).sprite.frameData = { frameWidth: 24, frameHeight: 32, endFrame: 3 };

    const bootstrap = buildPhaserPreviewBootstrap(normalizePreviewScene(template as any));
    expect(bootstrap.assets.map((a) => [a.key, a.kind])).toEqual([['asset:hero.png', 'spritesheet']]);

    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(sceneCode).toContain(
      "this.load.spritesheet('asset:hero.png', hero_png, { frameWidth: 24, frameHeight: 32, endFrame: 3 });",
    );
    expect(sceneCode).toContain("this.add.sprite(100, 350, 'asset:hero.png')");
  });

  it('atlasMeta json/xml emit load.atlas/load.atlasXML (gap 2 closed)', () => {
    for (const type of ['json', 'xml'] as const) {
      const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
      (template.entities[0].components as any).sprite.assetRef = 'hero.png';
      (template.entities[0].components as any).sprite.atlasMeta = { atlasUrl: 'hero.json', type };

      const bootstrap = buildPhaserPreviewBootstrap(normalizePreviewScene(template as any));
      expect(bootstrap.assets.map((a) => [a.key, a.kind])).toEqual([['asset:hero.png', 'atlas']]);

      const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
        { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
      ]);
      const loader = type === 'xml' ? 'atlasXML' : 'atlas';
      expect(sceneCode).toContain(`this.load.${loader}('asset:hero.png', hero_png, 'hero.json');`);
    }
  });

  it('atlas document resolves embedded data URI by url or id match; invalid frameData falls back to image', () => {
    // atlasUrl matching an embedded asset url → data URI const instead of runtime fetch.
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetRef = 'hero.png';
    (template.entities[0].components as any).sprite.atlasMeta = {
      atlasUrl: '/data/assets/p1/hero.json',
      type: 'json',
    };
    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
      { id: 'hero-json', url: '/data/assets/p1/hero.json', dataUri: 'data:application/json;base64,e30=' },
    ]);
    expect(sceneCode).toContain("this.load.atlas('asset:hero.png', hero_png, hero_json);");

    // frameData missing frameHeight is invalid → plain image fallback (mirrors buildAssetRecord).
    const badFrame = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (badFrame.entities[0].components as any).sprite.assetRef = 'hero.png';
    (badFrame.entities[0].components as any).sprite.frameData = { frameWidth: 24 };
    const fallbackCode = svc.compileSceneToPhaser('MainScene', badFrame.name, toExportEntityMap(badFrame), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(fallbackCode).toContain("this.load.image('asset:hero.png', hero_png)");
    expect(fallbackCode).not.toContain('load.spritesheet');
  });

  it('color-only entities render as typed-color rectangles; asset sprites get setDisplaySize (representation parity)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    // Templates are asset-free: every entity is color-only → typed-color rectangles.
    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), []);
    expect(sceneCode).toContain("const player_1 = this.add.rectangle(");
    expect(sceneCode).toContain("'#3b82f6')"); // player blue, mirrors getColorForType
    expect(sceneCode).not.toContain('this.add.sprite(');

    // Asset entities: sprite + setDisplaySize with preview dimension precedence
    // (sprite.width/height ?? collision ?? transform ?? 32).
    const withAsset = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (withAsset.entities[0].components as any).sprite.assetRef = 'hero.png';
    const assetCode = svc.compileSceneToPhaser('MainScene', withAsset.name, toExportEntityMap(withAsset), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(assetCode).toContain("this.add.sprite(100, 350, 'asset:hero.png')");
    expect(assetCode).toMatch(/player_1\.setDisplaySize\(\d+, \d+\)/);
  });

  it('legacy sprite.assetId field still resolves (read-only fallback)', () => {
    const template = JSON.parse(JSON.stringify(templateScenes.platformer)) as TemplateScene;
    (template.entities[0].components as any).sprite.assetId = 'hero.png';

    const sceneCode = svc.compileSceneToPhaser('MainScene', template.name, toExportEntityMap(template), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(extractLoadTextureKeys(sceneCode)).toEqual(new Set(['asset:hero.png']));
    expect(sceneCode).toContain("this.add.sprite(100, 350, 'asset:hero.png')");
  });

  it('normalization feeds export: typed entities no longer fall back to custom (gap 1)', () => {
    const prepared = prepareExportEntities(templateScenes.platformer as any);
    const typeById = new Map(prepared.map((e) => [e.id, e.type]));
    expect(typeById.get('player-1')).toBe('player');
    expect(typeById.get('enemy-1')).toBe('enemy');
    expect(typeById.get('coin-1')).toBe('collectible');
    expect(typeById.get('platform-ground')).toBe('obstacle');
    expect(typeById.get('goal-flag')).toBe('obstacle');

    // No shipped-template entity degrades to the old 'custom' fallback anymore.
    for (const [, template] of Object.entries(templateScenes)) {
      for (const e of prepareExportEntities(template as any)) {
        expect(e.type, `${e.id} fell back to custom`).not.toBe('custom');
      }
    }
  });

  it('body semantics mirror preview bootstrap (gap 3 closed)', () => {
    const scene = {
      name: 'Bodies',
      entities: [
        { id: 'wall-1', transform: { x: 0, y: 0 }, components: { collision: { width: 100, height: 20, type: 'solid' }, sprite: { width: 100, height: 20 } } },
        { id: 'trigger-1', transform: { x: 50, y: 50 }, components: { collision: { width: 30, height: 30, trigger: true }, sprite: { width: 30, height: 30 } } },
        { id: 'hero-1', type: 'player', transform: { x: 10, y: 10 }, components: { playerInput: true, collision: { width: 32, height: 48, type: 'player' }, sprite: { width: 32, height: 48 } } },
        { id: 'coin-1', transform: { x: 20, y: 20 }, components: { collectible: { type: 'coin', value: 1 }, collision: { width: 20, height: 20, type: 'collectible' }, sprite: { width: 20, height: 20 } } },
      ],
    };
    const code = svc.compileSceneToPhaser('MainScene', 'Bodies', toExportEntityMap(scene), [], undefined);

    // solid → static + sized
    expect(code).toContain('this.physics.add.existing(wall_1, true)');
    expect(code).toContain('wall_1.body.setSize(100, 20)');
    // boolean trigger flag → sensor: immovable, no gravity, no world bounds
    expect(code).toContain('this.physics.add.existing(trigger_1, false)');
    expect(code).toContain('trigger_1.body.setSize(30, 30)');
    expect(code).toContain('trigger_1.body.setImmovable(true)');
    expect(code).toContain('trigger_1.body.setAllowGravity(false)');
    expect(code).not.toContain('trigger_1.body.setCollideWorldBounds');
    // player → dynamic + world bounds
    expect(code).toContain('hero_1.body.setCollideWorldBounds(true)');
    // collectible → no body at all
    expect(code).not.toMatch(/coin_1\.body/);
  });

  it('physics/world config passthrough mirrors preview bootstrap (gap 4 closed)', () => {
    const scene = {
      name: 'World',
      bounds: { x: 0, y: 0, width: 2048, height: 1152 },
      physics: { gravity: { x: 0, y: 900 }, debug: true },
      entities: [],
    };
    const code = svc.compileSceneToPhaser('MainScene', 'World', toExportEntityMap(scene), [], undefined, resolveExportWorld(scene));

    // World bounds emitted in create() exactly like ClawgamePhaserScene.create.
    expect(code).toContain('this.physics.world.setBounds(0, 0, 2048, 1152);');

    const html = svc.generatePhaserHTML(
      { name: 'World' },
      'MainScene',
      code,
      [],
      undefined,
      resolveExportWorld(scene),
    );
    // Game dimensions from scene.bounds (bootstrap-equivalent), not legacy metadata bag.
    expect(html).toContain('width: 2048');
    expect(html).toContain('height: 1152');
    // Arcade gravity + debug passthrough from scene.physics.
    expect(html).toContain("arcade: { debug: true, gravity: { x: 0, y: 900 } }");
  });

  it('world defaults match preview bootstrap when scene ships no bounds/physics (gap 4)', () => {
    const scene = { name: 'Default', entities: [] };
    const code = svc.compileSceneToPhaser('MainScene', 'Default', toExportEntityMap(scene), [], undefined, resolveExportWorld(scene));
    expect(code).toContain('this.physics.world.setBounds(0, 0, 1280, 720);');

    const html = svc.generatePhaserHTML(
      { name: 'Default' },
      'MainScene',
      code,
      [],
      undefined,
      resolveExportWorld(scene),
    );
    expect(html).toContain('width: 1280');
    expect(html).toContain('height: 720');
    expect(html).toContain('arcade: { debug: false }');
    expect(html).not.toContain('gravity:');
  });

  it('editor shape types survive normalization and hit their render branches', () => {
    const scene = {
      name: 'Shapes',
      entities: [
        { id: 't1', type: 'text', name: 't1', transform: { x: 10, y: 20 }, components: { text: { content: 'Hi', fontSize: 20, color: '#ffffff' } } },
        { id: 'z1', type: 'zone', name: 'z1', transform: { x: 0, y: 0 }, components: {} },
      ],
    };
    const prepared = prepareExportEntities(scene as any);
    expect(prepared.map((e) => e.type)).toEqual(['text', 'zone']);

    const code = svc.compileSceneToPhaser('MainScene', 'Shapes', toExportEntityMap(scene), [], undefined);
    expect(code).toContain('this.add.text(10, 20');
    expect(code).toContain('this.add.zone(0, 0');
  });
});

describe('export/preview tint parity (sprite.color passthrough)', () => {
  it('explicit sprite.color overrides the typed-color map on color-only entities (mirrors preview tint)', () => {
    const scene = {
      name: 'Tinted',
      entities: [
        {
          id: 'player-1',
          type: 'player',
          transform: { x: 100, y: 350 },
          components: { playerInput: true, sprite: { width: 32, height: 48, color: '#ef4444' }, collision: { width: 32, height: 48, type: 'player' } },
        },
      ],
    };
    const code = svc.compileSceneToPhaser('MainScene', 'Tinted', toExportEntityMap(scene), [], undefined);
    expect(code).toContain("this.add.rectangle(100, 350, 32, 48, '#ef4444')");
    expect(code).not.toContain("'#3b82f6'");
  });

  it('asset sprites emit numeric setTint when sprite.color is present (mirrors preview setTint)', () => {
    const scene = {
      name: 'TintedAsset',
      entities: [
        {
          id: 'hero-1',
          type: 'player',
          transform: { x: 100, y: 350 },
          components: { playerInput: true, sprite: { width: 32, height: 48, color: '#22d3ee', assetRef: 'hero.png' }, collision: { width: 32, height: 48, type: 'player' } },
        },
      ],
    };
    const code = svc.compileSceneToPhaser('MainScene', 'TintedAsset', toExportEntityMap(scene), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(code).toContain("this.add.sprite(100, 350, 'asset:hero.png')");
    expect(code).toContain('hero_1.setTint(0x22d3ee);');
  });

  it('omits the setTint line without sprite.color or for malformed colors (no broken JS)', () => {
    const base = {
      name: 'NoTint',
      entities: [] as unknown[],
    };
    const untinted = {
      ...base,
      entities: [
        {
          id: 'hero-1',
          type: 'player',
          transform: { x: 0, y: 0 },
          components: { sprite: { width: 32, height: 48, assetRef: 'hero.png' } },
        },
      ],
    };
    const code = svc.compileSceneToPhaser('MainScene', 'NoTint', toExportEntityMap(untinted), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(code).not.toContain('.setTint(');

    const malformed = {
      ...base,
      entities: [
        {
          id: 'hero-2',
          type: 'player',
          transform: { x: 0, y: 0 },
          components: { sprite: { width: 32, height: 48, color: 'crimson', assetRef: 'hero.png' } },
        },
      ],
    };
    const code2 = svc.compileSceneToPhaser('MainScene', 'NoTint', toExportEntityMap(malformed), [
      { id: 'hero.png', dataUri: 'data:image/png;base64,AAAA' },
    ]);
    expect(code2).not.toContain('.setTint(');
  });
});
