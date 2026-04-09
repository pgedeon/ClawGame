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
