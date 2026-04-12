import { describe, expect, it } from 'vitest';
import { buildPhaserPreviewBootstrap } from './buildPreviewBootstrap';

describe('buildPhaserPreviewBootstrap', () => {
  it('collects unique sprite assets and preserves scene metadata', () => {
    const bootstrap = buildPhaserPreviewBootstrap({
      name: 'Arena',
      background: '#112233',
      bounds: { width: 1920, height: 1080 },
      spawnPoint: { x: 120, y: 240 },
      entities: [
        {
          id: 'player',
          type: 'player',
          transform: { x: 100, y: 120, scaleX: 1, scaleY: 1 },
          components: {
            sprite: { assetRef: 'hero.png', width: 48, height: 64, color: '#ffffff' },
            collision: { width: 48, height: 64, type: 'player' },
          },
        },
        {
          id: 'enemy',
          type: 'enemy',
          transform: { x: 400, y: 220 },
          components: {
            sprite: { assetRef: 'hero.png', width: 48, height: 64 },
            collision: { width: 40, height: 40, type: 'enemy' },
          },
        },
      ],
    });

    expect(bootstrap.sceneName).toBe('Arena');
    expect(bootstrap.backgroundColor).toBe('#112233');
    expect(bootstrap.bounds).toEqual({ width: 1920, height: 1080 });
    expect(bootstrap.spawnPoint).toEqual({ x: 120, y: 240 });
    expect(bootstrap.assets).toHaveLength(1);
    expect(bootstrap.assets[0]).toMatchObject({
      assetRef: 'hero.png',
      width: 48,
      height: 64,
    });
    expect(bootstrap.metadata).toEqual({ entityCount: 2, assetCount: 1 });
  });

  it('infers static, sensor, and none body kinds from canonical collision data', () => {
    const bootstrap = buildPhaserPreviewBootstrap({
      entities: [
        {
          id: 'wall',
          type: 'obstacle',
          transform: { x: 10, y: 20 },
          components: { collision: { width: 128, height: 32, solid: true, type: 'wall' } },
        },
        {
          id: 'trigger',
          type: 'trigger',
          transform: { x: 20, y: 40 },
          components: { collision: { width: 64, height: 64, trigger: true, type: 'trigger' } },
        },
        {
          id: 'decoration',
          type: 'custom',
          transform: { x: 30, y: 50 },
          components: { sprite: { width: 20, height: 24, color: '#ff00ff' } },
        },
      ],
    });

    expect(bootstrap.entities.map((entity) => entity.body.kind)).toEqual(['static', 'sensor', 'none']);
    expect(bootstrap.entities[0].body).toMatchObject({ width: 128, height: 32 });
    expect(bootstrap.entities[2]).toMatchObject({
      width: 20,
      height: 24,
      tint: '#ff00ff',
    });
  });

  it('falls back to default bounds and background when scene data is incomplete', () => {
    const bootstrap = buildPhaserPreviewBootstrap({
      entities: [
        {
          id: 'npc',
          components: {},
        },
      ],
    });

    expect(bootstrap.sceneName).toBe('Main Scene');
    expect(bootstrap.backgroundColor).toBe('#0f172a');
    expect(bootstrap.bounds).toEqual({ width: 1280, height: 720 });
    expect(bootstrap.entities[0]).toMatchObject({
      id: 'npc',
      type: 'unknown',
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    });
  });
});
