import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  Scene: class MockScene {},
  GameObjects: {},
}));

import { ClawgamePhaserScene } from './ClawgamePhaserScene';
import type { PhaserPreviewBootstrap, PhaserRuntimeErrorReporter } from './types';

function createBootstrap(overrides: Partial<PhaserPreviewBootstrap> = {}): PhaserPreviewBootstrap {
  return {
    sceneKey: 'preview',
    sceneName: 'Preview',
    backgroundColor: '#000000',
    bounds: { width: 320, height: 240 },
    assets: [],
    entities: [],
    metadata: { entityCount: 0, assetCount: 0 },
    ...overrides,
  };
}

describe('ClawgamePhaserScene error visibility', () => {
  it('reports broken entity creation instead of swallowing it', () => {
    const reporter: PhaserRuntimeErrorReporter = { reportError: vi.fn() };
    const scene = new ClawgamePhaserScene({ reporter });
    scene.setBootstrap(createBootstrap({
      entities: [
        {
          id: 'broken',
          type: 'player',
          x: 10,
          y: 20,
          width: 32,
          height: 32,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          body: { kind: 'none', width: 32, height: 32 },
        },
      ],
    }));

    Object.assign(scene, {
      add: {
        rectangle: vi.fn(() => {
          throw new Error('cannot create rectangle');
        }),
      },
      cameras: { main: { setBackgroundColor: vi.fn() } },
      physics: { world: { setBounds: vi.fn() } },
    });

    scene.create();

    expect(scene.getErrors()).toHaveLength(1);
    expect(scene.getErrors()[0]).toMatchObject({
      phase: 'entity-creation',
      context: { entityId: 'broken', entityType: 'player' },
    });
    expect(reporter.reportError).toHaveBeenCalledWith(
      'entity-creation',
      expect.any(Error),
      { entityId: 'broken', entityType: 'player' },
    );
  });

  it('reports failed asset loads', () => {
    const reporter: PhaserRuntimeErrorReporter = { reportError: vi.fn() };
    const scene = new ClawgamePhaserScene({ reporter });
    let loadErrorHandler: ((file: { key: string; url: string; type: string }) => void) | undefined;
    const load = {
      on: vi.fn((_event: string, handler: typeof loadErrorHandler) => {
        loadErrorHandler = handler;
        return load;
      }),
      image: vi.fn(),
      spritesheet: vi.fn(),
      atlas: vi.fn(),
    };

    Object.assign(scene, { load });
    scene.setBootstrap(createBootstrap({
      assets: [
        {
          key: 'asset:missing.png',
          assetRef: 'missing.png',
          kind: 'image',
          loadUrl: './missing.png',
          width: 32,
          height: 32,
        },
      ],
      metadata: { entityCount: 0, assetCount: 1 },
    }));

    scene.preload();
    loadErrorHandler?.({ key: 'asset:missing.png', url: './missing.png', type: 'image' });

    expect(load.image).toHaveBeenCalledWith('asset:missing.png', './missing.png');
    expect(scene.getErrors()[0]).toMatchObject({
      phase: 'asset-load',
      context: {
        key: 'asset:missing.png',
        url: './missing.png',
        type: 'image',
        assetRef: 'missing.png',
      },
    });
    expect(reporter.reportError).toHaveBeenCalledWith(
      'asset-load',
      expect.any(Error),
      expect.objectContaining({ key: 'asset:missing.png' }),
    );
  });
});
