import { Entity, Scene, AnimationStateMachineComponent } from '../types';
import { EventBus } from '../EventBus';

interface TransitionQueue {
  to: string;
  delay: number;
  elapsed: number;
}

export class AnimationStateMachineSystem {
  private stateTimer = new Map<string, number>();
  private transitionQueue = new Map<string, TransitionQueue>();

  constructor(private eventBus?: EventBus) {}

  update(scene: Scene, deltaTime: number): void {
    for (const entity of scene.entities.values()) {
      this.updateEntity(entity, deltaTime);
    }
  }

  updateEntity(entity: Entity, deltaTime: number): void {
    const stateMachine = entity.components.get('animationStateMachine');
    if (!stateMachine || !stateMachine.active) {
      return;
    }

    // Handle queued transitions with delay timing
    if (this.transitionQueue.has(entity.id)) {
      const transition = this.transitionQueue.get(entity.id)!;
      transition.elapsed += deltaTime;
      
      if (transition.elapsed >= transition.delay) {
        this.changeState(entity, stateMachine, transition.to);
        this.transitionQueue.delete(entity.id);
      }
      return;
    }

    // Get current state
    const currentState = stateMachine.states[stateMachine.currentState];
    if (!currentState) return;

    // Update state timer for time-based conditions
    const stateKey = `${entity.id}:${stateMachine.currentState}`;
    this.stateTimer.set(stateKey, (this.stateTimer.get(stateKey) || 0) + deltaTime);

    // Handle animation frame looping for looping states
    if (currentState.canLoop && currentState.animation.loop) {
      this.handleFrameLooping(entity, currentState, stateKey);
    }

    // Evaluate transitions for current state
    for (const transition of currentState.transitions) {
      if (this.shouldTransition(entity, stateMachine, transition)) {
        if (transition.delay && transition.delay > 0) {
          // Queue delayed transition with elapsed time tracking
          this.transitionQueue.set(entity.id, { 
            to: transition.to, 
            delay: transition.delay,
            elapsed: 0 
          });
        } else {
          // Immediate transition
          this.changeState(entity, stateMachine, transition.to);
        }
        break;
      }
    }
  }

  private shouldTransition(entity: Entity, stateMachine: AnimationStateMachineComponent, transition: any): boolean {
    for (const condition of transition.conditions) {
      if (!this.evaluateCondition(entity, stateMachine, condition)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(entity: Entity, stateMachine: AnimationStateMachineComponent, condition: any): boolean {
    switch (condition.type) {
      case 'timer':
        const stateKey = `${entity.id}:${stateMachine.currentState}`;
        const elapsed = this.stateTimer.get(stateKey) || 0;
        return this.compare(elapsed, condition.operator || '>=', condition.value);
        
      case 'input':
        if (condition.params?.key) {
          const inputComp = entity.components.get('playerInput');
          if (inputComp) {
            const input = inputComp as any;
            const isPressed = input.keys?.[condition.params.key] || false;
            return this.compare(isPressed, condition.operator || '=', true);
          }
        }
        return false;
        
      case 'random':
        return this.compare(Math.random(), condition.operator || '<', condition.value || 1.0);
        
      case 'health':
        if (condition.params?.key) {
          const statsComp = entity.components.get('stats');
          if (statsComp) {
            const stats = statsComp as any;
            const health = stats[condition.params.key] || 0;
            return this.compare(health, condition.operator || '<', condition.value);
          }
        }
        return false;
        
      case 'state':
        if (condition.params?.key) {
          const otherStateMachine = entity.components.get('animationStateMachine');
          if (otherStateMachine) {
            const currentState = otherStateMachine.currentState;
            return this.compare(currentState, condition.operator || '=', condition.value);
          }
        }
        return false;
        
      default:
        console.warn(`Unknown animation condition type: ${condition.type}`);
        return false;
    }
  }

  private compare(a: any, operator: string, b: any): boolean {
    switch (operator) {
      case '=': return a === b;
      case '!=': return a !== b;
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      default: return false;
    }
  }

  private changeState(entity: Entity, stateMachine: AnimationStateMachineComponent, newState: string): void {
    if (stateMachine.states[newState]) {
      const previousState = stateMachine.currentState;
      stateMachine.currentState = newState;
      
      // Reset the animation component for the new state
      const animationComp = entity.components.get('animation');
      if (animationComp) {
        const anim = animationComp as any;
        const newStateData = stateMachine.states[newState].animation;
        anim.frames = newStateData.frames;
        anim.currentFrame = 0;
        anim.frameRate = newStateData.frameRate;
        anim.loop = newStateData.loop;
      }
      
      // Emit state change event
      if (this.eventBus) {
        this.eventBus.emit('animation:statechange', {
          entityId: entity.id,
          fromState: previousState,
          toState: newState,
          timestamp: performance.now()
        });
      }
    }
  }

  private handleFrameLooping(entity: Entity, currentState: any, stateKey: string): void {
    // This is a simplified version of the actual method
  }

  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  setupCharacter(entity: Entity, type: string = 'warrior'): void {
    const stateMachine: AnimationStateMachineComponent = {
      currentState: 'idle',
      states: {
        idle: {
          name: 'idle',
          animation: { frames: ['idle1', 'idle2', 'idle3'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'walk',
            conditions: [{ type: 'input', params: { key: 'ArrowRight' }, operator: '=', value: true }]
          }]
        },
        walk: {
          name: 'walk',
          animation: { frames: ['walk1', 'walk2', 'walk3', 'walk4'], frameRate: 10, loop: true },
          canLoop: true,
          transitions: [{
            to: 'idle',
            conditions: [{ type: 'input', params: { key: 'ArrowRight' }, operator: '!=', value: true }]
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
  }

  resetEntity(entityId: string): void {
    this.stateTimer.delete(entityId);
    this.transitionQueue.delete(entityId);
  }

  destroy(): void {
    this.stateTimer.clear();
    this.transitionQueue.clear();
  }
}