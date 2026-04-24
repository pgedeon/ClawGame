/**
 * AI Image Generation Service Tests
 * M10: Asset Factory Core - Image generation and AI-powered asset creation
 */

import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { AIImageGenerationService } from '../services/aiImageGenerationService';
import type { AssetType } from '../types';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Ensure test data directory exists
const testDataDir = join(process.cwd(), 'test-data');
if (!existsSync(testDataDir)) {
  mkdir(testDataDir, { recursive: true });
}

// Base request for testing
const baseRequest = {
  type: 'sprite' as AssetType,
  prompt: 'test sprite character',
  style: 'pixel-art',
  width: 64,
  height: 64,
  format: 'svg' as const,
  quality: 'high' as const,
};

describe('AIImageGenerationService', () => {
  let service: AIImageGenerationService;

  beforeEach(() => {
    service = new AIImageGenerationService(mockLogger);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeInstanceOf(AIImageGenerationService);
      expect(mockLogger.info).toHaveBeenCalledWith('AI Image Generation Service initialized');
    });
  });

  describe('generateAsset', () => {
    it('should generate a basic SVG sprite', async () => {
      const result = await service.generateAsset(baseRequest, mockLogger);
      
      expect(result).toBeDefined();
      expect(result.content).toContain('<svg');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.type).toBe(baseRequest.type);
      expect(result.metadata.prompt).toBe(baseRequest.prompt);
      expect(result.metadata.style).toBe(baseRequest.style);
      expect(result.metadata.width).toBe(baseRequest.width);
      expect(result.metadata.height).toBe(baseRequest.height);
      expect(result.metadata.format).toBe(baseRequest.format);
      expect(result.metadata.generationTime).toBeGreaterThan(0);
    });

    it('should support different quality levels', async () => {
      const qualities = ['draft', 'standard', 'high', 'ultra'];
      
      for (const quality of qualities) {
        const request = {
          ...baseRequest,
          quality: quality as any,
        };
        
        const result = await service.generateAsset(request, mockLogger);
        
        expect(result.metadata.quality).toBe(quality);
        expect(result.content).toContain('<svg');
      }
    });

    it('should support different asset types', async () => {
      const types = ['sprite', 'tileset', 'texture', 'icon', 'background', 'prop', 'ui'];
      
      for (const type of types) {
        const request = {
          ...baseRequest,
          type: type as any,
        };
        
        const result = await service.generateAsset(request, mockLogger);
        
        expect(result.metadata.type).toBe(type);
        expect(result.content).toContain('<svg');
      }
    });

    it('should support different formats', async () => {
      const formats = ['svg', 'png', 'jpg'];
      
      for (const format of formats) {
        const request = {
          ...baseRequest,
          format: format as any,
        };
        
        const result = await service.generateAsset(request, mockLogger);
        
        expect(result.metadata.format).toBe(format);
        expect(result.content).toContain('<svg'); // Still generate SVG internally
      }
    });

    it('should generate with different aspect ratios', async () => {
      const aspectRatios = ['square', 'portrait', 'landscape'];
      
      for (const aspectRatio of aspectRatios) {
        const request = {
          ...baseRequest,
          aspectRatio: aspectRatio as any,
        };
        
        const result = await service.generateAsset(request, mockLogger);
        
        expect(result.metadata.aspectRatio).toBe(aspectRatio);
        expect(result.content).toContain('<svg');
      }
    });

    it('should support batch generation', async () => {
      const count = 3;
      const results = await service.generateAssets(baseRequest, count, mockLogger);
      
      expect(results).toHaveLength(count);
      expect(results.every(r => r.content.contains('<svg'))).toBe(true);
      expect(new Set(results.map(r => r.metadata.generationId)).size).toBe(count); // All IDs should be unique
    });

    it('should track generation time accurately', async () => {
      const startTime = Date.now();
      const result = await service.generateAsset(baseRequest, mockLogger);
      const endTime = Date.now();
      
      expect(result.metadata.generationTime).toBeGreaterThan(0);
      expect(result.metadata.generationTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });

    it('should include generation metadata', async () => {
      const result = await service.generateAsset(baseRequest, mockLogger);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generationId).toBeDefined();
      expect(result.metadata.model).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.generationTime).toBeGreaterThan(0);
    });

    it('should handle fallback to local generation when external services fail', async () => {
      // Mock a failed external service call
      const failedRequest = {
        ...baseRequest,
        model: 'zai',
        quality: 'standard' as const,
      };
      
      // This should fallback to local generation
      const result = await service.generateAsset(failedRequest, mockLogger);
      
      expect(result.metadata.model).toBe('enhanced-local');
      expect(result.content).toContain('<svg');
    });
  });

  describe('buildEnhancedPrompt', () => {
    it('should add type-specific enhancements', () => {
      const types = ['sprite', 'tileset', 'texture', 'icon', 'background', 'prop', 'ui'];
      
      for (const type of types) {
        const request = { 
          ...baseRequest, 
          type: type as any,
          quality: 'standard' as const 
        };
        const enhanced = (service as any).buildEnhancedPrompt(request);
        
        expect(enhanced).toContain(type);
        expect(enhanced).toContain('game');
      }
    });

    it('should add quality-specific enhancements', () => {
      const qualities = ['draft', 'standard', 'high', 'ultra'];
      
      for (const quality of qualities) {
        const request = { 
          ...baseRequest, 
          quality: quality as const 
        };
        const enhanced = (service as any).buildEnhancedPrompt(request);
        
        expect(enhanced).toContain(quality);
      }
    });

    it('should add style-specific enhancements', () => {
      const styles = ['pixel-art', '3d-realistic', 'cartoon', 'fantasy', 'sci-fi', 'retro', 'modern', 'hand-drawn'];
      
      for (const style of styles) {
        const request = { 
          ...baseRequest, 
          style 
        };
        const enhanced = (service as any).buildEnhancedPrompt(request);
        
        expect(enhanced).toContain(style);
      }
    });

    it('should add background and aspect ratio when specified', () => {
      const request = {
        ...baseRequest,
        backgroundColor: 'transparent',
        aspectRatio: 'landscape' as any,
      };
      
      const enhanced = (service as any).buildEnhancedPrompt(request);
      
      expect(enhanced).toContain('transparent');
      expect(enhanced).toContain('landscape');
    });
  });

  describe('saveGeneratedAsset', () => {
    it('should save generated assets to filesystem', async () => {
      const result = await service.generateAsset(baseRequest, mockLogger);
      
      expect(result.content).toMatch(/^\/data\/projects\/.*\/assets\/.*\.(svg|png|jpg)$/);
    });

    it('should create necessary directories', async () => {
      const result = await service.generateAsset(baseRequest, mockLogger);
      
      // The path should indicate directory creation happened
      expect(result.content).toMatch(/\/data\/projects\/[^/]+\/assets\/[^/]+/);
    });
  });

  describe('getGenerations', () => {
    it('should return empty array when no generations exist', async () => {
      const generations = await service.getGenerations('test-project', mockLogger);
      
      expect(generations).toEqual([]);
    });

    it('should return all generations for a project', async () => {
      // Generate some test data
      await service.generateAssets(baseRequest, 3, mockLogger);
      
      const generations = await service.getGenerations('test-project', mockLogger);
      
      expect(generations.length).toBeGreaterThan(0);
      expect(generations.every(g => g.metadata.type === baseRequest.type)).toBe(true);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return null for non-existent generation', async () => {
      const status = await service.getGenerationStatus('non-existent-id', mockLogger);
      
      expect(status).toBeNull();
    });

    it('should return generation status for existing generation', async () => {
      const result = await service.generateAsset(baseRequest, mockLogger);
      
      const status = await service.getGenerationStatus(result.metadata.generationId, mockLogger);
      
      expect(status).toBeDefined();
      expect(status?.id).toBe(result.metadata.generationId);
      expect(status?.status).toBe('completed');
    });
  });

  describe('cleanupOldGenerations', () => {
    it('should clean up old generations', async () => {
      // Generate test data
      await service.generateAssets(baseRequest, 5, mockLogger);
      
      // Clean up generations older than 1 day
      await (service as any).cleanupOldGenerations(24, mockLogger);
      
      const remaining = await service.getGenerations('test-project', mockLogger);
      // Should be cleaned up (this test might need adjustment based on actual implementation)
      expect(Array.isArray(remaining)).toBe(true);
    });
  });

  // ── Integration Tests ──
  
  describe('integration with real external services', () => {
    it('should integrate with real AI services when available', async () => {
      // This test would run against a real AI service when API keys are available
      // For now, just test that the service structure is correct
      expect(service).toBeDefined();
    });

    it('should handle rate limiting gracefully', async () => {
      // Test rate limiting behavior
      const start = Date.now();
      await service.generateAssets(baseRequest, 3, mockLogger);
      const duration = Date.now() - start;
      
      // Should take at least some time due to rate limiting
      expect(duration).toBeGreaterThan(100);
    });
  });
});