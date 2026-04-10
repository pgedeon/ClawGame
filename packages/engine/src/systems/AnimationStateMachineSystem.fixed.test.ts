import { describe, it, expect } from 'vitest';
import { AnimationStateMachineSystem } from './AnimationStateMachineSystem';
import { Entity, Scene, AnimationStateMachineComponent } from '../types';
import { EventBus } from '../EventBus';

function makeEntity(id: string): Entity {
  return {
    id,
    transform: { x: 0, y: 0 },
    components: new Map(),
  };
}

function makeScene(entities: Entity[]): Scene {
  const map = new Map<string, Entity>();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

describe('AnimationStateMachineSystem - Fixed Delayed Transitions', () => {
  it('handles delayed transitions with exact timing', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create simple state machine with delayed transition
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'attack',
            conditions: [{ type: 'timer', operator: '>=', value: 0.5 }],
            delay: 0.1  // Shorter delay for testing
          }]
        },
        attack: {
          name: 'attack',
          animation: { frames: ['attack'], frameRate: 10, loop: false },
          canLoop: false,
          transitions: []
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.idle.animation);
    
    console.log('=== Initial state ===');
    console.log('Current state:', stateMachine.currentState);
    
    // First update: 0.4s elapsed - condition not yet met
    sys.update(makeScene([entity]), 0.4);
    console.log('After 0.4s update - current state:', stateMachine.currentState);
    expect(stateMachine.currentState).toBe('idle');
    
    // Second update: additional 0.1s = 0.5s total - condition met, transition queued with 0.1s delay
    sys.update(makeScene([entity]), 0.1);
    console.log('After 0.1s update (total 0.5s) - current state:', stateMachine.currentState);
    expect(stateMachine.currentState).toBe('idle'); // Should still be idle because transition is queued
    
    // Third update: additional 0.1s = 0.6s total - queued transition should now execute
    sys.update(makeScene([entity]), 0.1);
    console.log('After 0.1s update (total 0.6s) - current state:', stateMachine.currentState);
    expect(stateMachine.currentState).toBe('attack'); // Should now be in attack
    
    sys.destroy();
  });

  it('handles delayed transitions with larger delta', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'attack',
            conditions: [{ type: 'timer', operator: '>=', value: 0.5 }],
            delay: 0.1
          }]
        },
        attack: {
          name: 'attack',
          animation: { frames: ['attack'], frameRate: 10, loop: false },
          canLoop: false,
          transitions: []
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.idle.animation);
    
    // First update: 0.6s elapsed - condition met immediately, transition queued with 0.1s delay
    sys.update(makeScene([entity]), 0.6);
    console.log('After 0.6s update - current state:', stateMachine.currentState);
    expect(stateMachine.currentState).toBe('idle'); // Should still be idle because transition is queued
    
    // Second update: additional 0.1s = 0.7s total - queued transition should now execute
    sys.update(makeScene([entity]), 0.1);
    console.log('After 0.1s update (total 0.7s) - current state:', stateMachine.currentState);
    expect(stateMachine.currentState).toBe('attack'); // Should now be in attack
    
    sys.destroy();
  });
});