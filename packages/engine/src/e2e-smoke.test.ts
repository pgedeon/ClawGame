/**
 * E2E smoke tests — verify critical user paths via engine API.
 */

import type { Scene, Entity } from '../src/types';
import { compileScene } from '../src/scene-compiler';
import { createDefaultAssetPack, addAssetToPack, serializeAssetPack, parseAssetPack, validateAssetPack } from '../src/asset-pack';
import { createAnimation, createDefaultAnimationsConfig, addAnimation, generateAnimationCode } from '../src/animations';
import { createDefaultTilemap, setTile } from '../src/tilemap';
import { createPrefabDefinition, instantiatePrefab, createDefaultPrefabLibrary, addPrefab } from '../src/prefabs';

function makeScene(name: string, entities: Entity[]): Scene {
  return { name, entities: new Map(entities.map((e) => [e.id, e])) };
}

function makeEntity(id: string, type: string, x: number, y: number, assetId: string): Entity {
  return {
    id, name: id, type: type as any,
    transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
    components: new Map([['sprite', { assetId }]]),
  };
}

describe('e2e: add asset', () => {
  it('adds asset to pack and serializes', () => {
    let pack = createDefaultAssetPack('my-game');
    pack = addAssetToPack(pack, { key: 'hero', type: 'image', url: 'hero.png' });
    const json = serializeAssetPack(pack);
    const parsed = parseAssetPack(json);
    expect(parsed.entries).toHaveLength(1);
    expect(validateAssetPack(parsed).valid).toBe(true);
  });
});

describe('e2e: add scene object', () => {
  it('adds entity and compiles', () => {
    const scene = makeScene('Test', [makeEntity('e1', 'player', 100, 200, 'hero')]);
    const code = compileScene(scene, { className: 'TestScene' });
    expect(code).toContain('100, 200');
  });
});

describe('e2e: edit properties', () => {
  it('modifies entity transform and recompiles', () => {
    const entity = makeEntity('e1', 'player', 0, 0, 'x');
    entity.transform.x = 300;
    entity.transform.y = 400;
    entity.transform.rotation = 1.57;
    const scene = makeScene('Test', [entity]);
    const code = compileScene(scene, { className: 'TestScene' });
    expect(code).toContain('300, 400');
    expect(code).toContain('1.57');
  });
});

describe('e2e: preview (compile output is valid)', () => {
  it('produces class and create for multi-entity scene', () => {
    const entities = Array.from({ length: 5 }, (_, i) =>
      makeEntity(`e${i}`, 'enemy', i * 50, 100, `enemy-${i}`),
    );
    const scene = makeScene('Multi', entities);
    const code = compileScene(scene, { className: 'MultiScene' });
    expect(code).toMatch(/class \w+Scene/);
    expect(code).toContain('create()');
  });
});

describe('e2e: export (animations + tilemap + prefab)', () => {
  it('generates code for full project pipeline', () => {
    const animConfig = addAnimation(createDefaultAnimationsConfig(), createAnimation('walk', ['w0', 'w1']));
    const animCode = generateAnimationCode(animConfig);
    expect(animCode).toContain("key: 'walk'");

    const tilemap = setTile(createDefaultTilemap(4, 4, 32, 32), 'layer-1', 1, 1, 3);
    expect(tilemap.layers[0].data[1][1]).toBe(3);

    let lib = addPrefab(createDefaultPrefabLibrary(), createPrefabDefinition('p1', 'Prefab1', []));
    const entities = instantiatePrefab(lib.prefabs[0], 'inst', 50, 50);
    expect(entities).toHaveLength(0);

    const scene = makeScene('Full', []);
    const code = compileScene(scene, { className: 'FullScene', animationsConfig: animConfig });
    expect(code).toContain('Animations');
  });
});
