/**
 * @clawgame/engine - 2D game runtime engine
 * 
 * Modular game engine with:
 * - Entity-component system
 * - Delta-time game loop
 * - Keyboard input (arrows + WASD)
 * - Movement system
 * - AI system (patrol, chase)
 * - Render system (sprites, hitboxes, grid)
 */

// Re-export all types
export * from './types';

// Re-export engine class
export { Engine } from './Engine';

// Re-export systems
export { InputSystem } from './systems/InputSystem';
export { MovementSystem } from './systems/MovementSystem';
export { AISystem } from './systems/AISystem';
export { RenderSystem } from './systems/RenderSystem';
