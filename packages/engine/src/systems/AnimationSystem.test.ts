/**
 * @clawgame/engine - AnimationSystem tests
 */

import { describe, it, expect } from 'vitest';
import { AnimationSystem } from './AnimationSystem';
import { Entity, Scene, AnimationComponent } from '../types';
import { EventBus } from '../EventBus';

function makeEntity(id: string, anim: AnimationComponent): Entity {
  return {
    id,
    transform: { x: 0, y: 0 },
    components: new Map([['animation', anim]]),
  };
}

function makeScene(entities: Entity[]): Scene {
  const map = new Map<string, Entity>();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

describe('AnimationSystem', () => {
  it('does nothing for entities without animation component', () => {
    const sys = new AnimationSystem();
    const entity: Entity = {
      id: 'e1',
      transform: { x: 0, y: 0 },
      components: new Map(),
    };
    const scene = makeScene([entity]);
    sys.update(scene, 0.1);
    expect(true).toBe(true); // no crash
    sys.destroy();
  });

  it('sets currentFrame to 0 for single-frame animation', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['idle'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.2);
    expect(anim.currentFrame).toBe(0);
    sys.destroy();
  });

  it('advances frames based on frameRate and deltaTime', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1', 'f2'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // 0.1s at 10fps → advance 1 frame
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    // Another 0.1s → advance to frame 2
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(2);

    sys.destroy();
  });

  it('loops back to frame 0 when loop is true', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // 0.2s at 10fps = 2 frames → wraps to 0
    sys.update(scene, 0.2);
    expect(anim.currentFrame).toBe(0);

    // Another 0.1s → frame 1
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    sys.destroy();
  });

  it('clamps to last frame when loop is false', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1', 'f2'], frameRate: 10, loop: false };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // 0.5s at 10fps = 5 frames → clamped to index 2
    sys.update(scene, 0.5);
    expect(anim.currentFrame).toBe(2);
    sys.destroy();
  });

  it('emits animation:complete when non-looping animation finishes', () => {
    const sys = new AnimationSystem();
    const bus = new EventBus();
    sys.attach(bus);

    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: false };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    const events: any[] = [];
    bus.on('animation:complete', (data: any) => events.push(data));

    sys.update(scene, 0.5);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].entityId).toBe('e1');
    expect(events[0].animation.frames).toEqual(['f0', 'f1']);

    sys.destroy();
  });

  it('does not emit animation:complete for looping animations', () => {
    const sys = new AnimationSystem();
    const bus = new EventBus();
    sys.attach(bus);

    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    const events: any[] = [];
    bus.on('animation:complete', (data: any) => events.push(data));

    // Multiple wraps
    for (let i = 0; i < 10; i++) {
      sys.update(scene, 0.2);
    }
    expect(events.length).toBe(0);

    sys.destroy();
  });

  it('resets entity state via resetEntity', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    sys.resetEntity('e1');
    // After reset, next update starts fresh elapsed tracking
    sys.update(scene, 0.05);
    // 0.05s at 10fps = 0.5 frames → no advance yet
    expect(anim.currentFrame).toBe(1);

    sys.destroy();
  });

  it('resets all state via reset', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.1);
    sys.reset();
    sys.update(scene, 0.05);
    expect(anim.currentFrame).toBe(1); // no advance with 0.05s

    sys.destroy();
  });

  it('handles empty frames array gracefully', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: [], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.5);
    expect(anim.currentFrame).toBeUndefined();

    sys.destroy();
  });

  it('handles high deltaTime without over-advancing (loop)', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['a', 'b', 'c'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // 1 second at 10fps = 10 frames on a 3-frame animation → wraps
    sys.update(scene, 1.0);
    expect(anim.currentFrame).toBe(10 % 3); // 1

    sys.destroy();
  });
});
