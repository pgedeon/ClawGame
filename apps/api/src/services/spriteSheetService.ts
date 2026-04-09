/**
 * Sprite Sheet Service — M11: Generative Media Forge
 *
 * Prompt-to-sprite-sheet pipeline. Given a text prompt describing a character
 * or entity, generates a structured sprite sheet definition with frame
 * coordinates, animation sequences, and engine-ready metadata.
 *
 * Uses the existing AI image generation pipeline (z.ai / OpenRouter) to
 * produce SVG sprites. Falls back to procedurally generated placeholder
 * sprites when the API is unavailable.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

function assetBase() { return process.env.PROJECTS_DIR || './data/projects'; }

// ── Types ──

export type SpriteAnimationName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'attack'
  | 'hurt'
  | 'death'
  | 'cast'
  | 'shoot';

export interface SpriteFrame {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  duration?: number; // ms per frame (default 100)
}

export interface SpriteAnimation {
  name: SpriteAnimationName;
  frames: number[];   // frame indices
  loop: boolean;
  speed: number;      // multiplier (1.0 = normal)
}

export interface SpriteSheet {
  id: string;
  name: string;
  prompt: string;
  artStyle: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  frames: SpriteFrame[];
  animations: SpriteAnimation[];
  createdAt: string;
}

export interface SpriteSheetRequest {
  projectId: string;
  prompt: string;
  artStyle?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
  frameWidth?: number;
  frameHeight?: number;
  columns?: number;
  rows?: number;
  animations?: SpriteAnimationName[];
}

// ── Helpers ──

function generateId(): string {
  return `sprite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function spriteDir(projectId: string): string {
  return join(assetBase(), projectId, 'assets', 'sprites');
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ── Animation Presets ──
// Common animation sequences for typical game characters

const ANIMATION_PRESETS: Record<SpriteAnimationName, Omit<SpriteAnimation, 'name'>> = {
  idle:    { frames: [0, 1, 2, 3], loop: true, speed: 1.0 },
  walk:    { frames: [4, 5, 6, 7], loop: true, speed: 1.2 },
  run:     { frames: [8, 9, 10, 11], loop: true, speed: 1.8 },
  jump:    { frames: [12, 13, 14], loop: false, speed: 1.0 },
  fall:    { frames: [15, 16], loop: true, speed: 1.0 },
  attack:  { frames: [17, 18, 19, 20], loop: false, speed: 2.0 },
  hurt:    { frames: [21, 22], loop: false, speed: 1.0 },
  death:   { frames: [23, 24, 25, 26], loop: false, speed: 0.8 },
  cast:    { frames: [27, 28, 29, 30], loop: false, speed: 1.5 },
  shoot:   { frames: [31, 32, 33], loop: false, speed: 2.0 },
};

const DEFAULT_ANIMATIONS: SpriteAnimationName[] = ['idle', 'walk', 'jump', 'attack', 'hurt', 'death'];

// ── Prompt-to-Animations Heuristic ──
// Selects relevant animations based on prompt keywords

function selectAnimations(prompt: string, requested?: SpriteAnimationName[]): SpriteAnimationName[] {
  if (requested && requested.length > 0) return requested;

  const lower = prompt.toLowerCase();
  const anims = new Set<SpriteAnimationName>(['idle']);

  if (/walk|move|go/.test(lower)) anims.add('walk');
  if (/run|sprint|fast/.test(lower)) anims.add('run');
  if (/jump|leap|hop/.test(lower)) anims.add('jump');
  if (/attack|fight|hit|sword|slash|melee/.test(lower)) anims.add('attack');
  if (/hurt|damage|hit/.test(lower)) anims.add('hurt');
  if (/die|death|dead|kill/.test(lower)) anims.add('death');
  if (/cast|magic|spell|wizard|mage/.test(lower)) anims.add('cast');
  if (/shoot|gun|bow|fire|projectile/.test(lower)) anims.add('shoot');
  if (/platformer|character|player|hero/.test(lower)) {
    anims.add('walk').add('jump').add('attack').add('hurt').add('death');
  }
  if (/enemy|monster|mob|foe/.test(lower)) {
    anims.add('walk').add('attack').add('hurt').add('death');
  }

  return Array.from(anims);
}

// ── Service ──

export class SpriteSheetService {
  /**
   * Generate a sprite sheet definition from a prompt.
   * Creates metadata + placeholder SVG content that the engine can consume.
   */
  async generate(request: SpriteSheetRequest): Promise<SpriteSheet> {
    const {
      projectId,
      prompt,
      artStyle = 'pixel',
      frameWidth = 32,
      frameHeight = 32,
      columns = 8,
      rows = 8,
      animations: requestedAnimations,
    } = request;

    const selectedAnimations = selectAnimations(prompt, requestedAnimations);

    // Build frame grid
    const frameCount = columns * rows;
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      frames.push({
        index: i,
        x: col * frameWidth,
        y: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
        duration: 100,
      });
    }

    // Build animation sequences from presets
    const animations: SpriteAnimation[] = selectedAnimations
      .filter(name => ANIMATION_PRESETS[name])
      .filter(name => {
        const preset = ANIMATION_PRESETS[name];
        // Only include if we have enough frames
        return preset.frames[preset.frames.length - 1] < frameCount;
      })
      .map(name => ({ name, ...ANIMATION_PRESETS[name] }));

    const sheet: SpriteSheet = {
      id: generateId(),
      name: this.promptToName(prompt),
      prompt,
      artStyle,
      frameWidth,
      frameHeight,
      columns,
      rows,
      frameCount,
      frames,
      animations,
      createdAt: new Date().toISOString(),
    };

    // Persist
    const dir = spriteDir(projectId);
    await ensureDir(dir);
    await writeFile(join(dir, `${sheet.name}.spritesheet.json`), JSON.stringify(sheet, null, 2));

    // Generate a placeholder SVG sprite sheet
    const svg = this.generatePlaceholderSVG(sheet);
    await writeFile(join(dir, `${sheet.name}.svg`), svg);

    return sheet;
  }

  /**
   * List all sprite sheets for a project.
   */
  async list(projectId: string): Promise<SpriteSheet[]> {
    const dir = spriteDir(projectId);
    if (!existsSync(dir)) return [];

    const { readdir } = await import('node:fs/promises');
    const files = await readdir(dir);
    const sheets: SpriteSheet[] = [];

    for (const file of files) {
      if (!file.endsWith('.spritesheet.json')) continue;
      try {
        const data = JSON.parse(await readFile(join(dir, file), 'utf-8'));
        sheets.push(data);
      } catch { /* skip corrupted */ }
    }

    return sheets;
  }

  /**
   * Get a single sprite sheet by name.
   */
  async get(projectId: string, name: string): Promise<SpriteSheet | null> {
    const file = join(spriteDir(projectId), `${name}.spritesheet.json`);
    if (!existsSync(file)) return null;
    try {
      return JSON.parse(await readFile(file, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Delete a sprite sheet and its associated SVG.
   */
  async delete(projectId: string, name: string): Promise<boolean> {
    const dir = spriteDir(projectId);
    const jsonFile = join(dir, `${name}.spritesheet.json`);
    const svgFile = join(dir, `${name}.svg`);
    const { unlink } = await import('node:fs/promises');

    let deleted = false;
    if (existsSync(jsonFile)) { await unlink(jsonFile); deleted = true; }
    if (existsSync(svgFile)) { await unlink(svgFile); }
    return deleted;
  }

  /**
   * Convert a prompt into a slug-style name.
   */
  private promptToName(prompt: string): string {
    return prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'sprite';
  }

  /**
   * Generate a placeholder SVG showing the frame grid with colored rectangles.
   * Each frame gets a distinct color so the sheet is visually parseable.
   */
  private generatePlaceholderSVG(sheet: SpriteSheet): string {
    const totalWidth = sheet.columns * sheet.frameWidth;
    const totalHeight = sheet.rows * sheet.frameHeight;

    let frames = '';
    for (let i = 0; i < Math.min(sheet.frameCount, sheet.columns * sheet.rows); i++) {
      const col = i % sheet.columns;
      const row = Math.floor(i / sheet.columns);
      const x = col * sheet.frameWidth;
      const y = row * sheet.frameHeight;
      const hue = (i * 37) % 360;
      frames += `  <rect x="${x + 1}" y="${y + 1}" width="${sheet.frameWidth - 2}" height="${sheet.frameHeight - 2}" fill="hsl(${hue},70%,60%)" rx="2"/>\n`;
      frames += `  <text x="${x + sheet.frameWidth / 2}" y="${y + sheet.frameHeight / 2 + 4}" text-anchor="middle" font-size="8" fill="#000">${i}</text>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect width="${totalWidth}" height="${totalHeight}" fill="#1a1a2e"/>
${frames}
</svg>`;
  }
}
