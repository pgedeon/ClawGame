/**
 * @clawgame/engine - Sprite Sheet System Tests
 * Tests for sprite sheet integration with the runtime engine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpriteSheetSystem, type SpriteSheetData } from './SpriteSheetSystem';

// Mock global APIs for Node.js environment
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  complete = true;
  width = 32;
  height = 32;
  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
}
global.Image = MockImage as any;

// Mock Canvas API for Node.js environment
const createMockCanvas = () => {
  const canvas = {
    width: 800,
    height: 600,
    getContext: () => ({
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
    }),
  };
  return canvas as HTMLCanvasElement;
};

describe('SpriteSheetSystem', () => {
  let spriteSheetSystem: SpriteSheetSystem;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    spriteSheetSystem = new SpriteSheetSystem();
    mockCanvas = createMockCanvas();
    spriteSheetSystem.attach(mockCanvas);
  });

  afterEach(() => {
    spriteSheetSystem.detach();
  });

  it('should initialize with empty cache', () => {
    const cache = spriteSheetSystem.getLoadedSpriteSheets();
    expect(cache.size).toBe(0);
  });

  it('should parse sprite sheet animation frames correctly', () => {
    // Mock sprite sheet data
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 32,
      frameHeight: 32,
      columns: 4,
      rows: 4,
      frameCount: 16,
      frames: Array.from({ length: 16 }, (_, i) => ({
        index: i,
        x: (i % 4) * 32,
        y: Math.floor(i / 4) * 32,
        width: 32,
        height: 32,
      })),
      animations: [
        {
          name: 'idle',
          frames: [0, 1, 2, 3],
          loop: true,
          speed: 1.0,
        },
        {
          name: 'walk',
          frames: [4, 5, 6, 7],
          loop: true,
          speed: 1.2,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // Mock cache entry
    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    // Test animation frame extraction
    const idleFrames = spriteSheetSystem.getAnimationFrames(mockCache, 'idle');
    expect(idleFrames).toHaveLength(4);
    expect(idleFrames[0].frameIndex).toBe(0);
    expect(idleFrames[0].x).toBe(0);
    expect(idleFrames[0].y).toBe(0);
    expect(idleFrames[1].frameIndex).toBe(1);
    expect(idleFrames[1].x).toBe(32);
    expect(idleFrames[1].y).toBe(0);

    const walkFrames = spriteSheetSystem.getAnimationFrames(mockCache, 'walk');
    expect(walkFrames).toHaveLength(4);
    expect(walkFrames[0].frameIndex).toBe(4);
    expect(walkFrames[0].x).toBe(0);
    expect(walkFrames[0].y).toBe(32);

    // Test non-existent animation
    const nonexistentFrames = spriteSheetSystem.getAnimationFrames(mockCache, 'attack');
    expect(nonexistentFrames).toHaveLength(0);
  });

  it('should get animation by name correctly', () => {
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 32,
      frameHeight: 32,
      columns: 4,
      rows: 4,
      frameCount: 16,
      frames: Array.from({ length: 16 }, (_, i) => ({
        index: i,
        x: (i % 4) * 32,
        y: Math.floor(i / 4) * 32,
        width: 32,
        height: 32,
      })),
      animations: [
        {
          name: 'idle',
          frames: [0, 1, 2, 3],
          loop: true,
          speed: 1.0,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    const animation = spriteSheetSystem.getAnimation(mockCache, 'idle');
    expect(animation).toBeDefined();
    expect(animation?.name).toBe('idle');
    expect(animation?.frames).toEqual([0, 1, 2, 3]);
    expect(animation?.loop).toBe(true);
    expect(animation?.speed).toBe(1.0);

    const nonexistentAnimation = spriteSheetSystem.getAnimation(mockCache, 'walk');
    expect(nonexistentAnimation).toBeUndefined();
  });

  it('should handle frame boundary cases correctly', () => {
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      frames: [
        { index: 0, x: 0, y: 0, width: 32, height: 32 },
        { index: 1, x: 32, y: 0, width: 32, height: 32 },
        { index: 2, x: 0, y: 32, width: 32, height: 32 },
        { index: 3, x: 32, y: 32, width: 32, height: 32 },
      ],
      animations: [
        {
          name: 'all-frames',
          frames: [0, 1, 2, 3],
          loop: false,
          speed: 1.0,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    const frames = spriteSheetSystem.getAnimationFrames(mockCache, 'all-frames');
    expect(frames).toHaveLength(4);
    expect(frames[0].frameIndex).toBe(0);
    expect(frames[3].frameIndex).toBe(3);
    expect(frames[3].x).toBe(32);
    expect(frames[3].y).toBe(32);
  });

  it('should clear cache correctly', () => {
    // Add something to cache first
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      frames: [
        { index: 0, x: 0, y: 0, width: 32, height: 32 },
        { index: 1, x: 32, y: 0, width: 32, height: 32 },
        { index: 2, x: 0, y: 32, width: 32, height: 32 },
        { index: 3, x: 32, y: 32, width: 32, height: 32 },
      ],
      animations: [],
      createdAt: new Date().toISOString(),
    };

    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    // Manually add to cache for testing
    (spriteSheetSystem as any).cache.set('test-key', mockCache);
    expect((spriteSheetSystem as any).cache.size).toBe(1);

    // Clear cache
    spriteSheetSystem.clearCache();
    expect((spriteSheetSystem as any).cache.size).toBe(0);
  });

  it('should handle edge cases gracefully', () => {
    // Test with empty animations array
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      frameCount: 4,
      frames: [
        { index: 0, x: 0, y: 0, width: 32, height: 32 },
        { index: 1, x: 32, y: 0, width: 32, height: 32 },
      ],
      animations: [],
      createdAt: new Date().toISOString(),
    };

    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    const emptyFrames = spriteSheetSystem.getAnimationFrames(mockCache, 'idle');
    expect(emptyFrames).toHaveLength(0);

    const emptyAnimation = spriteSheetSystem.getAnimation(mockCache, 'idle');
    expect(emptyAnimation).toBeUndefined();
  });

  it('should handle different sprite sheet dimensions', () => {
    const spriteSheetData: SpriteSheetData = {
      id: 'test-sheet',
      name: 'test-character',
      prompt: 'test character',
      artStyle: 'pixel',
      frameWidth: 64,
      frameHeight: 64,
      columns: 3,
      rows: 3,
      frameCount: 9,
      frames: Array.from({ length: 9 }, (_, i) => ({
        index: i,
        x: (i % 3) * 64,
        y: Math.floor(i / 3) * 64,
        width: 64,
        height: 64,
      })),
      animations: [
        {
          name: 'large-frames',
          frames: [0, 4, 8],
          loop: true,
          speed: 1.0,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const mockCache = {
      data: spriteSheetData,
      image: new MockImage(),
      loaded: true,
    };

    const frames = spriteSheetSystem.getAnimationFrames(mockCache, 'large-frames');
    expect(frames).toHaveLength(3);
    expect(frames[0].x).toBe(0);
    expect(frames[0].y).toBe(0);
    expect(frames[0].width).toBe(64);
    expect(frames[0].height).toBe(64);
    
    expect(frames[1].x).toBe(64);  // 64 * 2
    expect(frames[1].y).toBe(64);   // 64 * 1
    expect(frames[2].x).toBe(128);  // 64 * 2  
    expect(frames[2].y).toBe(128);  // 64 * 2
  });
});