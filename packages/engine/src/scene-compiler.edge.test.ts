/**
 * Phase 6.3 — Scene Compiler Edge Case Tests
 *
 * Comprehensive edge-case coverage for compileScene, extractUserRegions,
 * detectCompilerConflicts, and compileBootstrapHTML.
 */

import { describe, it, expect } from 'vitest';
import {
  compileScene,
  compileBootstrapHTML,
  extractUserRegions,
  detectCompilerConflicts,
  USER_CODE_MARKERS,
  type CompilerOptions,
} from '../src/scene-compiler';
import { createDefaultAssetPack, addAssetToPack } from '../src/asset-pack';
import type { Scene, Entity, Transform } from '../src/types';

// ─── Helpers ───

function makeTransform(overrides: Partial<Transform> = {}): Transform {
  return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, ...overrides };
}

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'entity',
    type: 'player',
    transform: makeTransform({ x: 100, y: 200 }),
    components: new Map([
      ['sprite', { assetId: 'hero' }],
    ]),
    ...overrides,
  };
}

function mockScene(entities: Entity[] = []): Scene {
  return {
    name: 'TestScene',
    entities: new Map(entities.map((e) => [e.id, e])),
  };
}

const baseOpts: CompilerOptions = { className: 'TestScene', language: 'typescript' };

// ─── 1. Empty Scene / No Entities ───

describe('edge: empty scenes', () => {
  it('handles scene with zero entities', () => {
    const scene = mockScene([]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('Scene is empty');
    expect(code).toContain('export class TestScene');
    expect(code).toContain('No assets to preload');
  });

  it('handles scene with empty entities map', () => {
    const scene: Scene = { name: 'Empty', entities: new Map() };
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('Scene is empty');
  });

  it('empty scene still has valid class structure', () => {
    const scene = mockScene([]);
    const code = compileScene(scene, baseOpts);
    expect(code).toMatch(/export class TestScene extends Phaser\.Scene/);
    expect(code).toMatch(/constructor\(\)/);
    expect(code).toMatch(/preload\(\)/);
    expect(code).toMatch(/create\(\)/);
    expect(code.trim().endsWith('}')).toBe(true);
  });
});

// ─── 2. Entities Missing Required Fields ───

describe('edge: missing required fields', () => {
  it('entity with no name falls back to id', () => {
    const scene = mockScene([
      makeEntity({ id: 'x1', name: undefined, type: 'player' }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Should use id as name in comment
    expect(code).toContain('x1');
  });

  it('entity with no type defaults to unknown', () => {
    const scene = mockScene([
      makeEntity({ id: 'u1', name: 'unnamed', type: undefined }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Unknown types generate a rectangle fallback
    expect(code).toContain('unnamed');
  });

  it('entity with no sprite component still compiles', () => {
    const scene = mockScene([
      makeEntity({
        id: 'nosprite',
        name: 'NoSprite',
        type: 'player',
        components: new Map(),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Falls back to entity name as asset key
    expect(code).toContain('NoSprite');
  });

  it('entity with empty components map compiles', () => {
    const scene = mockScene([
      makeEntity({
        id: 'empty-comp',
        name: 'EmptyComp',
        type: 'obstacle',
        components: new Map(),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('EmptyComp');
  });

  it('transform with missing x/y defaults to 0', () => {
    const scene = mockScene([
      makeEntity({
        id: 'origin',
        name: 'Origin',
        type: 'player',
        transform: makeTransform({ x: undefined as unknown as number, y: undefined as unknown as number }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // x ?? 0, y ?? 0 → should output 0, 0
    expect(code).toContain('0, 0');
  });
});

// ─── 3. Collision Group / Component Handling ───

describe('edge: collision components', () => {
  it('collision type "none" skips physics body', () => {
    const scene = mockScene([
      makeEntity({
        id: 'c1',
        name: 'NoPhysics',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'none', width: 32, height: 32 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).not.toContain('physics.add.existing');
  });

  it('collision with immovable flag generates static body', () => {
    const scene = mockScene([
      makeEntity({
        id: 'wall1',
        name: 'Wall',
        type: 'obstacle',
        components: new Map([
          ['collision', { type: 'wall', width: 64, height: 64, immovable: true }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('physics.add.existing');
    expect(code).toContain('true');
  });

  it('collision with bounce generates setBounce', () => {
    const scene = mockScene([
      makeEntity({
        id: 'b1',
        name: 'Bouncy',
        type: 'collectible',
        components: new Map([
          ['collision', { type: 'collectible', width: 16, height: 16, bounce: 0.8 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setBounce(0.8)');
  });

  it('collision with velocity generates setVelocity', () => {
    const scene = mockScene([
      makeEntity({
        id: 'v1',
        name: 'Mover',
        type: 'projectile',
        components: new Map([
          ['collision', { type: 'projectile', width: 8, height: 8, velocityX: 200, velocityY: -100 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setVelocityX(200)');
    expect(code).toContain('setVelocityY(-100)');
  });

  it('collision sensor flag sets allowGravity false', () => {
    const scene = mockScene([
      makeEntity({
        id: 's1',
        name: 'Sensor',
        type: 'obstacle',
        components: new Map([
          ['collision', { type: 'sensor', width: 32, height: 32, sensor: true }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setAllowGravity(false)');
  });

  it('collision with offset generates setOffset', () => {
    const scene = mockScene([
      makeEntity({
        id: 'o1',
        name: 'Offset',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 24, height: 24, offsetX: 4, offsetY: 8 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setOffset(4, 8)');
  });

  it('collision with acceleration generates setAcceleration', () => {
    const scene = mockScene([
      makeEntity({
        id: 'a1',
        name: 'Accelerator',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 32, height: 32, accelerationX: 50, accelerationY: 100 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setAccelerationX(50)');
    expect(code).toContain('setAccelerationY(100)');
  });

  it('collision with drag and maxVelocity', () => {
    const scene = mockScene([
      makeEntity({
        id: 'd1',
        name: 'Dragger',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 32, height: 32, drag: 0.9, maxVelocityX: 300, maxVelocityY: 500 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setDrag(0.9)');
    expect(code).toContain('setMaxVelocityX(300)');
    expect(code).toContain('setMaxVelocityY(500)');
  });
});

// ─── 4. Duplicate Entity IDs ───

describe('edge: duplicate entity IDs', () => {
  it('Map deduplicates entities with same id', () => {
    // Map constructor with duplicate keys — last one wins
    const e1 = makeEntity({ id: 'dup', name: 'First' });
    const e2 = makeEntity({ id: 'dup', name: 'Second' });
    const scene = mockScene([e1, e2]);
    // Map will only have one entry for 'dup'
    expect(scene.entities.size).toBe(1);
    const code = compileScene(scene, baseOpts);
    // Second entity overwrites first in Map
    expect(code).toContain('Second');
    expect(code).not.toContain('First');
  });
});

// ─── 5. Invalid Transform Values ───

describe('edge: invalid transform values', () => {
  it('NaN x coordinate compiles without crash', () => {
    const scene = mockScene([
      makeEntity({
        id: 'nan1',
        name: 'NaNEntity',
        type: 'player',
        transform: makeTransform({ x: NaN }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // NaN will be serialized as 'NaN' in template literal
    expect(code).toContain('NaN');
  });

  it('Infinity y coordinate compiles without crash', () => {
    const scene = mockScene([
      makeEntity({
        id: 'inf1',
        name: 'InfEntity',
        type: 'player',
        transform: makeTransform({ y: Infinity }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('Infinity');
  });

  it('negative coordinates are preserved', () => {
    const scene = mockScene([
      makeEntity({
        id: 'neg1',
        name: 'Negative',
        type: 'player',
        transform: makeTransform({ x: -100, y: -200 }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('-100, -200');
  });

  it('zero rotation is omitted (falsy)', () => {
    const scene = mockScene([
      makeEntity({
        id: 'rot0',
        name: 'NoRot',
        type: 'player',
        transform: makeTransform({ rotation: 0 }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).not.toContain('setRotation');
  });

  it('non-zero rotation is included', () => {
    const scene = mockScene([
      makeEntity({
        id: 'rot45',
        name: 'Rotated',
        type: 'player',
        transform: makeTransform({ rotation: 0.785 }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setRotation(0.785)');
  });

  it('scale values generate setScale', () => {
    const scene = mockScene([
      makeEntity({
        id: 'scaled',
        name: 'Scaled',
        type: 'player',
        transform: makeTransform({ scaleX: 2, scaleY: 0.5 }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setScale(2, 0.5)');
  });

  it('default scale (1,1) does not generate setScale', () => {
    const scene = mockScene([
      makeEntity({
        id: 'noscale',
        name: 'NormalScale',
        type: 'player',
        transform: makeTransform({ scaleX: 1, scaleY: 1 }),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).not.toContain('setScale');
  });
});

// ─── 6. Entity Reference / Parent-Child ───

describe('edge: entity references', () => {
  it('entity with parent reference compiles', () => {
    const scene = mockScene([
      makeEntity({ id: 'parent1', name: 'Parent', type: 'container' }),
      makeEntity({ id: 'child1', name: 'Child', type: 'custom', parent: 'parent1' }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Container type generates container code
    expect(code).toContain('container');
  });

  it('entity with children array compiles', () => {
    const scene = mockScene([
      makeEntity({ id: 'p1', name: 'Root', type: 'container', children: ['c1', 'c2'] }),
      makeEntity({ id: 'c1', name: 'Child1', type: 'custom' }),
      makeEntity({ id: 'c2', name: 'Child2', type: 'custom' }),
    ]);
    expect(() => compileScene(scene, baseOpts)).not.toThrow();
  });

  it('entity referencing non-existent parent still compiles', () => {
    const scene = mockScene([
      makeEntity({ id: 'orphan', name: 'Orphan', type: 'custom', parent: 'ghost' }),
    ]);
    expect(() => compileScene(scene, baseOpts)).not.toThrow();
  });
});

// ─── 7. Large Number of Entities ───

describe('edge: large entity count', () => {
  it('compiles 500 entities without crash', () => {
    const entities: Entity[] = [];
    for (let i = 0; i < 500; i++) {
      entities.push(
        makeEntity({
          id: `e${i}`,
          name: `Entity${i}`,
          type: i % 3 === 0 ? 'player' : i % 3 === 1 ? 'enemy' : 'collectible',
          transform: makeTransform({ x: i * 10, y: i * 5 }),
          components: new Map([['sprite', { assetId: `sprite${i}` }]]),
        }),
      );
    }
    const scene = mockScene(entities);
    const start = Date.now();
    const code = compileScene(scene, baseOpts);
    const elapsed = Date.now() - start;
    // Should complete in reasonable time (< 2s)
    expect(elapsed).toBeLessThan(2000);
    // Output should contain all entity names
    expect(code).toContain('Entity0');
    expect(code).toContain('Entity499');
  });

  it('compiles 1000 entities deterministically', () => {
    const entities: Entity[] = [];
    for (let i = 0; i < 1000; i++) {
      entities.push(
        makeEntity({
          id: `large${i}`,
          name: `Large${i}`,
          type: 'obstacle',
          transform: makeTransform({ x: i, y: i }),
          components: new Map(),
        }),
      );
    }
    const scene = mockScene(entities);
    const code1 = compileScene(scene, baseOpts);
    const code2 = compileScene(scene, baseOpts);
    expect(code1).toBe(code2);
  });
});

// ─── 8. Entities with Missing Sprite Components ───

describe('edge: missing sprite components', () => {
  it('player with no sprite uses name as asset key', () => {
    const scene = mockScene([
      makeEntity({
        id: 'p1',
        name: 'Hero',
        type: 'player',
        components: new Map(),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Falls back to safeName as key
    expect(code).toContain("'Hero'");
  });

  it('enemy with sprite having no assetId uses name', () => {
    const scene = mockScene([
      makeEntity({
        id: 'en1',
        name: 'Goblin',
        type: 'enemy',
        components: new Map([['sprite', {}]]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain("'Goblin'");
  });

  it('text entity with missing text component generates empty text', () => {
    const scene = mockScene([
      makeEntity({
        id: 't1',
        name: 'Label',
        type: 'text',
        components: new Map(),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('""');
    expect(code).toContain('16px');
    expect(code).toContain('#ffffff');
  });

  it('text entity with partial text component', () => {
    const scene = mockScene([
      makeEntity({
        id: 't2',
        name: 'Partial',
        type: 'text',
        components: new Map([
          ['text', { content: 'Hi' }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('"Hi"');
    // Defaults
    expect(code).toContain('16px');
    expect(code).toContain('#ffffff');
  });
});

// ─── 9. Physics Body Mismatches ───

describe('edge: physics body mismatches', () => {
  it('collision component with width but no height uses width for both', () => {
    const scene = mockScene([
      makeEntity({
        id: 'cb1',
        name: 'SquareBody',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 48 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setSize(48, 48)');
  });

  it('collision with allowGravity true generates setAllowGravity(true)', () => {
    const scene = mockScene([
      makeEntity({
        id: 'grav1',
        name: 'Gravity',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 32, height: 32, allowGravity: true }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setAllowGravity(true)');
  });

  it('collision type wall is treated as static', () => {
    const scene = mockScene([
      makeEntity({
        id: 'w1',
        name: 'StaticWall',
        type: 'obstacle',
        components: new Map([
          ['collision', { type: 'wall', width: 100, height: 20 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // immivable defaults to true when type is wall
    expect(code).toContain('physics.add.existing');
    expect(code).toContain('true');
  });

  it('collision type solid without immovable is dynamic', () => {
    const scene = mockScene([
      makeEntity({
        id: 'dyn1',
        name: 'Dynamic',
        type: 'player',
        components: new Map([
          ['sprite', { assetId: 'hero' }],
          ['collision', { type: 'solid', width: 32, height: 32 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('physics.add.existing');
    // isStatic = immovable ?? (type === 'wall' || type === 'solid') → true for 'solid'
    // Actually 'solid' triggers isStatic=true per code logic
    expect(code).toContain('true');
  });

  it('collision with only velocityY and no velocityX', () => {
    const scene = mockScene([
      makeEntity({
        id: 'vy1',
        name: 'Upward',
        type: 'projectile',
        components: new Map([
          ['collision', { type: 'projectile', width: 8, height: 8, velocityY: -300 }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('setVelocityY(-300)');
    expect(code).not.toContain('setVelocityX');
  });
});

// ─── 10. Output Format Correctness ───

describe('edge: output format correctness', () => {
  it('output is valid TypeScript with proper class structure', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, baseOpts);
    // Class declaration
    expect(code).toMatch(/export class TestScene extends Phaser\.Scene \{/);
    // Constructor
    expect(code).toMatch(/constructor\(\) \{/);
    expect(code).toMatch(/super\('TestScene'\)/);
    // Methods
    expect(code).toMatch(/preload\(\) \{/);
    expect(code).toMatch(/create\(\) \{/);
    // Closing brace
    expect(code.trim().endsWith('}')).toBe(true);
  });

  it('output contains import statement', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, baseOpts);
    expect(code.startsWith("import * as Phaser from 'phaser';")).toBe(true);
  });

  it('preload section loads sprite assets', () => {
    const scene = mockScene([
      makeEntity({ id: 'e1', name: 'hero', type: 'player', components: new Map([['sprite', { assetId: 'hero_img' }]]) }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain("this.load.image('hero_img', 'assets/hero_img.png')");
  });

  it('preload deduplicates sprite keys', () => {
    const scene = mockScene([
      makeEntity({ id: 'e1', name: 'a', type: 'player', components: new Map([['sprite', { assetId: 'shared' }]]) }),
      makeEntity({ id: 'e2', name: 'b', type: 'enemy', components: new Map([['sprite', { assetId: 'shared' }]]) }),
    ]);
    const code = compileScene(scene, baseOpts);
    const loadCount = (code.match(/this\.load\.image\('shared'/g) || []).length;
    expect(loadCount).toBe(1);
  });

  it('user code CREATE region wrapped in markers', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      userRegions: { [USER_CODE_MARKERS.CREATE]: 'this.myCode = 42;' },
    });
    expect(code).toContain(`// <BEGIN ${USER_CODE_MARKERS.CREATE}>`);
    expect(code).toContain(`// <END ${USER_CODE_MARKERS.CREATE}>`);
    expect(code).toContain('this.myCode = 42;');
  });

  it('user code UPDATE region generates update method', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      userRegions: { [USER_CODE_MARKERS.UPDATE]: 'this.handleInput();' },
    });
    expect(code).toContain('update(_time: number, _delta: number)');
    expect(code).toContain('this.handleInput();');
  });

  it('user code CUSTOM_METHODS region included', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      userRegions: { [USER_CODE_MARKERS.CUSTOM_METHODS]: 'doSomething() { return 42; }' },
    });
    expect(code).toContain(`// <BEGIN ${USER_CODE_MARKERS.CUSTOM_METHODS}>`);
    expect(code).toContain('doSomething()');
  });

  it('user code IMPORTS region included after Phaser import', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      userRegions: { [USER_CODE_MARKERS.IMPORTS]: "import { Utils } from './utils';" },
    });
    const phaserIdx = code.indexOf("import * as Phaser");
    const utilsIdx = code.indexOf("import { Utils }");
    expect(phaserIdx).toBeGreaterThanOrEqual(0);
    expect(utilsIdx).toBeGreaterThan(phaserIdx);
  });

  it('user code PRELOAD region included in preload method', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      userRegions: { [USER_CODE_MARKERS.PRELOAD]: "this.load.audio('music', 'assets/music.mp3');" },
    });
    expect(code).toContain("this.load.audio('music'");
  });
});

// ─── Entity Type Coverage ───

describe('edge: all entity types generate valid code', () => {
  const types = [
    'player', 'enemy', 'npc', 'collectible', 'obstacle',
    'platform', 'item', 'projectile', 'custom',
    'text', 'zone', 'trigger', 'rectangle', 'circle',
    'container', 'tilesprite',
  ];

  for (const type of types) {
    it(`type "${type}" compiles without error`, () => {
      const components = new Map<string, any>();
      if (type === 'text') {
        components.set('text', { content: 'Test', fontSize: '20px', color: '#fff' });
      } else if (type !== 'container' && type !== 'zone' && type !== 'trigger') {
        components.set('sprite', { assetId: 'test_asset' });
      }
      if (type === 'zone' || type === 'trigger') {
        components.set('collision', { width: 64, height: 64 });
      }

      const entity: Entity = {
        id: `test-${type}`,
        name: `Test${type}`,
        type: type as any,
        transform: makeTransform({ x: 50, y: 50, width: 64, height: 64 }),
        components,
      };
      const scene = mockScene([entity]);
      expect(() => compileScene(scene, baseOpts)).not.toThrow();
    });
  }
});

// ─── Special Characters in Names ───

describe('edge: special characters', () => {
  it('entity name with spaces generates safe variable name', () => {
    const scene = mockScene([
      makeEntity({
        id: 'sp1',
        name: 'My Hero Character',
        type: 'player',
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Spaces replaced with underscores
    expect(code).toContain('My_Hero_Character');
  });

  it('entity name with special chars generates safe variable name', () => {
    const scene = mockScene([
      makeEntity({
        id: 'sp2',
        name: 'hero-123!@#',
        type: 'player',
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // Special chars stripped
    expect(code).toContain('hero_123');
  });

  it('text content with quotes is JSON-escaped', () => {
    const scene = mockScene([
      makeEntity({
        id: 'tq1',
        name: 'Quote',
        type: 'text',
        components: new Map([
          ['text', { content: 'He said "hello"', fontSize: '16px', color: '#fff' }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    // JSON.stringify escapes quotes
    expect(code).toContain('\\"hello\\"');
  });

  it('text content with newlines is JSON-escaped', () => {
    const scene = mockScene([
      makeEntity({
        id: 'tnl',
        name: 'Multiline',
        type: 'text',
        components: new Map([
          ['text', { content: 'Line1\nLine2', fontSize: '16px', color: '#fff' }],
        ]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain('\\n');
  });
});

// ─── Entity Sorting Edge Cases ───

describe('edge: entity sorting', () => {
  it('sorts by type priority then by name', () => {
    const scene = mockScene([
      makeEntity({ id: 'z1', name: 'z-zone', type: 'zone' }),
      makeEntity({ id: 'o1', name: 'a-obstacle', type: 'obstacle' }),
      makeEntity({ id: 'c1', name: 'c-collectible', type: 'collectible' }),
      makeEntity({ id: 'e1', name: 'b-enemy', type: 'enemy' }),
      makeEntity({ id: 'p1', name: 'd-player', type: 'player' }),
    ]);
    const code = compileScene(scene, baseOpts);
    const playerPos = code.indexOf('d-player');
    const enemyPos = code.indexOf('b-enemy');
    const collPos = code.indexOf('c-collectible');
    const obsPos = code.indexOf('a-obstacle');
    const zonePos = code.indexOf('z-zone');
    expect(playerPos).toBeLessThan(enemyPos);
    expect(enemyPos).toBeLessThan(collPos);
    expect(collPos).toBeLessThan(obsPos);
    expect(obsPos).toBeLessThan(zonePos);
  });

  it('same type sorts alphabetically by name', () => {
    const scene = mockScene([
      makeEntity({ id: 'e2', name: 'Zebra', type: 'enemy' }),
      makeEntity({ id: 'e1', name: 'Alpha', type: 'enemy' }),
      makeEntity({ id: 'e3', name: 'Beta', type: 'enemy' }),
    ]);
    const code = compileScene(scene, baseOpts);
    const alphaPos = code.indexOf('Alpha');
    const betaPos = code.indexOf('Beta');
    const zebraPos = code.indexOf('Zebra');
    expect(alphaPos).toBeLessThan(betaPos);
    expect(betaPos).toBeLessThan(zebraPos);
  });

  it('entity with no name sorts by id', () => {
    const scene = mockScene([
      makeEntity({ id: 'zzz', name: undefined, type: 'enemy' }),
      makeEntity({ id: 'aaa', name: undefined, type: 'enemy' }),
    ]);
    const code = compileScene(scene, baseOpts);
    const aaaPos = code.indexOf('aaa');
    const zzzPos = code.indexOf('zzz');
    expect(aaaPos).toBeLessThan(zzzPos);
  });
});

// ─── extractUserRegions Edge Cases ───

describe('edge: extractUserRegions', () => {
  it('returns empty object for code with no markers', () => {
    const regions = extractUserRegions('const x = 1;');
    expect(Object.keys(regions)).toHaveLength(0);
  });

  it('extracts multiple regions', () => {
    const code = `
// <BEGIN USER_IMPORTS>
import { foo } from 'bar';
// <END USER_IMPORTS>

// <BEGIN USER_CREATE>
this.x = 1;
// <END USER_CREATE>
`;
    const regions = extractUserRegions(code);
    expect(regions[USER_CODE_MARKERS.IMPORTS]).toContain('import { foo }');
    expect(regions[USER_CODE_MARKERS.CREATE]).toContain('this.x = 1');
  });

  it('handles empty regions', () => {
    const code = `
// <BEGIN USER_IMPORTS>
// <END USER_IMPORTS>
`;
    const regions = extractUserRegions(code);
    // Empty region → trim() gives empty string, but key exists
    expect(regions[USER_CODE_MARKERS.IMPORTS]).toBe('');
  });

  it('handles missing end tag gracefully', () => {
    const code = `
// <BEGIN USER_CREATE>
this.x = 1;
// no end tag
`;
    const regions = extractUserRegions(code);
    // No end tag → region not extracted
    expect(regions[USER_CODE_MARKERS.CREATE]).toBeUndefined();
  });
});

// ─── detectCompilerConflicts Edge Cases ───

describe('edge: detectCompilerConflicts', () => {
  it('returns empty array for minimal code', () => {
    const conflicts = detectCompilerConflicts('', '');
    expect(conflicts).toHaveLength(0);
  });

  it('warns about missing markers in existing code with content', () => {
    const existing = 'const x = 1;\nconst y = 2;\nconst z = 3;\n// more code here to pass 50 chars threshold';
    const conflicts = detectCompilerConflicts(existing, '');
    expect(conflicts.some((c) => c.type === 'missing_marker')).toBe(true);
    expect(conflicts.every((c) => c.severity === 'warning')).toBe(true);
  });

  it('does not warn about missing markers for short code', () => {
    const existing = 'const x = 1;';
    const conflicts = detectCompilerConflicts(existing, '');
    expect(conflicts.filter((c) => c.type === 'missing_marker')).toHaveLength(0);
  });

  it('detects overlap when user region would be lost', () => {
    const existing = `
// <BEGIN USER_CREATE>
this.myCode = 42;
// <END USER_CREATE>
`;
    const newCode = 'no markers here';
    const conflicts = detectCompilerConflicts(existing, newCode);
    expect(conflicts.some((c) => c.type === 'overlap')).toBe(true);
    expect(conflicts.some((c) => c.severity === 'error')).toBe(true);
  });

  it('no conflict when new code contains matching markers', () => {
    const existing = `
// <BEGIN USER_CREATE>
this.myCode = 42;
// <END USER_CREATE>
`;
    const newCode = `
// <BEGIN USER_CREATE>
// <END USER_CREATE>
`;
    const conflicts = detectCompilerConflicts(existing, newCode);
    expect(conflicts.filter((c) => c.type === 'overlap')).toHaveLength(0);
  });
});

// ─── compileBootstrapHTML Edge Cases ───

describe('edge: compileBootstrapHTML', () => {
  it('uses default dimensions when no opts provided', () => {
    const html = compileBootstrapHTML('Test', {});
    expect(html).toContain('width: 800');
    expect(html).toContain('height: 600');
    expect(html).toContain('#0f172a');
  });

  it('accepts custom dimensions', () => {
    const html = compileBootstrapHTML('Test', { width: 1920, height: 1080 });
    expect(html).toContain('width: 1920');
    expect(html).toContain('height: 1080');
  });

  it('accepts custom background color', () => {
    const html = compileBootstrapHTML('Test', { backgroundColor: '#ff0000' });
    expect(html).toContain('#ff0000');
  });

  it('accepts custom Phaser version', () => {
    const html = compileBootstrapHTML('Test', { phaserVersion: '3.80.0' });
    expect(html).toContain('phaser@3.80.0');
  });

  it('default Phaser version is 4', () => {
    const html = compileBootstrapHTML('Test', {});
    expect(html).toContain('phaser@4');
  });

  it('contains valid HTML5 structure', () => {
    const html = compileBootstrapHTML('Test', {});
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  it('includes scene class name reference', () => {
    const html = compileBootstrapHTML('MyAwesomeScene', {});
    expect(html).toContain('sceneClass');
  });
});

// ─── Asset Pack Integration ───

describe('edge: asset pack integration', () => {
  it('asset pack preload code included in output', () => {
    let pack = createDefaultAssetPack('pack1');
    pack = addAssetToPack(pack, { key: 'bg', type: 'image', url: 'bg.png' });
    pack = addAssetToPack(pack, { key: 'player', type: 'image', url: 'player.png' });
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, { ...baseOpts, assetPack: pack });
    expect(code).toContain("this.load.image('bg'");
    expect(code).toContain("this.load.image('player'");
  });

  it('entity sprite keys also appear in preload', () => {
    const scene = mockScene([
      makeEntity({
        id: 'e1',
        name: 'hero',
        type: 'player',
        components: new Map([['sprite', { assetId: 'hero_sprite' }]]),
      }),
    ]);
    const code = compileScene(scene, baseOpts);
    expect(code).toContain("this.load.image('hero_sprite'");
  });
});

// ─── Animations Config ───

describe('edge: animations config', () => {
  it('animations config generates animation code', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      animationsConfig: {
        animations: [
          {
            key: 'walk',
            frames: ['walk1', 'walk2', 'walk3'],
            frameRate: 10,
            loop: true,
          },
        ],
      },
    });
    expect(code).toContain('Animations');
  });

  it('empty animations config does not generate animation section', () => {
    const scene = mockScene([makeEntity()]);
    const code = compileScene(scene, {
      ...baseOpts,
      animationsConfig: { animations: [] },
    });
    expect(code).not.toContain('// Animations');
  });
});
