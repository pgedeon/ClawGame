/**
 * @clawgame/engine - 2D game runtime engine
 *
 * Modular game engine with:
 * - Canonical entity/component schema
 * - Serializable ↔ Runtime conversion
 * - Typed event bus for gameplay communication
 * - Delta-time game loop
 * - Keyboard input (arrows + WASD)
 * - Movement system
 * - AI system (patrol, chase)
 * - Render system (sprites, hitboxes, grid)
 * - Data-driven scene loading with asset resolution
 * - Behavior graph executor for visual logic authoring
 * - Animation state machines for complex character animations
 * - Game loop coordinator for high-level state tracking (M14)
 */

// Re-export all types (canonical schema)
export * from './types';

// Re-export engine class
export { Engine } from './Engine';

// Re-export event bus
export { EventBus } from './EventBus';
export type { EngineEvents, Subscription } from './EventBus';

// Re-export systems
export { InputSystem } from './systems/InputSystem';
export { MovementSystem } from './systems/MovementSystem';
export { AISystem } from './systems/AISystem';
export { RenderSystem } from './systems/RenderSystem';
export { PhysicsSystem } from './systems/PhysicsSystem';
export { CollisionSystem } from './systems/CollisionSystem';
export { ProjectileSystem } from './systems/ProjectileSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { AnimationStateMachineSystem } from './systems/AnimationStateMachineSystem';
export type { CollisionEvent } from './systems/CollisionSystem';

// Re-export preview HUD (M14 runtime unification)
export { PreviewHUD } from './systems/PreviewHUD';
export type {
  HUDState,
  HUDSpell,
  HUDQuest,
  HUDTowerDefenseStats,
  MinimapEntity,
} from './systems/PreviewHUD';

// Re-export game loop coordinator (M14 runtime unification)
export { GameLoopCoordinator, createDefaultGameState } from './systems/GameLoopCoordinator';
export type {
  GameState,
  GameStateChangedEvent,
  CollectiblePickupEvent,
  ScoreChangedEvent,
  HealthChangedEvent,
  ManaChangedEvent,
  GameOverEvent,
  VictoryEvent,
  GenrePlugin,
  VictoryCondition,
  GameLoopCoordinatorConfig,
} from './systems/GameLoopCoordinator';

// Re-export scene loader
export { SceneLoader } from './SceneLoader';
export type { AssetResolver, SceneLoaderOptions, SceneLoadResult } from './SceneLoader';

// Re-export behavior graph module
export * from './behavior';
