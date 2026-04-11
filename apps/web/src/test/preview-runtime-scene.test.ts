import { describe, expect, it } from 'vitest';
import { applyPreviewRuntimeScene, createPreviewRuntimeScene } from '../utils/previewRuntimeScene';

describe('createPreviewRuntimeScene', () => {
  it('includes obstacle geometry as static wall collision', () => {
    const runtimeScene = createPreviewRuntimeScene([
      {
        id: 'player',
        type: 'player',
        width: 32,
        height: 32,
        transform: { x: 100, y: 100 },
        components: { movement: { speed: 120 } },
      },
      {
        id: 'wall-1',
        type: 'obstacle',
        width: 64,
        height: 32,
        transform: { x: 200, y: 200 },
      },
    ]);

    const wall = runtimeScene.entities.get('wall-1');
    expect(wall).toBeDefined();
    expect(wall?.components.get('collision')).toMatchObject({
      width: 64,
      height: 32,
      type: 'wall',
      solid: true,
    });
  });
});

describe('applyPreviewRuntimeScene', () => {
  it('syncs engine top-left transforms back to preview center coordinates', () => {
    const entities = new Map([
      ['enemy-1', {
        id: 'enemy-1',
        type: 'enemy',
        width: 32,
        height: 32,
        transform: { x: 100, y: 100 },
        components: { ai: { speed: 80 } },
        facing: 'right',
      }],
    ]);

    const runtimeScene = createPreviewRuntimeScene(entities.values());
    const enemy = runtimeScene.entities.get('enemy-1');
    expect(enemy).toBeDefined();

    if (!enemy) {
      throw new Error('expected enemy runtime entity');
    }

    enemy.transform.x = 10;
    enemy.transform.y = 20;
    const movement = enemy.components.get('movement') as { vx?: number } | undefined;
    if (movement) {
      movement.vx = -50;
    }

    applyPreviewRuntimeScene(runtimeScene, entities);

    expect(entities.get('enemy-1')?.transform).toMatchObject({ x: 26, y: 36 });
    expect(entities.get('enemy-1')?.facing).toBe('left');
  });
});
