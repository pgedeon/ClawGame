/**
 * AI Image Generation Service — Unified
 * Uses the same z.ai API as the command service for SVG generation.
 * Falls back to local placeholder SVGs when the API is unavailable.
 */

import { FastifyLoggerInstance } from 'fastify';
import type { AssetType } from './assetService';

// ── Configuration ──

const AI_API_URL = process.env.AI_API_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'glm-4.5-flash';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

// ── Types ──

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
  assetType: AssetType;
  prompt: string;
  content: string; // SVG markup or base64 data
  format: string;
  width: number;
  height: number;
  generationTime: number;
  isAIGenerated: boolean;
}

export interface GenerationStatus {
  status: 'idle' | 'generating' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface GenerationResult {
  metadata: {
    id: string;
    type: AssetType;
    prompt: string;
    style: string;
    width: number;
    height: number;
    format: string;
    generationTime: number;
    aiGeneration: {
      model: string;
      prompt: string;
      generatedAt: string;
    };
  };
  content: string; // SVG or base64
}

// ── SVG Color Palettes by Style ──

const PALETTES = {
  pixel: {
    bg: '#1a1a2e', primary: '#e94560', secondary: '#0f3460', accent: '#16213e',
    highlights: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'],
  },
  vector: {
    bg: '#f8f9fa', primary: '#4361ee', secondary: '#3a0ca3', accent: '#7209b7',
    highlights: ['#4cc9f0', '#f72585', '#b5179e', '#560bad'],
  },
  'hand-drawn': {
    bg: '#fefae0', primary: '#606c38', secondary: '#283618', accent: '#dda15e',
    highlights: ['#bc6c25', '#a3b18a', '#344e41', '#588157'],
  },
  cartoon: {
    bg: '#fff3b0', primary: '#ff6f61', secondary: '#3d5a80', accent: '#ee6c4d',
    highlights: ['#293241', '#98c1d9', '#e0fbfc', '#118ab2'],
  },
  realistic: {
    bg: '#2d3436', primary: '#636e72', secondary: '#b2bec3', accent: '#dfe6e9',
    highlights: ['#74b9ff', '#a29bfe', '#fd79a8', '#ffeaa7'],
  },
};

// ── Service ──

export class AIImageGenerationService {
  private logger: FastifyLoggerInstance;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
  }

  async generateAsset(request: AIImageGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Try AI generation first
    if (AI_API_KEY) {
      try {
        const svgContent = await this.callAIForSVG(request);
        if (svgContent) {
          return {
            metadata: {
              id,
              type: request.type,
              prompt: request.prompt,
              style: request.style,
              width: request.width,
              height: request.height,
              format: 'svg',
              generationTime: Date.now() - startTime,
              aiGeneration: {
                model: AI_MODEL,
                prompt: request.prompt,
                generatedAt: new Date().toISOString(),
              },
            },
            content: svgContent,
          };
        }
      } catch (err: any) {
        this.logger.warn({ err: err.message }, 'AI SVG generation failed, using local fallback');
      }
    }

    // Fallback: generate SVG locally
    const svgContent = this.generateLocalSVG(request);
    return {
      metadata: {
        id,
        type: request.type,
        prompt: request.prompt,
        style: request.style,
        width: request.width,
        height: request.height,
        format: 'svg',
        generationTime: Date.now() - startTime,
        aiGeneration: {
          model: 'local-svg-generator',
          prompt: request.prompt,
          generatedAt: new Date().toISOString(),
        },
      },
      content: svgContent,
    };
  }

  // ── AI SVG Generation ──

  private async callAIForSVG(request: AIImageGenerationRequest): Promise<string | null> {
    const prompt = this.buildSVGPrompt(request);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
            'X-Title': 'ClawGame Asset Generator',
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: 'You are a game asset designer. Generate ONLY valid SVG code. No explanations, no markdown fences, just raw SVG starting with <svg and ending with </svg>.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`API ${response.status}`);
        }

        const data = await response.json() as any;
        let content = data.choices?.[0]?.message?.content || '';

        // Extract SVG from possible markdown fences
        const svgMatch = content.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
          return svgMatch[0];
        }

        if (content.includes('<svg')) {
          return content;
        }

        this.logger.warn('AI response did not contain valid SVG');
        return null;
      } catch (err: any) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    return null;
  }

  private buildSVGPrompt(request: AIImageGenerationRequest): string {
    return `Create a ${request.style} style game asset: ${request.prompt}

Requirements:
- SVG format, viewBox="0 0 ${request.width} ${request.height}"
- ${request.style} art style
- Game-ready: clear silhouette, readable at small sizes
- Type: ${request.type} (sprite/tileset/icon/background)
- Background: ${request.backgroundColor || 'transparent'}
- Use vibrant, contrasting colors
- Clean, scalable vector art
- No text unless specifically requested`;
  }

  // ── Local SVG Generation Fallback ──

  private generateLocalSVG(request: AIImageGenerationRequest): string {
    const { type, prompt, style, width, height, backgroundColor } = request;
    const palette = PALETTES[style] || PALETTES.pixel;

    switch (type) {
      case 'sprite':
        return this.generateSpriteSVG(prompt, width, height, palette);
      case 'tileset':
        return this.generateTilesetSVG(prompt, width, height, palette);
      case 'icon':
        return this.generateIconSVG(prompt, width, height, palette);
      case 'background':
        return this.generateBackgroundSVG(prompt, width, height, palette);
      case 'texture':
        return this.generateTextureSVG(prompt, width, height, palette);
      default:
        return this.generateGenericSVG(prompt, width, height, palette);
    }
  }

  private generateSpriteSVG(prompt: string, w: number, h: number, palette: any): string {
    const isPlayer = /player|hero|character|knight|warrior/i.test(prompt);
    const isEnemy = /enemy|monster|zombie|ghost|skeleton|slime/i.test(prompt);
    const isNpc = /npc|villager|shop|merchant/i.test(prompt);

    if (isPlayer) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="transparent"/>
  <!-- Body -->
  <rect x="${w*0.2}" y="${h*0.25}" width="${w*0.6}" height="${h*0.5}" rx="4" fill="${palette.primary}"/>
  <!-- Head -->
  <circle cx="${w*0.5}" cy="${h*0.2}" r="${w*0.18}" fill="${palette.highlights[0]}"/>
  <!-- Eyes -->
  <circle cx="${w*0.4}" cy="${h*0.18}" r="${w*0.04}" fill="#fff"/>
  <circle cx="${w*0.6}" cy="${h*0.18}" r="${w*0.04}" fill="#fff"/>
  <circle cx="${w*0.42}" cy="${h*0.18}" r="${w*0.02}" fill="#333"/>
  <circle cx="${w*0.62}" cy="${h*0.18}" r="${w*0.02}" fill="#333"/>
  <!-- Legs -->
  <rect x="${w*0.25}" y="${h*0.75}" width="${w*0.18}" height="${h*0.2}" rx="2" fill="${palette.secondary}"/>
  <rect x="${w*0.57}" y="${h*0.75}" width="${w*0.18}" height="${h*0.2}" rx="2" fill="${palette.secondary}"/>
  <!-- Arms -->
  <rect x="${w*0.08}" y="${h*0.3}" width="${w*0.12}" height="${h*0.35}" rx="3" fill="${palette.accent}"/>
  <rect x="${w*0.8}" y="${h*0.3}" width="${w*0.12}" height="${h*0.35}" rx="3" fill="${palette.accent}"/>
  <!-- Label -->
  <text x="${w*0.5}" y="${h*0.98}" text-anchor="middle" font-size="8" fill="${palette.primary}">Player</text>
</svg>`;
    }

    if (isEnemy) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="transparent"/>
  <!-- Body -->
  <ellipse cx="${w*0.5}" cy="${h*0.5}" rx="${w*0.35}" ry="${h*0.35}" fill="${palette.primary}"/>
  <!-- Eyes (angry) -->
  <polygon points="${w*0.3},${h*0.35} ${w*0.42},${h*0.3} ${w*0.42},${h*0.42}" fill="#ff0"/>
  <polygon points="${w*0.7},${h*0.35} ${w*0.58},${h*0.3} ${w*0.58},${h*0.42}" fill="#ff0"/>
  <circle cx="${w*0.36}" cy="${h*0.38}" r="${w*0.03}" fill="#f00"/>
  <circle cx="${w*0.64}" cy="${h*0.38}" r="${w*0.03}" fill="#f00"/>
  <!-- Mouth -->
  <path d="M${w*0.3},${h*0.6} L${w*0.4},${h*0.65} L${w*0.5},${h*0.6} L${w*0.6},${h*0.65} L${w*0.7},${h*0.6}" stroke="#fff" fill="none" stroke-width="2"/>
  <!-- Spikes -->
  <polygon points="${w*0.2},${h*0.2} ${w*0.3},${h*0.05} ${w*0.4},${h*0.2}" fill="${palette.accent}"/>
  <polygon points="${w*0.45},${h*0.15} ${w*0.5},${h*0.0} ${w*0.55},${h*0.15}" fill="${palette.accent}"/>
  <polygon points="${w*0.6},${h*0.2} ${w*0.7},${h*0.05} ${w*0.8},${h*0.2}" fill="${palette.accent}"/>
  <text x="${w*0.5}" y="${h*0.98}" text-anchor="middle" font-size="8" fill="${palette.primary}">Enemy</text>
</svg>`;
    }

    // Generic character sprite
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="transparent"/>
  <rect x="${w*0.15}" y="${h*0.15}" width="${w*0.7}" height="${h*0.7}" rx="6" fill="${palette.primary}" stroke="${palette.secondary}" stroke-width="2"/>
  <circle cx="${w*0.35}" cy="${h*0.4}" r="${w*0.06}" fill="#fff"/>
  <circle cx="${w*0.65}" cy="${h*0.4}" r="${w*0.06}" fill="#fff"/>
  <rect x="${w*0.35}" y="${h*0.6}" width="${w*0.3}" height="${h*0.06}" rx="3" fill="${palette.accent}"/>
  <text x="${w*0.5}" y="${h*0.95}" text-anchor="middle" font-size="7" fill="${palette.secondary}">Sprite</text>
</svg>`;
  }

  private generateTilesetSVG(prompt: string, w: number, h: number, palette: any): string {
    const tileSize = 32;
    const cols = Math.floor(w / tileSize);
    const rows = Math.floor(h / tileSize);
    let tiles = '';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const color = palette.highlights[(r * cols + c) % palette.highlights.length];
        const variant = (r + c) % 3;
        if (variant === 0) {
          tiles += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${color}"/>`;
          tiles += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${palette.secondary}" stroke-width="1"/>`;
        } else if (variant === 1) {
          tiles += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${palette.secondary}"/>`;
          tiles += `<circle cx="${x+tileSize/2}" cy="${y+tileSize/2}" r="4" fill="${color}" opacity="0.6"/>`;
        } else {
          tiles += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${palette.accent}"/>`;
          tiles += `<line x1="${x}" y1="${y}" x2="${x+tileSize}" y2="${y+tileSize}" stroke="${color}" stroke-width="1" opacity="0.4"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.bg}"/>
  ${tiles}
</svg>`;
  }

  private generateIconSVG(prompt: string, w: number, h: number, palette: any): string {
    const isSword = /sword|weapon|blade/i.test(prompt);
    const isShield = /shield|armor/i.test(prompt);
    const isPotion = /potion|health|mana|magic/i.test(prompt);
    const isCoin = /coin|gold|money|gem/i.test(prompt);
    const isHeart = /heart|life|hp/i.test(prompt);
    const isStar = /star|power/i.test(prompt);

    if (isHeart) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <path d="M${w*0.5},${h*0.85} L${w*0.1},${h*0.4} C${w*0.1},${h*0.1} ${w*0.5},${h*0.1} ${w*0.5},${h*0.35} C${w*0.5},${h*0.1} ${w*0.9},${h*0.1} ${w*0.9},${h*0.4} Z" fill="${palette.primary}"/>
  <path d="M${w*0.35},${h*0.25} L${w*0.4},${h*0.3}" stroke="#fff" stroke-width="2" opacity="0.6"/>
</svg>`;
    }

    if (isCoin) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.4}" fill="${palette.highlights[1]}"/>
  <circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.32}" fill="${palette.highlights[1]}" stroke="${palette.primary}" stroke-width="2"/>
  <text x="${w*0.5}" y="${h*0.62}" text-anchor="middle" font-size="${Math.min(w,h)*0.35}" font-weight="bold" fill="${palette.secondary}">$</text>
</svg>`;
    }

    if (isPotion) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect x="${w*0.35}" y="${h*0.1}" width="${w*0.3}" height="${h*0.15}" rx="2" fill="${palette.secondary}"/>
  <path d="M${w*0.3},${h*0.25} L${w*0.25},${h*0.5} Q${w*0.25},${h*0.85} ${w*0.5},${h*0.85} Q${w*0.75},${h*0.85} ${w*0.75},${h*0.5} L${w*0.7},${h*0.25} Z" fill="${palette.primary}" opacity="0.8"/>
  <ellipse cx="${w*0.5}" cy="${h*0.55}" rx="${w*0.15}" ry="${h*0.1}" fill="#fff" opacity="0.3"/>
</svg>`;
    }

    // Generic icon
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" rx="${Math.min(w,h)*0.15}" fill="${palette.primary}"/>
  <circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.3}" fill="${palette.highlights[0]}"/>
  <text x="${w*0.5}" y="${h*0.58}" text-anchor="middle" font-size="${Math.min(w,h)*0.25}" fill="#fff">✦</text>
</svg>`;
  }

  private generateBackgroundSVG(prompt: string, w: number, h: number, palette: any): string {
    const isSky = /sky|cloud|day|sunset/i.test(prompt);
    const isCave = /cave|dungeon|dark|underground/i.test(prompt);
    const isForest = /forest|tree|nature|jungle/i.test(prompt);
    const isSpace = /space|star|galaxy|cosmos/i.test(prompt);

    let bgGradient = '';
    let elements = '';

    if (isSky) {
      bgGradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#87CEEB"/><stop offset="100%" stop-color="#E0F7FA"/>
      </linearGradient></defs>`;
      for (let i = 0; i < 5; i++) {
        const cx = Math.random() * w;
        const cy = h * 0.1 + Math.random() * h * 0.3;
        elements += `<ellipse cx="${cx}" cy="${cy}" rx="${30+Math.random()*40}" ry="${15+Math.random()*15}" fill="#fff" opacity="0.7"/>`;
      }
    } else if (isCave) {
      bgGradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/>
      </linearGradient></defs>`;
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        elements += `<circle cx="${cx}" cy="${cy}" r="${1+Math.random()*3}" fill="${palette.highlights[Math.floor(Math.random()*4)]}" opacity="${0.3+Math.random()*0.5}"/>`;
      }
    } else if (isForest) {
      bgGradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2d6a4f"/><stop offset="100%" stop-color="#1b4332"/>
      </linearGradient></defs>`;
      for (let i = 0; i < 8; i++) {
        const tx = i * (w / 8) + 10;
        elements += `<polygon points="${tx},${h*0.7} ${tx+25},${h*0.2} ${tx+50},${h*0.7}" fill="#40916c" opacity="0.8"/>`;
      }
    } else if (isSpace) {
      bgGradient = `<defs><radialGradient id="bg" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#0d1b2a"/><stop offset="100%" stop-color="#000"/>
      </radialGradient></defs>`;
      for (let i = 0; i < 50; i++) {
        elements += `<circle cx="${Math.random()*w}" cy="${Math.random()*h}" r="${0.5+Math.random()*1.5}" fill="#fff" opacity="${0.3+Math.random()*0.7}"/>`;
      }
    } else {
      bgGradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette.bg}"/><stop offset="100%" stop-color="${palette.secondary}"/>
      </linearGradient></defs>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${bgGradient}
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${elements}
</svg>`;
  }

  private generateTextureSVG(prompt: string, w: number, h: number, palette: any): string {
    const isGrass = /grass|green|lawn/i.test(prompt);
    const isStone = /stone|rock|brick|wall/i.test(prompt);
    const isWater = /water|ocean|sea|river/i.test(prompt);

    let pattern = '';
    const size = 16;

    if (isGrass) {
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          const shade = ['#4a7c59', '#5a8f69', '#3d6b4a'][(Math.floor(x/size) + Math.floor(y/size)) % 3];
          pattern += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${shade}"/>`;
          if (Math.random() > 0.6) {
            pattern += `<line x1="${x+size/2}" y1="${y+size}" x2="${x+size/2-2}" y2="${y+size-6}" stroke="#6db33f" stroke-width="1"/>`;
          }
        }
      }
    } else if (isStone) {
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          const shade = ['#808080', '#707070', '#909090'][(Math.floor(x/size) + Math.floor(y/size)) % 3];
          pattern += `<rect x="${x}" y="${y}" width="${size-1}" height="${size-1}" fill="${shade}"/>`;
        }
      }
    } else if (isWater) {
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          pattern += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#2980b9" opacity="${0.7+Math.random()*0.3}"/>`;
          pattern += `<path d="M${x},${y+size/2} Q${x+size/4},${y+size/2-3} ${x+size/2},${y+size/2} Q${x+size*3/4},${y+size/2+3} ${x+size},${y+size/2}" fill="none" stroke="#3498db" stroke-width="1" opacity="0.5"/>`;
        }
      }
    } else {
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          const color = palette.highlights[(Math.floor(x/size) + Math.floor(y/size)) % palette.highlights.length];
          pattern += `<rect x="${x}" y="${y}" width="${size-1}" height="${size-1}" fill="${color}" opacity="0.5"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${pattern}
</svg>`;
  }

  private generateGenericSVG(prompt: string, w: number, h: number, palette: any): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" rx="4" fill="${palette.bg}"/>
  <rect x="${w*0.1}" y="${h*0.1}" width="${w*0.8}" height="${h*0.8}" rx="4" fill="${palette.primary}" opacity="0.8"/>
  <text x="${w*0.5}" y="${h*0.5}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(w,h)*0.15}" fill="#fff" font-family="sans-serif">Asset</text>
</svg>`;
  }

  // ── Status ──

  async getStatus(projectId: string, generationId: string): Promise<GenerationStatus> {
    return { status: 'completed', progress: 100, message: 'Generation complete' };
  }

  async healthCheck(): Promise<{ status: string; service: string; model: string; features: string[] }> {
    if (!AI_API_KEY) {
      return {
        status: 'ok',
        service: 'ai-image-generation',
        model: 'local-svg-generator',
        features: ['local-svg-generation', 'style-aware-palettes', 'asset-type-templates'],
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      return {
        status: 'ok',
        service: 'ai-image-generation',
        model: AI_MODEL,
        features: ['ai-svg-generation', 'local-svg-fallback', 'style-aware-palettes', 'asset-type-templates'],
      };
    } catch {
      return {
        status: 'fallback',
        service: 'ai-image-generation',
        model: 'local-svg-generator',
        features: ['local-svg-generation', 'style-aware-palettes'],
      };
    }
  }
}
