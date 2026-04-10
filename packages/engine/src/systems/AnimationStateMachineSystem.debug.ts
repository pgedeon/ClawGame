import { Entity, Scene, AnimationStateMachineComponent, AnimationComponent } from '../types';
import { EventBus } from '../EventBus';

interface TransitionQueue {
  to: string;
  delay: number;
  elapsed: number;
}

export class AnimationStateMachineSystem {
  private stateTimer = new Map<string, number>();
  private transitionQueue = new Map<string, TransitionQueue>();
  
  // For testing, make these public
  public stateTimerPublic = new Map<string, number>();
  public transitionQueuePublic = new Map<string, TransitionQueue>();

  constructor(private eventBus?: EventBus) {}

  update(scene: Scene, deltaTime: number): void {
    this.stateTimerPublic = new Map(this.stateTimer);
    this.transitionQueuePublic = new Map(this.transitionQueue);
    
    console.log(`[DEBUG] AnimationStateMachineSystem.update called with ${deltaTime}s`);
    console.log(`[DEBUG] Scene has ${scene.entities.size} entities`);
    
    for (const entity of scene.entities.values()) {
      console.log(`[DEBUG] Processing entity ${entity.id}`);
      this.updateEntity(entity, deltaTime);
    }
  }

  updateEntity(entity: Entity, deltaTime: number): void {
    const rawSM = entity.components.get('animationStateMachine');
    if (!rawSM) return;
    const stateMachine = rawSM as AnimationStateMachineComponent;
    if (!stateMachine.active) {
      console.log(`[DEBUG] Entity ${entity.id} has no state machine or not active`);
      return;
    }

    console.log(`[DEBUG] Entity ${entity.id} has state machine with current state: ${stateMachine.currentState}`);

    // Handle queued transitions with delay timing
    if (this.transitionQueue.has(entity.id)) {
      const transition = this.transitionQueue.get(entity.id)!;
      transition.elapsed += deltaTime;
      
      console.log(`[DEBUG] Processing queued transition for ${entity.id}: elapsed=${transition.elapsed}, delay=${transition.delay}`);
      
      if (transition.elapsed >= transition.delay) {
        console.log(`[DEBUG] Executing delayed transition from ${stateMachine.currentState} to ${transition.to}`);
        this.changeState(entity, stateMachine, transition.to);
        this.transitionQueue.delete(entity.id);
      }
      return;
    }

    // Get current state
    const currentState = stateMachine.states[stateMachine.currentState];
    if (!currentState) {
      console.log(`[DEBUG] Current state ${stateMachine.currentState} not found`);
      return;
    }

    // Update state timer for time-based conditions
    const stateKey = `${entity.id}:${stateMachine.currentState}`;
    const currentTimer = this.stateTimer.get(stateKey) || 0;
    this.stateTimer.set(stateKey, currentTimer + deltaTime);
    
    console.log(`[DEBUG] Updated timer for ${stateKey}: ${currentTimer} + ${deltaTime} = ${currentTimer + deltaTime}`);

    // Handle animation frame looping for looping states
    if (currentState.canLoop && currentState.animation.loop) {
      this.handleFrameLooping(entity, currentState, stateKey);
    }

    // Evaluate transitions for current state
    for (const transition of currentState.transitions) {
      console.log(`[DEBUG] Evaluating transition for ${entity.id}: ${stateMachine.currentState} -> ${transition.to}`);
      if (this.shouldTransition(entity, stateMachine, transition)) {
        console.log(`[DEBUG] Transition condition met for ${entity.id}: ${stateMachine.currentState} -> ${transition.to}`);
        if (transition.delay && transition.delay > 0) {
          this.transitionQueue.set(entity.id, { 
            to: transition.to, 
            delay: transition.delay,
            elapsed: 0 
          });
          console.log(`[DEBUG] Queued delayed transition for ${entity.id}: ${stateMachine.currentState} -> ${transition.to} (delay: ${transition.delay}s)`);
        } else {
          console.log(`[DEBUG] Immediate transition for ${entity.id}: ${stateMachine.currentState} -> ${transition.to}`);
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
      case 'timer': {
        const stateKey = `${entity.id}:${stateMachine.currentState}`;
        const elapsed = this.stateTimer.get(stateKey) || 0;
        console.log(`[DEBUG] Timer condition check: elapsed=${elapsed}, operator=${condition.operator}, value=${condition.value}`);
        const result = this.compare(elapsed, condition.operator || '>=', condition.value);
        console.log(`[DEBUG] Timer condition result: ${result}`);
        return result;
      }
      case 'input':
        if (condition.params?.key) {
          const inputComp = entity.components.get('playerInput');
          if (inputComp) {
            const input = inputComp as any;
            const isPressed = input.keys?.[condition.params.key] || false;
            console.log(`[DEBUG] Input condition check: key=${condition.params.key}, pressed=${isPressed}`);
            return this.compare(isPressed, condition.operator || '=', true);
          }
        }
        return false;
        
      default:
        console.warn(`Unknown animation condition type: ${condition.type}`);
        return false;
    }
  }

  private compare(a: any, operator: string, b: any): boolean {
    const result = (() => {
      switch (operator) {
        case '=': return a === b;
        case '!=': return a !== b;
        case '>': return a > b;
        case '<': return a < b;
        case '>=': return a >= b;
        case '<=': return a <= b;
        default: console.warn(`Unknown operator: ${operator}`); return false;
      }
    })();
    
    console.log(`[DEBUG] Comparison: ${a} ${operator} ${b} = ${result}`);
    return result;
  }

  private changeState(entity: Entity, stateMachine: AnimationStateMachineComponent, newState: string): void {
    if (stateMachine.states[newState]) {
      const previousState = stateMachine.currentState;
      stateMachine.currentState = newState;
      
      console.log(`[DEBUG] State changed: ${previousState} -> ${newState}`);
      
      // Reset the animation component for the new state
      const animationComp = entity.components.get('animation');
      if (animationComp) {
        const anim = animationComp as AnimationComponent;
        const newStateData = stateMachine.states[newState].animation;
        anim.frames = newStateData.frames;
        anim.currentFrame = 0;
        anim.frameRate = newStateData.frameRate;
        anim.loop = newStateData.loop;
      }
      
      // Emit state change event
      if (this.eventBus) {
        const anim = stateMachine.states[newState].animation;
        this.eventBus.emit('animation:statechange', {
          entityId: entity.id,
          entityName: entity.name ?? entity.id,
          fromState: previousState,
          toState: newState,
          animation: { frames: anim.frames, frameRate: anim.frameRate, loop: anim.loop },
        });
      }
    }
  }

  private handleFrameLooping(entity: Entity, currentState: any, stateKey: string): void {
    console.log(`[DEBUG] Handling frame looping for ${stateKey}`);
  }

  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  destroy(): void {
    this.stateTimer.clear();
    this.transitionQueue.clear();
  }
}
