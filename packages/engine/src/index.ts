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
export { AnimationSystem } from './systems/AnimationSystem';
export type { CollisionEvent } from './systems/CollisionSystem';

// Re-export scene loader
export { SceneLoader } from './SceneLoader';
export type { AssetResolver, SceneLoaderOptions, SceneLoadResult } from './SceneLoader';

// Re-export behavior graph module
export * from './behavior';
