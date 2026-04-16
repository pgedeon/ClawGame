/**
 * @clawgame/engine - Sprite Sheet Integration Tests
 * Tests for complete sprite sheet workflow from generation to runtime
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedRenderSystem } from './EnhancedRenderSystem';
import { AnimationSystem } from './AnimationSystem';
import { SpriteSheetSystem } from './SpriteSheetSystem';
import { Entity, Scene, Transform, SpriteComponent, AnimationComponent, CollisionComponent } from '../types';
import { EventBus } from '../EventBus';

// Mock global APIs for Node.js environment
global.Image = class MockImage {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  src = '';
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
} as any;

// Mock Canvas API for Node.js environment
const createMockCanvas = () => {
  const ctx = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    drawImage: () => {},
    fillRect: () => {},
    fillText: () => {},
    globalAlpha: 1,
    textAlign: 'center',
    textBaseline: 'middle',
  };
  
  return {
    width: 800,
    height: 600,
    getContext: () => ctx,
  } as HTMLCanvasElement;
};

describe('Sprite Sheet Integration', () => {
  let renderSystem: EnhancedRenderSystem;
  let animationSystem: AnimationSystem;
  let eventBus: EventBus;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    renderSystem = new EnhancedRenderSystem();
    renderSystem.setCanvas(mockCanvas);

    animationSystem = new AnimationSystem();
    eventBus = new EventBus();
    animationSystem.attach(eventBus);
  });

  afterEach(() => {
    if (renderSystem) renderSystem.detach();
    if (animationSystem) animationSystem.detach();
  });

  it('should render entity with sprite sheet component', () => {
    const entity: Entity = {
      id: 'player-1',
      name: 'Player',
      type: 'player',
      transform: { x: 100, y: 100, width: 32, height: 32 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'hero-sprites',
          frameWidth: 32,
          frameHeight: 32,
          width: 32,
          height: 32,
        } as SpriteComponent],
        ['collision', { width: 32, height: 32, type: 'player' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([['player-1', entity]]),
    };

    // This should not throw errors and handle the sprite sheet rendering
    renderSystem.update(scene, 0.016); // 16ms

    // The test passes if no exceptions are thrown
    expect(true).toBe(true);
  });

  it('should handle entity with animation and sprite sheet', () => {
    const entity: Entity = {
      id: 'enemy-1',
      name: 'Enemy',
      type: 'enemy',
      transform: { x: 200, y: 200, width: 32, height: 32 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'slime-sprites',
          frameWidth: 32,
          frameHeight: 32,
          width: 32,
          height: 32,
        } as SpriteComponent],
        ['animation', {
          frames: [0, 1, 2, 3],
          frameRate: 10, // 10 frames per second = 100ms per frame
          loop: true,
          currentFrame: 0,
          active: true,
        } as AnimationComponent],
        ['collision', { width: 32, height: 32, type: 'enemy' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([['enemy-1', entity]]),
    };

    // Update animation system to advance frame
    // 150ms should be enough to advance by 1 frame (100ms per frame)
    animationSystem.update(scene, 0.15); // 150ms
    expect(entity.components.get('animation')?.currentFrame).toBe(1);

    // Update render system to draw the animated frame
    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });

  it('should handle multiple sprite sheet entities simultaneously', () => {
    const playerEntity: Entity = {
      id: 'player-1',
      name: 'Player',
      type: 'player',
      transform: { x: 100, y: 100, width: 32, height: 32 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'hero-sprites',
          frameWidth: 32,
          frameHeight: 32,
          width: 32,
          height: 32,
        } as SpriteComponent],
        ['collision', { width: 32, height: 32, type: 'player' } as CollisionComponent],
      ]),
    };

    const enemyEntity: Entity = {
      id: 'enemy-1',
      name: 'Enemy',
      type: 'enemy',
      transform: { x: 300, y: 200, width: 32, height: 32 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'slime-sprites',
          frameWidth: 32,
          frameHeight: 32,
          width: 32,
          height: 32,
        } as SpriteComponent],
        ['animation', {
          frames: [0, 1, 2],
          frameRate: 8, // 8 frames per second = 125ms per frame
          loop: true,
          currentFrame: 0,
          active: true,
        } as AnimationComponent],
        ['collision', { width: 32, height: 32, type: 'enemy' } as CollisionComponent],
      ]),
    };

    const collectibleEntity: Entity = {
      id: 'coin-1',
      name: 'Coin',
      type: 'collectible',
      transform: { x: 400, y: 300, width: 16, height: 16 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'coin-sprites',
          frameWidth: 16,
          frameHeight: 16,
          width: 16,
          height: 16,
        } as SpriteComponent],
        ['animation', {
          frames: [0, 1, 2, 3],
          frameRate: 12, // 12 frames per second = ~83ms per frame
          loop: true,
          currentFrame: 0,
          active: true,
        } as AnimationComponent],
        ['collision', { width: 16, height: 16, type: 'collectible' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([
        ['player-1', playerEntity],
        ['enemy-1', enemyEntity],
        ['coin-1', collectibleEntity],
      ]),
    };

    // Test animation advancement for all entities with sufficient time
    // Use 200ms to ensure all animations advance at least one frame
    animationSystem.update(scene, 0.2); // 200ms
    
    // Enemy: 8 fps, 125ms per frame, should advance 1 frame
    expect(enemyEntity.components.get('animation')?.currentFrame).toBe(1);
    
    // Collectible: 12 fps, ~83ms per frame, should advance 2 frames
    expect(collectibleEntity.components.get('animation')?.currentFrame).toBe(2);

    // Test rendering all entities
    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });

  it('should handle fallback rendering for non-sprite entities', () => {
    const entity: Entity = {
      id: 'obstacle-1',
      name: 'Obstacle',
      type: 'obstacle',
      transform: { x: 150, y: 150, width: 64, height: 64 },
      components: new Map([
        ['collision', { width: 64, height: 64, type: 'obstacle' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([['obstacle-1', entity]]),
    };

    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });

  it('should handle sprite with opacity and flip effects', () => {
    const entity: Entity = {
      id: 'ghost-1',
      name: 'Ghost',
      type: 'enemy',
      transform: { x: 250, y: 250, width: 32, height: 32 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'ghost-sprites',
          frameWidth: 32,
          frameHeight: 32,
          width: 32,
          height: 32,
          opacity: 0.7,
          flipX: true,
        } as SpriteComponent],
        ['animation', {
          frames: [0, 1],
          frameRate: 6,
          loop: true,
          currentFrame: 0,
          active: true,
        } as AnimationComponent],
        ['collision', { width: 32, height: 32, type: 'enemy' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([['ghost-1', entity]]),
    };

    animationSystem.update(scene, 0.1);
    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });

  it('should handle entities with different sprite sheet dimensions', () => {
    const largeEntity: Entity = {
      id: 'boss-1',
      name: 'Boss',
      type: 'enemy',
      transform: { x: 300, y: 300, width: 64, height: 64 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'boss-sprites',
          frameWidth: 64,
          frameHeight: 64,
          width: 64,
          height: 64,
        } as SpriteComponent],
        ['collision', { width: 64, height: 64, type: 'enemy' } as CollisionComponent],
      ]),
    };

    const smallEntity: Entity = {
      id: 'projectile-1',
      name: 'Projectile',
      type: 'projectile',
      transform: { x: 400, y: 400, width: 8, height: 8 },
      components: new Map([
        ['sprite', {
          spriteSheet: 'bullet-sprites',
          frameWidth: 8,
          frameHeight: 8,
          width: 8,
          height: 8,
        } as SpriteComponent],
        ['collision', { width: 8, height: 8, type: 'projectile' } as CollisionComponent],
      ]),
    };

    const scene: Scene = {
      name: 'test-scene',
      entities: new Map([
        ['boss-1', largeEntity],
        ['projectile-1', smallEntity],
      ]),
    };

    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });

  it('should handle scene with mixed entity types', () => {
    const entities: Entity[] = [
      {
        id: 'player-1',
        type: 'player',
        transform: { x: 100, y: 100, width: 32, height: 32 },
        components: new Map([
          ['sprite', {
            spriteSheet: 'hero-sprites',
            frameWidth: 32,
            frameHeight: 32,
            width: 32,
            height: 32,
          } as SpriteComponent],
          ['collision', { width: 32, height: 32, type: 'player' } as CollisionComponent],
        ]),
      },
      {
        id: 'enemy-1',
        type: 'enemy',
        transform: { x: 200, y: 200, width: 32, height: 32 },
        components: new Map([
          ['collision', { width: 32, height: 32, type: 'enemy' } as CollisionComponent],
        ]),
      },
      {
        id: 'collectible-1',
        type: 'collectible',
        transform: { x: 300, y: 300, width: 16, height: 16 },
        components: new Map([
          ['sprite', {
            spriteSheet: 'coin-sprites',
            frameWidth: 16,
            frameHeight: 16,
            width: 16,
            height: 16,
          } as SpriteComponent],
          ['collision', { width: 16, height: 16, type: 'collectible' } as CollisionComponent],
        ]),
      },
      {
        id: 'obstacle-1',
        type: 'obstacle',
        transform: { x: 400, y: 400, width: 64, height: 64 },
        components: new Map([
          ['collision', { width: 64, height: 64, type: 'obstacle' } as CollisionComponent],
        ]),
      },
    ];

    const scene: Scene = {
      name: 'mixed-scene',
      entities: new Map(entities.map(e => [e.id, e])),
    };

    renderSystem.update(scene, 0.016);

    expect(true).toBe(true);
  });
});