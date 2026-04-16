import { describe, expect, it } from 'vitest';
import { CollisionSystem, EventBus } from '@clawgame/engine';
import { createPreviewCollisionScene } from '../utils/previewCollisionScene';

describe('createPreviewCollisionScene', () => {
  it('detects overlap between player and items', () => {
    const bus = new EventBus();
    const collisionSystem = new CollisionSystem();
    const overlaps: Array<{ entity: string; other: string; type: string; otherType: string }> = [];
    bus.on('collision:overlap', (event) => overlaps.push(event));
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

    // Collision is bidirectional, so we get two events
    expect(overlaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: 'player',
          other: 'loot-1',
          type: 'player',
          otherType: 'collectible',
        }),
      ])
    );
  });
});
