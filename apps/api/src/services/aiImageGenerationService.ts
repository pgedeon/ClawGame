/**
 * AI Image Generation Service
 * Uses OpenRouter LLM to generate SVG assets from text prompts.
 * This provides real AI-powered asset generation without ComfyUI dependency.
 */

import axios, { type AxiosInstance } from 'axios';
import { FastifyLoggerInstance } from 'fastify';
import type { AssetType } from './assetService';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = 'qwen/qwen3.6-plus:free';

// Types for AI image generation
export interface AIImageGenerationRequest {
  type: AssetType;
  prompt: string;
  style: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
  width: number;
  height: number;
  format: 'svg' | 'png' | 'webp';
  backgroundColor?: string;
}

export interface AIImageGenerationResponse {
  success: boolean;
  svg?: string;
  png?: string;
  error?: string;
  generatedAt: string;
  generationTime: number;
}

export interface GenerationStatus {
  id: string;
  projectId: string;
  type: AssetType;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  result?: AIImageGenerationResponse;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Style definitions for different art styles
const STYLE_PROMPTS: Record<string, string> = {
  pixel: `
    Pixel art style. Use a limited color palette of 8-16 colors.
    Create crisp, blocky pixels. No gradients or smooth curves.
    Each pixel should be clearly visible. Retro gaming aesthetic.
    Think: NES, Game Boy, or modern pixel art games.
  `,
  vector: `
    Vector art style. Clean, scalable lines and shapes.
    Use smooth curves and geometric forms. Minimal details.
    Professional and modern look. Think: Adobe Illustrator style.
    Flat design with bold colors.
  `,
  'hand-drawn': `
    Hand-drawn style. Sketchy, organic lines with imperfections.
    Look like it was drawn by hand. Use wobbly lines and variations.
    Soft edges and organic shapes. Think: children's book illustrations.
    Playful and creative feel.
  `,
  cartoon: `
    Cartoon style. Bold outlines, exaggerated proportions.
    Simplified shapes with minimal details. Bright, flat colors.
    Playful and friendly appearance. Think: Pixar or Disney style.
    Expressive and whimsical.
  `,
  realistic: `
    Realistic style. Photorealistic details and accurate proportions.
    Use gradients and subtle shading. Focus on accuracy and realism.
    Detailed textures and lighting. Think: game asset realism.
    High quality and professional.
  `,
};

// Asset type prompts to guide generation
const ASSET_TYPE_GUIDES: Record<AssetType, string> = {
  sprite: `
    Create a sprite character/creature/object. Should be self-contained.
    Make it game-ready with clear boundaries. 64x64 or smaller.
    Character sprites should face the viewer for visibility.
    Include personality and detail within the small size.
  `,
  tileset: `
    Create a tileset for games. Multiple tiles arranged in a grid.
    Each tile should be separate and self-contained.
    Align to a grid system. Multiple variations recommended.
    Include edge pieces and corners for tiling.
  `,
  texture: `
    Create a texture pattern. Should tile seamlessly.
    Focus on surface details and patterns. Natural or abstract.
    Consider lighting and depth. Should work for backgrounds.
  `,
  icon: `
    Create a simple, recognizable icon. Should be instantly understandable.
    Outline style usually works best. Minimal details, maximum clarity.
    Work well at small sizes. Think: game UI elements.
  `,
  audio: `
    Create a simple musical note or sound wave icon.
    Abstract representation of sound/music.
    Should represent audio/music concept clearly.
  `,
  background: `
    Create a background pattern or scene. Should be interesting but not distracting.
    Good for game backgrounds. Consider tileability.
    Set the mood or environment. Atmospheric and evocative.
  `,
};

export class AIImageGenerationService {
  private axios: AxiosInstance;
  private logger: FastifyLoggerInstance;
  private pendingGenerations: Map<string, GenerationStatus> = new Map();

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.axios = axios.create({
      baseURL: OPENROUTER_API_URL,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
        'X-Title': 'ClawGame AI-Powered Game Engine',
      },
      timeout: 60000, // 60 second timeout
    });
  }

  /**
   * Generate an AI image from text prompt
   */
  async generateImage(projectId: string, request: AIImageGenerationRequest): Promise<GenerationStatus> {
    const generationId = this.generateId();
    const startTime = Date.now();

    // Create generation status
    const status: GenerationStatus = {
      id: generationId,
      projectId,
      type: request.type,
      prompt: request.prompt,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.pendingGenerations.set(generationId, status);

    try {
      // Update status to generating
      status.status = 'generating';
      status.progress = 10;
      status.updatedAt = new Date().toISOString();
      this.pendingGenerations.set(generationId, status);

      // Build the SVG generation prompt
      const svgCode = await this.generateSvgCode(request, status);

      // Update progress
      status.progress = 90;
      status.updatedAt = new Date().toISOString();
      this.pendingGenerations.set(generationId, status);

      // Validate and clean the SVG
      const cleanedSvg = this.cleanSvg(svgCode);

      // Complete the generation
      status.status = 'completed';
      status.progress = 100;
      status.result = {
        success: true,
        svg: cleanedSvg,
        generatedAt: new Date().toISOString(),
        generationTime: Date.now() - startTime,
      };
      status.updatedAt = new Date().toISOString();

      this.logger.info({ 
        projectId, 
        generationId, 
        type: request.type,
        prompt: request.prompt,
        duration: status.result.generationTime 
      }, 'AI image generation completed');

    } catch (error: any) {
      // Mark as failed
      status.status = 'failed';
      status.error = error.message || 'Unknown error during image generation';
      status.updatedAt = new Date().toISOString();

      this.logger.error({ 
        projectId, 
        generationId, 
        error: error.message,
        stack: error.stack 
      }, 'AI image generation failed');
    }

    this.pendingGenerations.set(generationId, status);
    return status;
  }

  /**
   * Get generation status by ID
   */
  async getGenerationStatus(projectId: string, generationId: string): Promise<GenerationStatus | null> {
    const status = this.pendingGenerations.get(generationId);
    if (!status || status.projectId !== projectId) {
      return null;
    }
    return status;
  }

  /**
   * List all pending/completed generations for a project
   */
  async getGenerations(projectId: string): Promise<GenerationStatus[]> {
    return Array.from(this.pendingGenerations.values())
      .filter(gen => gen.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Clean up old completed generations
   */
  cleanupOldGenerations(maxAge: number = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    for (const [id, status] of this.pendingGenerations) {
      if (status.status === 'completed' && new Date(status.createdAt).getTime() < cutoff) {
        this.pendingGenerations.delete(id);
      }
    }
  }

  private async generateSvgCode(request: AIImageGenerationRequest, statusUpdater: GenerationStatus): Promise<string> {
    const systemPrompt = `
You are an expert SVG designer for game development.

Task: Generate a clean, professional SVG code for a game asset.

Requirements:
- Output ONLY the SVG code between \`\`\`svg and \`\`\` markers
- Make it game-ready with good contrast and visibility
- Keep it simple but detailed enough for game use
- Ensure it scales well
- Use appropriate colors for ${request.type}
${STYLE_PROMPTS[request.style]}
${ASSET_TYPE_GUIDES[request.type]}

Constraints:
- Size: ${request.width}x${request.height}
- Format: ${request.format}
- Background: ${request.backgroundColor || 'transparent'}
- No external dependencies
- Use inline styles, not CSS classes
- Include proper viewBox and dimensions

Generate the SVG code now:
`;

    const userPrompt = `Asset Type: ${request.type}
Style: ${request.style}
Description: ${request.prompt}
Size: ${request.width}x${request.height}
Background: ${request.backgroundColor || 'transparent'}

\`\`\`svg`;

    try {
      const response = await this.axios.post('', {
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt.trim() },
          { role: 'user', content: userPrompt.trim() },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 2000,
      });

      const aiResponse = response.data.choices[0].message.content;
      
      // Extract SVG from response (might be wrapped in markdown)
      const svgMatch = aiResponse.match(/```svg\s*\n([\s\S]*?)\n```/);
      if (svgMatch) {
        return svgMatch[1].trim();
      }

      // If no markdown, look for svg tags
      const startTag = aiResponse.indexOf('<svg');
      const endTag = aiResponse.lastIndexOf('</svg>');
      if (startTag !== -1 && endTag !== -1) {
        return aiResponse.substring(startTag, endTag + 6).trim();
      }

      throw new Error('AI did not return valid SVG code');
      
    } catch (error: any) {
      this.logger.error({ err: error.response?.data || error.message }, 'SVG generation failed');
      throw new Error(`Failed to generate SVG: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private cleanSvg(svgCode: string): string {
    // Remove any explanatory text or markdown formatting
    let cleaned = svgCode
      .replace(/```svg\s*\n?/, '')
      .replace(/\n?```/, '')
      .trim();

    // Ensure it has proper structure
    if (!cleaned.includes('<svg') || !cleaned.includes('</svg>')) {
      throw new Error('Generated content is not a valid SVG');
    }

    // Remove any XML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Ensure proper escaping
    cleaned = cleaned.replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;');

    return cleaned;
  }

  private generateId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Health check for AI image generation service
   */
  async healthCheck(): Promise<{ status: string; service: string; model: string; features: string[] }> {
    try {
      // Test API with minimal request
      await this.axios.post('', {
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });

      return {
        status: 'ok',
        service: 'ai-image-generation',
        model: DEFAULT_MODEL,
        features: [
          'real-time SVG generation from text prompts',
          'Multiple art styles (pixel, vector, hand-drawn, cartoon, realistic)',
          'Multiple asset types (sprite, tileset, texture, icon, audio, background)',
          'Game-optimized asset generation',
        ],
      };
    } catch (error: any) {
      this.logger.error({ err: error.message }, 'AI image generation health check failed');
      return {
        status: 'error',
        service: 'ai-image-generation',
        model: DEFAULT_MODEL,
        features: [],
      };
    }
  }
}