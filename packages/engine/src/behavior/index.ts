/**
 * @clawgame/engine - Behavior Graph Module
 *
 * Data structures and runtime executor for visual logic / behavior graphs.
 * Foundation for M13 Gameplay Authoring Layer.
 */

export * from './types';
export { BehaviorExecutor } from './BehaviorExecutor';
export type { BehaviorContext, ConditionEvaluator, ActionExecutor } from './BehaviorExecutor';
export { BehaviorPresets } from './BehaviorPresets';
export type { PatrolConfig, ChaseConfig, AlertChaseConfig, GuardConfig } from './BehaviorPresets';
