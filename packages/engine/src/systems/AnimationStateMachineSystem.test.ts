/**
 * @clawgame/engine - AnimationStateMachineSystem tests
 */

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

describe('AnimationStateMachineSystem', () => {
  it('does nothing for entities without animationStateMachine component', () => {
    const sys = new AnimationStateMachineSystem();
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

  it('sets up character with basic states', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    sys.setupCharacter(entity, 'warrior');
    
    const stateMachine = entity.components.get('animationStateMachine') as AnimationStateMachineComponent;
    expect(stateMachine).toBeTruthy();
    expect(stateMachine.currentState).toBe('idle');
    expect(stateMachine.states.idle).toBeTruthy();
    expect(stateMachine.states.walk).toBeTruthy();
    expect(stateMachine.states.attack).toBeTruthy();
    expect(stateMachine.active).toBe(true);
    
    const anim = entity.components.get('animation');
    expect(anim).toBeTruthy();
    expect((anim as any).frames).toEqual(['idle1', 'idle2', 'idle3']);
    expect((anim as any).currentFrame).toBe(0);
    
    sys.destroy();
  });

  it('transitions from idle to walk when right arrow is pressed', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    sys.setupCharacter(entity);
    
    // Mock player input component
    const inputComponent = { keys: { ArrowRight: false } };
    entity.components.set('playerInput', inputComponent);
    
    const stateMachine = entity.components.get('animationStateMachine') as AnimationStateMachineComponent;
    
    // Press right arrow
    (inputComponent as any).keys.ArrowRight = true;
    
    sys.update(makeScene([entity]), 0.1);
    
    expect(stateMachine.currentState).toBe('walk');
    const anim = entity.components.get('animation') as any;
    expect(anim.frames).toEqual(['walk1', 'walk2', 'walk3', 'walk4']);
    
    sys.destroy();
  });

  it('transitions from walk to idle when arrow key is released', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    sys.setupCharacter(entity);
    
    // Start in walk state
    const stateMachine = entity.components.get('animationStateMachine') as AnimationStateMachineComponent;
    stateMachine.currentState = 'walk';
    
    // Mock player input
    const inputComponent = { keys: { ArrowRight: true } };
    entity.components.set('playerInput', inputComponent);
    
    // Release arrow key
    (inputComponent as any).keys.ArrowRight = false;
    
    sys.update(makeScene([entity]), 0.1);
    
    expect(stateMachine.currentState).toBe('idle');
    
    sys.destroy();
  });

  it('does not advance animation frames (that is AnimationSystem\'s job)', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    sys.setupCharacter(entity);
    
    const stateMachine = entity.components.get('animationStateMachine') as AnimationStateMachineComponent;
    const anim = entity.components.get('animation') as any;
    
    // Initially at frame 0
    expect(anim.currentFrame).toBe(0);
    
    // Call system update multiple times
    for (let i = 0; i < 6; i++) {
      sys.update(makeScene([entity]), 0.1);
    }
    
    // AnimationStateMachineSystem should not advance frames
    // Frame advancement is handled by AnimationSystem
    expect(anim.currentFrame).toBe(0);
    
    sys.destroy();
  });

  it('handles attack state with spacebar trigger', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create custom state machine with attack trigger
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'attack',
            conditions: [
              { type: 'input', params: { key: ' ' }, operator: '=', value: true }
            ]
          }]
        },
        attack: {
          name: 'attack',
          animation: { frames: ['attack1', 'attack2', 'attack3'], frameRate: 10, loop: false },
          canLoop: false,
          transitions: [{
            to: 'idle',
            conditions: [
              { type: 'state', operator: '=', value: 'attack' },
              { type: 'timer', operator: '>=', value: 0.3 }
            ]
          }]
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.idle.animation);
    
    // Mock player input
    const inputComponent = { keys: { ' ': false } };
    entity.components.set('playerInput', inputComponent);
    
    // Trigger attack with spacebar
    (inputComponent as any).keys[' '] = true;
    sys.update(makeScene([entity]), 0.1);
    
    expect(stateMachine.currentState).toBe('attack');
    const anim = entity.components.get('animation') as any;
    expect(anim.frames).toEqual(['attack1', 'attack2', 'attack3']);
    
    // AnimationStateMachineSystem should reset to frame 0 when entering attack state
    expect(anim.currentFrame).toBe(0);
    
    sys.destroy();
  });

  it('handles delayed transitions', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create custom state machine with delayed transition
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
            delay: 0.2
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
    
    // First update: 0.4s elapsed - condition not yet met
    sys.update(makeScene([entity]), 0.4);
    
    // Should still be in idle (0.4s < 0.5s condition)
    expect(stateMachine.currentState).toBe('idle');
    
    // Second update: additional 0.2s = 0.6s total - condition met, transition queued with 0.2s delay
    sys.update(makeScene([entity]), 0.2);
    
    // Should still be in idle because the transition is queued with 0.2s delay
    expect(stateMachine.currentState).toBe('idle');
    
    // Third update: additional 0.2s = 0.8s total - queued transition should now execute
    sys.update(makeScene([entity]), 0.2);
    
    // Should now be in attack (0.5s condition met + 0.2s delay + 0.2s execution = 0.9s total)
    expect(stateMachine.currentState).toBe('attack');
    
    sys.destroy();
  });

  it('emits state change events', () => {
    const sys = new AnimationStateMachineSystem();
    const bus = new EventBus();
    sys.attach(bus);

    const entity = makeEntity('player1');
    sys.setupCharacter(entity);
    
    const events: any[] = [];
    bus.on('animation:statechange', (data: any) => events.push(data));

    const inputComponent = { keys: { ArrowRight: false } };
    entity.components.set('playerInput', inputComponent);
    
    // Trigger transition
    (inputComponent as any).keys.ArrowRight = true;
    sys.update(makeScene([entity]), 0.1);
    
    expect(events.length).toBe(1);
    expect(events[0].entityId).toBe('player1');
    expect(events[0].fromState).toBe('idle');
    expect(events[0].toState).toBe('walk');
    
    sys.destroy();
  });

  it('supports random transitions', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create state machine with random transition
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'walk',
            conditions: [{ type: 'random', value: 1.0 }] // 100% chance
          }]
        },
        walk: {
          name: 'walk',
          animation: { frames: ['walk'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: []
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.idle.animation);
    
    sys.update(makeScene([entity]), 0.1);
    
    // Should transition to walk since random chance is 100%
    expect(stateMachine.currentState).toBe('walk');
    
    sys.destroy();
  });

  it('handles health-based transitions', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create state machine with health transition
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'healthy',
      states: {
        healthy: {
          name: 'healthy',
          animation: { frames: ['healthy'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'hurt',
            conditions: [{ type: 'health', operator: '<', value: 50 }]
          }]
        },
        hurt: {
          name: 'hurt',
          animation: { frames: ['hurt'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: []
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.healthy.animation);
    entity.components.set('stats', { health: 100 });
    
    sys.update(makeScene([entity]), 0.1);
    
    // Should still be healthy (health > 50)
    expect(stateMachine.currentState).toBe('healthy');
    
    // Reduce health
    const stats = entity.components.get('stats') as any;
    stats.health = 30;
    
    sys.update(makeScene([entity]), 0.1);
    
    // Should now be hurt (health < 50)
    expect(stateMachine.currentState).toBe('hurt');
    
    sys.destroy();
  });

  it('resets entity state properly', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    sys.setupCharacter(entity);
    
    const stateMachine = entity.components.get('animationStateMachine') as AnimationStateMachineComponent;
    const anim = entity.components.get('animation') as any;
    
    // Use the system for a bit to build up state
    const inputComponent = { keys: { ArrowRight: true } };
    entity.components.set('playerInput', inputComponent);
    sys.update(makeScene([entity]), 0.2);
    
    // Verify state was changed
    expect(stateMachine.currentState).toBe('walk');
    
    // Reset entity
    sys.resetEntity('player1');
    
    // Verify internal state is cleared
    expect(sys['stateTimer'].get('player1')).toBeUndefined();
    
    sys.destroy();
  });

  it('handles unknown condition types gracefully', () => {
    const sys = new AnimationStateMachineSystem();
    const entity = makeEntity('player1');
    
    // Create state machine with unknown condition type
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'walk',
            conditions: [{ type: 'unknown' as any }]
          }]
        },
        walk: {
          name: 'walk',
          animation: { frames: ['walk'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: []
        }
      },
      active: true,
    };
    
    entity.components.set('animationStateMachine', stateMachine);
    entity.components.set('animation', stateMachine.states.idle.animation);
    
    // Should not crash and stay in idle
    sys.update(makeScene([entity]), 0.1);
    expect(stateMachine.currentState).toBe('idle');
    
    sys.destroy();
  });
});