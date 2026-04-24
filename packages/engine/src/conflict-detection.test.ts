import { describe, expect, it } from 'vitest';
import { detectCompilerConflicts, compileScene, extractUserRegions, USER_CODE_MARKERS } from '../src/scene-compiler';
import type { Scene, Entity } from '../src/types';

function makeScene(name: string, entities: Entity[]): Scene {
  return { name, entities: new Map(entities.map((e) => [e.id, e])) };
}

describe('detectCompilerConflicts', () => {
  it('detects missing markers in existing code', () => {
    const existing = 'class MyScene extends Phaser.Scene { create() { this.add.sprite(0,0,"x"); console.log("a longer code block that exceeds threshold"); } }';
    const conflicts = detectCompilerConflicts(existing, existing);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].type).toBe('missing_marker');
    expect(conflicts[0].severity).toBe('warning');
  });

  it('detects overlapping user regions', () => {
    const existing = 'class S extends Phaser.Scene { create() { // <BEGIN USER_CREATE> custom code // <END USER_CREATE> } }';
    const newCode = 'class S extends Phaser.Scene { create() { this.add.sprite(0,0,"x"); } }';
    const conflicts = detectCompilerConflicts(existing, newCode);
    expect(conflicts.some((c) => c.type === 'overlap')).toBe(true);
    expect(conflicts.some((c) => c.severity === 'error')).toBe(true);
  });

  it('no conflicts when markers preserved', () => {
    const markers = Object.values(USER_CODE_MARKERS);
    const markerBlocks = markers.map((m) => `// <BEGIN ${m}>  // <END ${m}>`).join('\n');
    const code = `class S { create() { ${markerBlocks} } }`;
    const conflicts = detectCompilerConflicts(code, code);
    expect(conflicts.length).toBe(0);
  });

  it('compiled code contains user markers', () => {
    const entity: Entity = {
      id: 'e1', type: 'player',
      transform: { x: 0, y: 0 },
      components: new Map([['sprite', { assetId: 'hero' }]]),
    };
    const scene = makeScene('Test', [entity]);
    const code = compileScene(scene, {
      className: 'TestScene',
      userRegions: {
        USER_CREATE: '// my custom code',
        USER_UPDATE: '// my update',
      },
    });
    expect(code).toContain('USER_CREATE');
    expect(code).toContain('my custom code');
    expect(code).toContain('USER_UPDATE');
    const regions = extractUserRegions(code);
    expect(regions.USER_CREATE).toContain('my custom code');
  });
});
