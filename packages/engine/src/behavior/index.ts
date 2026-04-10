/**
 * @clawgame/engine - Behavior Graph Module
 *
 * Data structures and runtime executor for visual logic / behavior graphs.
 * Foundation for M13 Gameplay Authoring Layer.
 */

// Re-export all behavior types and types
export * from './types';

// Re-export behavior executor and presets
export { BehaviorExecutor } from './BehaviorExecutor';
export type { BehaviorContext, ConditionEvaluator, ActionExecutor } from './BehaviorExecutor';

// Re-export behavior presets and bindings
export { BehaviorPresets } from './BehaviorPresets';
export type { PatrolConfig, ChaseConfig, AlertChaseConfig, GuardConfig } from './BehaviorPresets';
export type { BehaviorBinding } from './types';

// Re-export navigation system
export {
  createWaypoint,
  createNavigationPath,
  createNavigationState,
  NavigationSystem,
  type Waypoint,
  type NavigationPath,
  type NavigationState,
} from './NavigationSystem';

// Re-export genre kits
export { PlatformerKit, TopDownKit, RPGKit, TacticsKit } from './GenreKits';
export type {
  PatrolEnemyConfig, JumpingEnemyConfig, CollectibleConfig, HazardConfig,
  WanderEnemyConfig, ShooterEnemyConfig, ItemDropConfig,
  QuestNPCConfig, TurnBasedEnemyConfig, VillagerNPCConfig,
  MeleeUnitConfig, RangedUnitConfig, SupportUnitConfig,
} from './GenreKits';