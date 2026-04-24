import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  Scale: {
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH',
  },
  Game: class MockGame {},
  Scene: class MockScene {},
  GameObjects: {},
}));

import { buildPhaserGameConfig } from './ClawgamePhaserRuntime';
import type { PhaserPreviewBootstrap } from './types';

const bootstrap: PhaserPreviewBootstrap = {
  sceneKey: 'preview',
  sceneName: 'Preview',
  backgroundColor: '#112233',
  bounds: { width: 320, height: 240 },
  assets: [],
  entities: [],
  metadata: { entityCount: 0, assetCount: 0 },
};

describe('buildPhaserGameConfig', () => {
  it('builds deterministic Phaser game config for the same bootstrap', () => {
    const first = buildPhaserGameConfig(bootstrap);
    const second = buildPhaserGameConfig(bootstrap);

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      type: 2,
      width: 320,
      height: 240,
      backgroundColor: '#112233',
      render: {
        roundPixels: true,
        smoothPixelArt: false,
      },
      scale: {
        mode: 'FIT',
        autoCenter: 'CENTER_BOTH',
      },
    });
  });

  it('allows explicit renderer fallback selection', () => {
    expect(buildPhaserGameConfig(bootstrap, { rendererType: 'auto' }).type).toBe(0);
    expect(buildPhaserGameConfig(bootstrap, { rendererType: 'canvas' }).type).toBe(1);
    expect(buildPhaserGameConfig(bootstrap, { rendererType: 'webgl' }).type).toBe(2);
  });
});
