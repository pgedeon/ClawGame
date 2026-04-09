/**
 * @clawgame/engine - SceneLoader tests
 */
import { describe, it, expect, vi } from 'vitest';
import { SceneLoader, AssetResolver } from './SceneLoader';
import {
  SerializableScene,
  SerializableEntity,
  SpriteComponent,
  toRuntimeEntity,
} from './types';

function makeEntity(overrides: Partial<SerializableEntity> = {}): SerializableEntity {
  return {
    id: 'e1',
    name: 'test-entity',
    type: 'player',
    transform: { x: 100, y: 200 },
    components: {},
    ...overrides,
  };
}

function makeScene(entities: SerializableEntity[] = []): SerializableScene {
  return { name: 'test-scene', entities };
}

describe('SceneLoader', () => {
  it('loads an empty scene', async () => {
    const loader = new SceneLoader();
    const result = await loader.load(makeScene());

    expect(result.scene.name).toBe('test-scene');
    expect(result.entityCount).toBe(0);
    expect(result.missingAssets).toEqual([]);
    expect(result.loadTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('loads entities with basic components', async () => {
    const loader = new SceneLoader();
    const data = makeScene([
      makeEntity({
        id: 'player',
        type: 'player',
        components: {
          sprite: { width: 32, height: 32, color: '#ff0000' },
          movement: { vx: 0, vy: 0, speed: 100 },
        },
      }),
      makeEntity({
        id: 'enemy',
        type: 'enemy',
        components: {
          sprite: { width: 32, height: 32, color: '#00ff00' },
          ai: { type: 'patrol', patrolStart: { x: 0, y: 0 }, patrolEnd: { x: 100, y: 0 }, patrolSpeed: 50 },
        },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.entityCount).toBe(2);
    expect(result.scene.entities.has('player')).toBe(true);
    expect(result.scene.entities.has('enemy')).toBe(true);

    const player = result.scene.entities.get('player')!;
    expect(player.components.has('sprite')).toBe(true);
    expect(player.components.has('movement')).toBe(true);
    expect(player.transform.x).toBe(100);
    expect(player.transform.y).toBe(200);
  });

  it('reports missing assets when no resolver is provided', async () => {
    const loader = new SceneLoader();
    const data = makeScene([
      makeEntity({
        id: 'e1',
        components: {
          sprite: { width: 32, height: 32, assetRef: 'hero.png' },
        },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.missingAssets).toEqual(['hero.png']);
    // Sprite should exist but without an image
    const sprite = result.scene.entities.get('e1')!.components.get('sprite') as SpriteComponent;
    expect(sprite.image).toBeUndefined();
  });

  it('resolves assets via resolver', async () => {
    const fakeImage = { src: 'data:fake' } as unknown as HTMLImageElement;
    const resolver: AssetResolver = vi.fn().mockResolvedValue(fakeImage);

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({
        id: 'e1',
        components: {
          sprite: { width: 32, height: 32, assetRef: 'hero.png' },
        },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.missingAssets).toEqual([]);
    const sprite = result.scene.entities.get('e1')!.components.get('sprite') as SpriteComponent;
    expect(sprite.image).toBe(fakeImage);
    expect(resolver).toHaveBeenCalledWith('hero.png');
  });

  it('caches resolved assets', async () => {
    const fakeImage = {} as HTMLImageElement;
    const resolver: AssetResolver = vi.fn().mockResolvedValue(fakeImage);

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({ id: 'e1', components: { sprite: { width: 32, height: 32, assetRef: 'hero.png' } } }),
      makeEntity({ id: 'e2', components: { sprite: { width: 32, height: 32, assetRef: 'hero.png' } } }),
    ]);

    const result = await loader.load(data);

    // Resolver called only once due to cache
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(result.entityCount).toBe(2);
  });

  it('handles resolver errors gracefully', async () => {
    const resolver: AssetResolver = vi.fn().mockRejectedValue(new Error('network'));

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({
        id: 'e1',
        components: { sprite: { width: 32, height: 32, assetRef: 'hero.png' } },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.missingAssets).toEqual(['hero.png']);
  });

  it('handles resolver returning null', async () => {
    const resolver: AssetResolver = vi.fn().mockResolvedValue(null);

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({
        id: 'e1',
        components: { sprite: { width: 32, height: 32, assetRef: 'missing.png' } },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.missingAssets).toEqual(['missing.png']);
  });

  it('clearCache removes cached assets', async () => {
    const fakeImage = {} as HTMLImageElement;
    const resolver: AssetResolver = vi.fn().mockResolvedValue(fakeImage);

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({ id: 'e1', components: { sprite: { width: 32, height: 32, assetRef: 'hero.png' } } }),
    ]);

    await loader.load(data);
    expect(loader.getCachedAssets()).toEqual(['hero.png']);

    loader.clearCache();
    expect(loader.getCachedAssets()).toEqual([]);

    // Second load should call resolver again
    await loader.load(data);
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('invalidateAsset removes a specific cached asset', async () => {
    const fakeImage = {} as HTMLImageElement;
    const resolver: AssetResolver = vi.fn().mockResolvedValue(fakeImage);

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({ id: 'e1', components: { sprite: { width: 32, height: 32, assetRef: 'hero.png' } } }),
      makeEntity({ id: 'e2', components: { sprite: { width: 32, height: 32, assetRef: 'bg.png' } } }),
    ]);

    await loader.load(data);
    expect(loader.getCachedAssets()).toContain('hero.png');
    expect(loader.getCachedAssets()).toContain('bg.png');

    loader.invalidateAsset('hero.png');
    expect(loader.getCachedAssets()).not.toContain('hero.png');
    expect(loader.getCachedAssets()).toContain('bg.png');
  });

  it('skips entities without sprite assetRef', async () => {
    const resolver: AssetResolver = vi.fn();

    const loader = new SceneLoader({ assetResolver: resolver });
    const data = makeScene([
      makeEntity({
        id: 'e1',
        components: { sprite: { width: 32, height: 32, color: '#ff0000' } },
      }),
      makeEntity({
        id: 'e2',
        components: { movement: { vx: 0, vy: 0, speed: 50 } },
      }),
    ]);

    const result = await loader.load(data);

    expect(result.missingAssets).toEqual([]);
    expect(resolver).not.toHaveBeenCalled();
    expect(result.entityCount).toBe(2);
  });

  it('preserves scene metadata in loaded entities', async () => {
    const loader = new SceneLoader();
    const data = makeScene([
      makeEntity({
        id: 'player1',
        name: 'Hero',
        type: 'player',
        transform: { x: 50, y: 75, rotation: 90, scaleX: 2, scaleY: 0.5 },
        components: {
          stats: { hp: 100, maxHp: 100, damage: 10 },
          playerInput: { enabled: true },
        },
      }),
    ]);

    const result = await loader.load(data);
    const entity = result.scene.entities.get('player1')!;

    expect(entity.name).toBe('Hero');
    expect(entity.type).toBe('player');
    expect(entity.transform.rotation).toBe(90);
    expect(entity.transform.scaleX).toBe(2);
    expect(entity.transform.scaleY).toBe(0.5);
    expect(entity.components.has('stats')).toBe(true);
    expect(entity.components.has('playerInput')).toBe(true);
  });
});
