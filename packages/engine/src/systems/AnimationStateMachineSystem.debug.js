// Debug version for testing delayed transitions
const AnimationStateMachineSystem = require('./AnimationStateMachineSystem').AnimationStateMachineSystem;

class DebugSystem extends AnimationStateMachineSystem {
  constructor() {
    super();
    this.debugLogs = [];
  }

  log(message, ...args) {
    const logMessage = `[DEBUG] ${new Date().toISOString()} - ${message}`;
    console.log(logMessage, ...args);
    this.debugLogs.push({ message: logMessage, args, timestamp: Date.now() });
  }

  updateEntity(entity, deltaTime) {
    this.log('=== UpdateEntity called ===', { entityId: entity.id, deltaTime });
    
    const stateMachine = entity.components.get('animationStateMachine');
    if (!stateMachine || !stateMachine.active) {
      this.log('No state machine or not active, skipping');
      return;
    }

    this.log(`Current state: ${stateMachine.currentState}`);
    
    // Log transition queue state
    if (this.transitionQueue.has(entity.id)) {
      const transition = this.transitionQueue.get(entity.id);
      this.log('Found queued transition', {
        to: transition.to,
        delay: transition.delay,
        elapsed: transition.elapsed
      });
    }

    // Call parent method
    super.updateEntity(entity, deltaTime);
  }

  shouldTransition(entity, stateMachine, transition) {
    this.log('Evaluating transition', { to: transition.to, conditions: transition.conditions });
    const result = super.shouldTransition(entity, stateMachine, transition);
    this.log('Transition evaluation result', { result });
    return result;
  }

  changeState(entity, stateMachine, newState) {
    this.log('Changing state', { from: stateMachine.currentState, to: newState });
    super.changeState(entity, stateMachine, newState);
  }

  evaluateCondition(entity, stateMachine, condition) {
    this.log('Evaluating condition', { type: condition.type, operator: condition.operator, value: condition.value });
    
    if (condition.type === 'timer') {
      const stateKey = `${entity.id}:${stateMachine.currentState}`;
      const elapsed = this.stateTimer.get(stateKey) || 0;
      this.log('Timer condition details', { stateKey, elapsed, condition });
    }
    
    const result = super.evaluateCondition(entity, stateMachine, condition);
    this.log('Condition evaluation result', { result });
    return result;
  }
}

module.exports = { DebugSystem };