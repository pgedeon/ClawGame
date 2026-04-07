import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from './helpers';
import { AIImageGenerationService } from '../services/aiImageGenerationService';
import type { AIImageGenerationRequest } from '../services/aiImageGenerationService';

describe('AI Image Generation Service', () => {
  let app: any;
  let service: AIImageGenerationService;
  let mockLogger: any;

  beforeEach(async () => {
    app = await buildApp();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
    service = new AIImageGenerationService(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImage', () => {
    it('should generate an image with valid request', async () => {
      const request: AIImageGenerationRequest = {
        type: 'sprite',
        prompt: 'a red pixel art sword',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const result = await service.generateImage('test-project', request);

      expect(result).toMatchObject({
        projectId: 'test-project',
        type: 'sprite',
        prompt: 'a red pixel art sword',
        status: 'completed',
        progress: 100,
        result: expect.objectContaining({
          success: true,
          svg: expect.stringContaining('<svg'),
          generationTime: expect.any(Number),
        }),
      });

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle generation failures gracefully', async () => {
      // Test with a request that might fail (if API is not available)
      const request: AIImageGenerationRequest = {
        type: 'invalid-type' as any,
        prompt: 'test',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const result = await service.generateImage('test-project', request);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle different asset types', async () => {
      const types: AIImageGenerationRequest['type'][] = ['sprite', 'tileset', 'texture', 'icon', 'audio', 'background'];
      
      for (const type of types) {
        const request: AIImageGenerationRequest = {
          type,
          prompt: `a ${type} asset`,
          style: 'pixel',
          width: 64,
          height: 64,
          format: 'svg',
        };

        const result = await service.generateImage('test-project', request);
        
        expect(result.type).toBe(type);
        expect(result.prompt).toBe(`a ${type} asset`);
      }
    });

    it('should handle different art styles', async () => {
      const styles: AIImageGenerationRequest['style'][] = ['pixel', 'vector', 'hand-drawn', 'cartoon', 'realistic'];
      
      for (const style of styles) {
        const request: AIImageGenerationRequest = {
          type: 'sprite',
          prompt: 'test asset',
          style,
          width: 64,
          height: 64,
          format: 'svg',
        };

        const result = await service.generateImage('test-project', request);
        
        expect(result).toBeDefined();
        expect(mockLogger.info).toHaveBeenCalled();
      }
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status by ID', async () => {
      const request: AIImageGenerationRequest = {
        type: 'sprite',
        prompt: 'test',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const generation = await service.generateImage('test-project', request);
      const status = await service.getGenerationStatus('test-project', generation.id);

      expect(status).toMatchObject({
        id: generation.id,
        projectId: 'test-project',
        type: 'sprite',
        prompt: 'test',
        status: 'completed',
        progress: 100,
      });
    });

    it('should return null for invalid generation ID', async () => {
      const status = await service.getGenerationStatus('test-project', 'invalid-id');
      expect(status).toBeNull();
    });

    it('should return null for wrong project ID', async () => {
      const request: AIImageGenerationRequest = {
        type: 'sprite',
        prompt: 'test',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const generation = await service.generateImage('test-project', request);
      const status = await service.getGenerationStatus('wrong-project', generation.id);

      expect(status).toBeNull();
    });
  });

  describe('getGenerations', () => {
    it('should list all generations for a project', async () => {
      // Create multiple generations
      await service.generateImage('test-project', {
        type: 'sprite',
        prompt: 'first',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      });

      await service.generateImage('test-project', {
        type: 'tileset',
        prompt: 'second',
        style: 'vector',
        width: 64,
        height: 64,
        format: 'svg',
      });

      await service.generateImage('other-project', {
        type: 'icon',
        prompt: 'third',
        style: 'cartoon',
        width: 64,
        height: 64,
        format: 'svg',
      });

      const generations = await service.getGenerations('test-project');

      expect(generations).toHaveLength(2);
      expect(generations.every(g => g.projectId === 'test-project')).toBe(true);
      expect(generations.some(g => g.prompt === 'first')).toBe(true);
      expect(generations.some(g => g.prompt === 'second')).toBe(true);
    });

    it('should return empty array for project with no generations', async () => {
      const generations = await service.getGenerations('empty-project');
      expect(generations).toEqual([]);
    });
  });

  describe('cleanupOldGenerations', () => {
    it('should remove old completed generations', async () => {
      // Create a completed generation
      const request: AIImageGenerationRequest = {
        type: 'sprite',
        prompt: 'old',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const generation = await service.generateImage('test-project', request);
      
      // Simulate it being old
      (service as any).pendingGenerations.get(generation.id)!.createdAt = new Date(Date.now() - 2 * 3600000).toISOString();
      (service as any).pendingGenerations.get(generation.id)!.status = 'completed';

      // Create a recent generation
      await service.generateImage('test-project', {
        type: 'sprite',
        prompt: 'recent',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      });

      expect((service as any).pendingGenerations.size).toBe(2);

      // Cleanup generations older than 1 hour
      service.cleanupOldGenerations(3600000);

      expect((service as any).pendingGenerations.size).toBe(1);
      expect((service as any).pendingGenerations.has(generation.id)).toBe(false);
    });

    it('should keep recent completed generations', async () => {
      // Create a completed generation
      const request: AIImageGenerationRequest = {
        type: 'sprite',
        prompt: 'recent',
        style: 'pixel',
        width: 64,
        height: 64,
        format: 'svg',
      };

      const generation = await service.generateImage('test-project', request);

      // Simulate it being recent
      (service as any).pendingGenerations.get(generation.id)!.createdAt = new Date(Date.now() - 1000).toISOString();
      (service as any).pendingGenerations.get(generation.id)!.status = 'completed';

      expect((service as any).pendingGenerations.size).toBe(1);

      // Cleanup generations older than 1 hour
      service.cleanupOldGenerations(3600000);

      expect((service as any).pendingGenerations.size).toBe(1);
      expect((service as any).pendingGenerations.has(generation.id)).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await service.healthCheck();

      expect(health).toMatchObject({
        status: expect.stringMatching(/^(ok|error)$/),
        service: 'ai-image-generation',
        model: expect.any(String),
        features: expect.any(Array),
      });

      expect(health.features.length).toBeGreaterThan(0);
      expect(health.features).toContain('real-time SVG generation from text prompts');
    });
  });
});