import { describe, expect, it } from 'vitest';
import { createDefaultEditorScene, deserializeEditorScene, getSceneInitialViewport, serializeEditorScene } from '../utils/sceneEditorScene';

describe('sceneEditorScene utilities', () => {
  it('preserves entity types when deserializing saved scenes', () => {
    const scene = deserializeEditorScene({
      name: 'Loaded Scene',
      entities: [
        {
          id: 'player',
          type: 'player',
          transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          components: {
            playerInput: true,
            sprite: { width: 32, height: 48, color: '#3b82f6' },
          },
        },
        {
          id: 'wall-1',
          type: 'obstacle',
          transform: { x: 120, y: 90, rotation: 0, scaleX: 1, scaleY: 1 },
          components: {
            collision: { width: 64, height: 64, type: 'wall' },
          },
        },
      ],
    });

    expect(scene.entities.get('player')?.type).toBe('player');
    expect(scene.entities.get('wall-1')?.type).toBe('obstacle');
  });

  it('serializes runtime scenes back to JSON with entity types intact', () => {
    const scene = deserializeEditorScene({
      name: 'Serialize Me',
      entities: [
        {
          id: 'npc-1',
          type: 'npc',
          transform: { x: 32, y: 64, rotation: 0, scaleX: 1, scaleY: 1 },
          components: {
            npc: { name: 'Guide' },
            sprite: { width: 32, height: 32, color: '#22c55e' },
          },
        },
      ],
    });

    const serialized = JSON.parse(serializeEditorScene(scene));

    expect(serialized.entities[0].type).toBe('npc');
    expect(serialized.entities[0].id).toBe('npc-1');
  });

  it('creates a valid default scene and frames loaded content into view', () => {
    const defaultScene = createDefaultEditorScene();
    const viewport = getSceneInitialViewport(defaultScene);

    expect(defaultScene.entities.get('player-1')?.type).toBe('player');
    expect(viewport.zoom).toBe(1);
    expect(viewport.x).toBeLessThan(0);
    expect(viewport.y).toBeLessThan(0);
  });
});
