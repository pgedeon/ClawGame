/**
 * @clawgame/engine - 2D game runtime engine
 */

export * from './types';

export { Engine } from './Engine';

export { EventBus } from './EventBus';
export type { EngineEvents } from './EventBus';

export { InputSystem } from './systems/InputSystem';
export { MovementSystem } from './systems/MovementSystem';
export { AISystem } from './systems/AISystem';
export { RenderSystem } from './systems/RenderSystem';
export { PhysicsSystem } from './systems/PhysicsSystem';
export { CollisionSystem } from './systems/CollisionSystem';
export { ProjectileSystem } from './systems/ProjectileSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { DamageSystem } from './systems/DamageSystem';

export { SceneLoader } from './SceneLoader';
export type { AssetResolver, SceneLoaderOptions, SceneLoadResult } from './SceneLoader';