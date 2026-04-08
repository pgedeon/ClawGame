import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIImageGenerationService } from '../services/aiImageGenerationService';
import type { AIImageGenerationRequest } from '../services/aiImageGenerationService';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => mockLogger),
} as any;

describe('AIImageGenerationService', () => {
  let service: AIImageGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIImageGenerationService(mockLogger);
  });

  describe('generateAsset', () => {
    const baseRequest: AIImageGenerationRequest = {
      type: 'sprite',
      prompt: 'blue knight character',
      style: 'pixel',
      width: 32,
      height: 32,
      format: 'svg',
    };

    it('should return a generation result with metadata and content', async () => {
      const result = await service.generateAsset(baseRequest);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.id).toMatch(/^gen-/);
      expect(result.metadata.type).toBe('sprite');
      expect(result.metadata.prompt).toBe('blue knight character');
      expect(result.metadata.style).toBe('pixel');
      expect(result.metadata.width).toBe(32);
      expect(result.metadata.height).toBe(32);
      expect(result.metadata.format).toBe('svg');
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.aiGeneration).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toContain('<svg');
    });

    it('should generate a valid SVG with viewBox', async () => {
      const result = await service.generateAsset(baseRequest);
      expect(result.content).toContain('viewBox="0 0 32 32"');
    });

    it('should generate player sprite when prompt mentions player/hero/character', async () => {
      const result = await service.generateAsset({
        ...baseRequest,
        prompt: 'player character hero',
      });
      expect(result.content).toContain('<svg');
      // Player sprites have specific structure
      expect(result.content.length).toBeGreaterThan(100);
    });

    it('should generate enemy sprite when prompt mentions enemy/monster', async () => {
      const result = await service.generateAsset({
        ...baseRequest,
        prompt: 'zombie enemy monster',
      });
      expect(result.content).toContain('<svg');
      expect(result.content.length).toBeGreaterThan(100);
    });

    it('should generate icon for icon type', async () => {
      const result = await service.generateAsset({
        ...baseRequest,
        type: 'icon',
        prompt: 'health potion',
      });
      expect(result.content).toContain('<svg');
    });

    it('should generate background for background type', async () => {
      const result = await service.generateAsset({
        ...baseRequest,
        type: 'background',
        prompt: 'forest landscape',
        width: 800,
        height: 600,
      });
      expect(result.content).toContain('<svg');
    });

    it('should generate tileset for tileset type', async () => {
      const result = await service.generateAsset({
        ...baseRequest,
        type: 'tileset',
        prompt: 'grass and stone tiles',
        width: 128,
        height: 128,
      });
      expect(result.content).toContain('<svg');
    });

    it('should work with different art styles', async () => {
      for (const style of ['pixel', 'vector', 'hand-drawn', 'cartoon', 'realistic'] as const) {
        const result = await service.generateAsset({
          ...baseRequest,
          style,
        });
        expect(result.content).toContain('<svg');
        expect(result.metadata.style).toBe(style);
      }
    });

    it('should generate unique IDs for each generation', async () => {
      const result1 = await service.generateAsset(baseRequest);
      const result2 = await service.generateAsset(baseRequest);
      expect(result1.metadata.id).not.toBe(result2.metadata.id);
    });

    it('should track generation time', async () => {
      const start = Date.now();
      const result = await service.generateAsset(baseRequest);
      const elapsed = Date.now() - start;
      expect(result.metadata.generationTime).toBeLessThanOrEqual(elapsed + 10);
    });
  });
});
