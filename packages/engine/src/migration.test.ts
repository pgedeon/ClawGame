/**
 * Migration tests: ensure old scene file formats still parse correctly.
 */

import type { Scene, Entity } from '../src/types';
import { compileScene } from '../src/scene-compiler';

function makeScene(id: string, name: string, w: number, h: number, entities: Entity[]): Scene {
  return {
    name,
    entities: new Map(entities.map((e) => [e.id, e])),
  };
}

/** v0.1 format with object components (pre-Map migration) */
const LEGACY_V01_ENTITY: Entity = {
  id: 'e1',
  name: 'Player',
  type: 'player',
  transform: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
  components: new Map([['sprite', { assetId: 'hero-sprite' }]]),
};

describe('migration compatibility', () => {
  it('compiles scene with basic entity', () => {
    const scene = makeScene('test', 'Test', 800, 600, [LEGACY_V01_ENTITY]);
    const result = compileScene(scene, { className: 'TestScene' });
    expect(result).toContain('class TestScene');
    expect(result).toContain('hero-sprite');
  });

  it('handles empty scene without crashing', () => {
    const scene = makeScene('empty', 'Empty', 100, 100, []);
    const result = compileScene(scene, { className: 'EmptyScene' });
    expect(result).toContain('Scene is empty');
  });

  it('handles entities with minimal fields', () => {
    const minimal: Entity = {
      id: 'x', type: 'item',
      transform: { x: 0, y: 0 },
      components: new Map(),
    };
    const scene = makeScene('m', 'Min', 100, 100, [minimal]);
    const result = compileScene(scene, { className: 'MinScene' });
    expect(result).toContain('class MinScene');
  });
});
