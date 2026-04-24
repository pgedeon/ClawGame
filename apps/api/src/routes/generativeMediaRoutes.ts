/**
 * Generative Media Routes - M11: Generative Media Forge
 * AI-powered image, sprite, and asset generation with Z.ai integration
 */

import { FastifyInstance } from 'fastify';
import { generativeMediaService } from '../services/generativeMediaService';
import { 
  AssetType, 
  GenerationQuality,
  GenerationFormat,
  GenerationAspectRatio,
  AnimationType 
} from '../types/index';

// ── Single Asset Generation ──

export async function generativeMediaRoutes(fastify: FastifyInstance) {
  // Generate a single asset
  fastify.post<{
    Body: {
      projectId: string;
      type: AssetType;
      prompt: string;
      style?: string;
      quality: GenerationQuality;
      format: GenerationFormat;
      width?: number;
      height?: number;
      aspectRatio?: GenerationAspectRatio;
      backgroundColor?: string;
      model?: string;
    };
    Reply: { success: boolean; data?: any; error?: string; generationId?: string };
  }>('/generative-media/generate', async (request, reply) => {
    try {
      const { projectId, type, prompt, style, quality, format, width, height, aspectRatio, backgroundColor, model } = request.body;
      
      const result = await generativeMediaService.generateAsset({
        projectId,
        type,
        prompt,
        style,
        quality,
        format,
        width,
        height,
        aspectRatio,
        backgroundColor,
        model
      });
      
      return {
        success: true,
        data: result.content,
        metadata: result.metadata,
        generationId: result.metadata.generationId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      fastify.log.error({ err: error }, 'Generation failed');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // ── Sprite Sheet Generation ──

  // Generate sprite sheet with animation frames
  fastify.post<{
    Body: {
      projectId: string;
      type: AssetType;
      prompt: string;
      animationType: AnimationType;
      frameCount: number;
      frameDelay: number;
      loop: boolean;
      style?: string;
      quality: GenerationQuality;
      format: GenerationFormat;
      width?: number;
      height?: number;
    };
    Reply: { success: boolean; data?: any; error?: string; generationId?: string };
  }>('/generative-media/sprite-sheet', async (request, reply) => {
    try {
      const { projectId, type, prompt, animationType, frameCount, frameDelay, loop, style, quality, format, width, height } = request.body;
      
      const result = await generativeMediaService.generateSpriteSheet({
        projectId,
        type,
        prompt,
        animationType,
        frameCount,
        frameDelay,
        loop,
        style: style || 'pixel-art',
        quality,
        format,
        width: width || 64,
        height: height || 64,
        frames: frameCount,
      });
      
      return {
        success: true,
        data: result,
        metadata: {
          spriteSheetId: result[0]?.metadata.generationId,
          frameCount: result.length,
          animationType,
          frameDelay,
          loop
        },
        generationId: result[0]?.metadata.generationId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sprite sheet generation failed';
      fastify.log.error({ err: error }, 'Sprite sheet generation failed');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // ── Asset Pack Generation ──

  // Generate asset pack with multiple assets
  fastify.post<{
    Body: {
      projectId: string;
      packTemplate: string;
      customAssets?: Array<{
        type: AssetType;
        prompt: string;
        style?: string;
        quality: GenerationQuality;
        format: GenerationFormat;
      }>;
      style?: string;
      quality: GenerationQuality;
    };
    Reply: { success: boolean; data?: any; error?: string; generationId?: string };
  }>('/generative-media/asset-pack', async (request, reply) => {
    try {
      const { projectId, packTemplate, customAssets, style, quality } = request.body;
      
      const result = await generativeMediaService.generateAssetPack({
        projectId,
        gameConcept: packTemplate,
        artStyle: style,
        countPerType: customAssets?.length || 1,
      });
      
      return {
        success: true,
        data: result,
        metadata: {
          packId: result[0]?.metadata.generationId,
          assetCount: result.length,
          template: packTemplate
        },
        generationId: result[0]?.metadata.generationId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Asset pack generation failed';
      fastify.log.error({ err: error }, 'Asset pack generation failed');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // ── Job Management ──

  // Get job status
  fastify.get<{
    Params: { jobId: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/jobs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params;
      
      const job = await generativeMediaService.getJob(jobId);
      if (!job) {
        return reply.code(404).send({
          success: false,
          error: 'Job not found'
        });
      }
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get job status';
      fastify.log.error({ err: error }, 'Failed to get job status');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Get project jobs
  fastify.get<{
    Params: { projectId: string };
    Querystring: { status?: string; limit?: number; offset?: number };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/projects/:projectId/jobs', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { status, limit = 50, offset = 0 } = request.query;
      
      const jobs = await generativeMediaService.getProjectJobs(projectId, status, limit, offset);
      
      return {
        success: true,
        data: jobs
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get project jobs';
      fastify.log.error({ err: error }, 'Failed to get project jobs');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Get generation history
  fastify.get<{
    Params: { projectId: string };
    Querystring: { type?: AssetType; limit?: number; offset?: number };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/projects/:projectId/history', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { type, limit = 50, offset = 0 } = request.query;
      
      const history = await generativeMediaService.getGenerationHistory(projectId, type as AssetType, limit, offset);
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get generation history';
      fastify.log.error({ err: error }, 'Failed to get generation history');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // ── Configuration Endpoints ──

  // Get available media types
  fastify.get<{
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/types', async (request, reply) => {
    try {
      const types = generativeMediaService.getMediaTypes();
      
      return {
        success: true,
        data: types
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get media types';
      fastify.log.error({ err: error }, 'Failed to get media types');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Get available style presets
  fastify.get<{
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/styles', async (request, reply) => {
    try {
      const styles = generativeMediaService.getStylePresets();
      
      return {
        success: true,
        data: styles
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get style presets';
      fastify.log.error({ err: error }, 'Failed to get style presets');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Get available animation types
  fastify.get<{
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/animations', async (request, reply) => {
    try {
      const animations = generativeMediaService.getAnimationTypes();
      
      return {
        success: true,
        data: animations
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get animation types';
      fastify.log.error({ err: error }, 'Failed to get animation types');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // ── Batch Operations ──

  // Cancel job
  fastify.delete<{
    Params: { jobId: string };
    Reply: { success: boolean; error?: string };
  }>('/generative-media/jobs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params;
      
      const cancelled = await generativeMediaService.cancelJob(jobId);
      if (!cancelled) {
        return reply.code(404).send({
          success: false,
          error: 'Job not found or cannot be cancelled'
        });
      }
      
      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel job';
      fastify.log.error({ err: error }, 'Failed to cancel job');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Retry failed job
  fastify.post<{
    Params: { jobId: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/generative-media/jobs/:jobId/retry', async (request, reply) => {
    try {
      const { jobId } = request.params;
      
      const result = await generativeMediaService.retryJob(jobId);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry job';
      fastify.log.error({ err: error }, 'Failed to retry job');
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage
      });
    }
  });
}
