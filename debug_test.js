const { AnimationStateMachineSystem } = require('./packages/engine/src/systems/AnimationStateMachineSystem.ts');

// Create a simple debug test
function makeEntity(id) {
  return {
    id,
    transform: { x: 0, y: 0 },
    components: new Map(),
  };
}

function makeScene(entities) {
  const map = new Map();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

// Test delayed transitions
const sys = new AnimationStateMachineSystem();
const entity = makeEntity('player1');

// Create custom state machine with delayed transition
const stateMachine = {
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

console.log('=== Initial state ===');
console.log('Current state:', stateMachine.currentState);

// First update: 0.4s elapsed - condition not yet met
console.log('\n=== First update: 0.4s ===');
sys.update(makeScene([entity]), 0.4);
console.log('Current state:', stateMachine.currentState);

// Second update: additional 0.2s = 0.6s total - condition met, delay should trigger (but queue it)
console.log('\n=== Second update: 0.2s ===');
sys.update(makeScene([entity]), 0.2);
console.log('Current state:', stateMachine.currentState);

// Third update: additional 0.2s = 0.8s total - queued transition should now execute
console.log('\n=== Third update: 0.2s ===');
sys.update(makeScene([entity]), 0.2);
console.log('Current state:', stateMachine.currentState);

console.log('\n=== Final state ===');
console.log('Expected: attack');
console.log('Actual:', stateMachine.currentState);