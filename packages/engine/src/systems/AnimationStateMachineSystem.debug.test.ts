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

describe('AnimationStateMachineSystem - Debug', () => {
  it('debug delayed transitions with internal state inspection', () => {
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
    
    console.log('=== Initial state ===');
    console.log('Current state:', stateMachine.currentState);
    console.log('Transition queue size:', sys['transitionQueue'].size);
    
    // First update: 0.4s elapsed - condition not yet met
    sys.update(makeScene([entity]), 0.4);
    console.log('After 0.4s update:');
    console.log('Current state:', stateMachine.currentState);
    console.log('Transition queue size:', sys['transitionQueue'].size);
    console.log('State timer for idle:', sys['stateTimer'].get('player1:idle') || 'none');
    
    // Second update: additional 0.1s = 0.5s total - condition met, transition queued with 0.1s delay
    sys.update(makeScene([entity]), 0.1);
    console.log('After 0.1s update (total 0.5s):');
    console.log('Current state:', stateMachine.currentState);
    console.log('Transition queue size:', sys['transitionQueue'].size);
    if (sys['transitionQueue'].has('player1')) {
      const queued = sys['transitionQueue'].get('player1');
      console.log('Queued transition:', queued);
    }
    console.log('State timer for idle:', sys['stateTimer'].get('player1:idle') || 'none');
    
    // Third update: additional 0.1s = 0.6s total - queued transition should now execute
    sys.update(makeScene([entity]), 0.1);
    console.log('After 0.1s update (total 0.6s):');
    console.log('Current state:', stateMachine.currentState);
    console.log('Transition queue size:', sys['transitionQueue'].size);
    console.log('State timer for idle:', sys['stateTimer'].get('player1:idle') || 'none');
    console.log('State timer for attack:', sys['stateTimer'].get('player1:attack') || 'none');
    
    expect(stateMachine.currentState).toBe('attack');
    
    sys.destroy();
  });
});