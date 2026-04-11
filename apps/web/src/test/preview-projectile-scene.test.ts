import { describe, expect, it } from 'vitest';
import { EventBus, ProjectileSystem } from '@clawgame/engine';
import { applyPreviewProjectileScene, createPreviewProjectileScene } from '../utils/previewProjectileScene';

describe('createPreviewProjectileScene', () => {
  it('maps preview shots and enemy targets into an engine projectile scene', () => {
    const scene = createPreviewProjectileScene(
      [
        {
          id: 'proj-1',
          x: 100,
          y: 100,
          vx: 200,
          vy: 0,
          damage: 30,
        },
      ],
      [
        {
          id: 'enemy-1',
          type: 'enemy',
          width: 32,
          height: 32,
          transform: { x: 150, y: 100 },
        },
      ],
    );

    expect(scene.entities.get('proj-1')?.components.get('projectile')).toMatchObject({
      vx: 200,
      vy: 0,
      damage: 30,
      targetTypes: ['enemy', 'wall'],
    });
    expect(scene.entities.get('enemy-1')?.components.get('collision')).toMatchObject({
      type: 'enemy',
      width: 32,
      height: 32,
    });
  });

  it('syncs surviving projectiles back to preview space and removes destroyed shots', () => {
    const projectiles = [
      {
        id: 'proj-1',
        x: 100,
        y: 100,
        vx: 200,
        vy: 0,
        damage: 30,
      },
      {
        id: 'proj-2',
        x: 40,
        y: 40,
        vx: 0,
        vy: 0,
        damage: 10,
      },
    ];

    const scene = createPreviewProjectileScene(projectiles, []);
    const projectileSystem = new ProjectileSystem({ width: 400, height: 400 });
    projectileSystem.attach(new EventBus());
    scene.entities.delete('proj-2');
    projectileSystem.update(scene, 0.1);

    applyPreviewProjectileScene(scene, projectiles);

    expect(projectiles).toHaveLength(1);
    expect(projectiles[0].id).toBe('proj-1');
    expect(projectiles[0].x).toBeGreaterThan(100);
  });
});
