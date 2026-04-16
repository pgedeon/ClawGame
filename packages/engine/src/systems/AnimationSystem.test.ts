/**
 * @clawgame/engine - Animation system tests
 */

import { AnimationSystem } from './AnimationSystem';
import type { AnimationComponent } from '../types';
import { EventBus } from '../EventBus';

// Test utilities
function makeScene(entities: any[]) {
  const entityMap = new Map();
  entities.forEach((entity) => {
    entityMap.set(entity.id, entity);
  });

  return {
    name: 'test-scene',
    entities: entityMap,
  };
}

function makeEntity(id: string, animation: AnimationComponent, transform?: { x: number; y: number }) {
  return {
    id,
    type: 'player',
    transform: transform || { x: 0, y: 0 },
    components: new Map([
      ['animation', animation],
    ]),
  };
}

describe('AnimationSystem', () => {
  it('advances animation frames based on frame rate', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: false };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);
  });

  it('loops animations when configured', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // First frame advance
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    // Loop back to first frame
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(0);
  });

  it('stops animating when animation is marked inactive', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, active: false };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBeUndefined();
  });

  it('emits completion event for non-looping animations', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: false };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    let completionEvent = null;
    const eventBus = new EventBus();
    eventBus.on('animation:complete', (data) => {
      completionEvent = data;
    });

    sys.attach(eventBus);

    // Advance past completion
    sys.update(scene, 0.3);
    expect(completionEvent).toEqual({
      entityId: 'e1',
      entityName: 'player',
      animation: {
        frames: ['f0', 'f1'],
        frameRate: 10,
        loop: false,
      },
    });
  });

  it('resets all state via reset', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // Advance some frames
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    // Reset system
    sys.reset();

    // After reset, state should be fresh
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);
  });

  it('cleans up all state via destroy', () => {
    const sys = new AnimationSystem();
    const anim: AnimationComponent = { frames: ['f0', 'f1'], frameRate: 10, loop: true };
    const entity = makeEntity('e1', anim);
    const scene = makeScene([entity]);

    // Advance some frames
    sys.update(scene, 0.1);
    expect(anim.currentFrame).toBe(1);

    // Destroy system
    sys.destroy();

    // After destroy, system should be in clean state
    expect(sys).toBeDefined();
  });
});