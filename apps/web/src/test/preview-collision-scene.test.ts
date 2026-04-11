import { describe, expect, it } from 'vitest';
import { CollisionSystem, EventBus } from '@clawgame/engine';
import { createPreviewCollisionScene } from '../utils/previewCollisionScene';

describe('createPreviewCollisionScene', () => {
  it('maps item drops onto the engine pickup path', () => {
    const bus = new EventBus();
    const collisionSystem = new CollisionSystem();
    const pickups: Array<{ collectibleId: string; type: string; value: number }> = [];
    bus.on('collision:pickup', (event) => pickups.push(event));
    collisionSystem.attach(bus);

    const scene = createPreviewCollisionScene([
      {
        id: 'player',
        type: 'player',
        width: 32,
        height: 32,
        transform: { x: 100, y: 100 },
      },
      {
        id: 'loot-1',
        type: 'item',
        width: 16,
        height: 16,
        transform: { x: 100, y: 100 },
        components: {
          itemDrop: {
            itemId: 'iron-sword',
            name: 'Iron Sword',
            value: 25,
          },
        },
      },
    ]);

    collisionSystem.update(scene);

    expect(pickups).toEqual([
      {
        playerId: 'player',
        collectibleId: 'loot-1',
        type: 'item',
        value: 25,
      },
    ]);
  });
});
