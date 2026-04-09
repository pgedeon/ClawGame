/**
 * SFX Generation Service — M11: Generative Media Forge
 *
 * Generates structured sound effect metadata for game projects.
 * Uses the existing AI pipeline (z.ai / OpenRouter) to produce SFX descriptions,
 * then stores them as project assets with engine-consumable metadata.
 *
 * For now, SFX files are represented as metadata (name, category, tags, parameters)
 * that can be used by the engine's audio system or fed to audio generation APIs later.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

function assetBase() { return process.env.PROJECTS_DIR || './data/projects'; }

// ── Types ──

export interface SFXDescriptor {
  id: string;
  name: string;
  category: SFXCategory;
  tags: string[];
  description: string;
  parameters: SFXParameters;
  createdAt: string;
}

export type SFXCategory =
  | 'combat'
  | 'movement'
  | 'environment'
  | 'ui'
  | 'voice'
  | 'impact'
  | 'magic'
  | 'ambient';

export interface SFXParameters {
  duration?: number;    // seconds
  looping?: boolean;
  volume?: number;      // 0.0 – 1.0
  pitch?: number;       // 0.5 – 2.0
  spatial?: boolean;    // 3D positional audio
}

export interface SFXPackRequest {
  projectId: string;
  gameGenre: string;
  style?: string;
  count?: number;
}

export interface SFXPack {
  id: string;
  name: string;
  genre: string;
  style: string;
  effects: SFXDescriptor[];
  createdAt: string;
}

// ── Helpers ──

function generateId(): string {
  return `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sfxDir(projectId: string): string {
  return join(assetBase(), projectId, 'assets', 'sfx');
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ── SFX Library Templates ──
// Genre-aware SFX templates that provide useful defaults without AI

const GENRE_SFX_TEMPLATES: Record<string, Array<{
  name: string;
  category: SFXCategory;
  tags: string[];
  description: string;
  parameters: SFXParameters;
}>> = {
  platformer: [
    { name: 'jump', category: 'movement', tags: ['player', 'jump', 'core'], description: 'Short upward whoosh for player jump', parameters: { duration: 0.2, volume: 0.7 } },
    { name: 'land', category: 'movement', tags: ['player', 'land'], description: 'Soft thud on landing from jump', parameters: { duration: 0.15, volume: 0.5 } },
    { name: 'coin', category: 'ui', tags: ['collect', 'coin', 'reward'], description: 'Bright metallic pickup chime', parameters: { duration: 0.3, volume: 0.6, pitch: 1.2 } },
    { name: 'hurt', category: 'combat', tags: ['player', 'damage', 'hit'], description: 'Sharp impact with character grunt', parameters: { duration: 0.25, volume: 0.8 } },
    { name: 'death', category: 'combat', tags: ['player', 'death', 'gameover'], description: 'Descending tone for player death', parameters: { duration: 0.8, volume: 0.7, pitch: 0.7 } },
    { name: 'enemy_death', category: 'combat', tags: ['enemy', 'defeat', 'pop'], description: 'Satisfying pop for enemy defeat', parameters: { duration: 0.2, volume: 0.6, pitch: 1.3 } },
    { name: 'powerup', category: 'ui', tags: ['powerup', 'upgrade', 'boost'], description: 'Ascending arpeggio for power-up', parameters: { duration: 0.5, volume: 0.65, pitch: 1.1 } },
    { name: 'checkpoint', category: 'ui', tags: ['checkpoint', 'save', 'progress'], description: 'Warm confirmation tone for checkpoint', parameters: { duration: 0.4, volume: 0.6 } },
  ],
  rpg: [
    { name: 'menu_open', category: 'ui', tags: ['menu', 'interface', 'open'], description: 'Soft chime for opening menu', parameters: { duration: 0.2, volume: 0.5 } },
    { name: 'menu_close', category: 'ui', tags: ['menu', 'interface', 'close'], description: 'Reverse chime for closing menu', parameters: { duration: 0.2, volume: 0.5, pitch: 0.9 } },
    { name: 'sword_slash', category: 'combat', tags: ['attack', 'melee', 'sword'], description: 'Quick blade swoosh for melee attack', parameters: { duration: 0.25, volume: 0.7 } },
    { name: 'magic_cast', category: 'magic', tags: ['spell', 'cast', 'arcane'], description: 'Ethereal whoosh with sparkle tail', parameters: { duration: 0.6, volume: 0.65, pitch: 1.1 } },
    { name: 'level_up', category: 'ui', tags: ['level', 'progress', 'fanfare'], description: 'Triumphant short fanfare', parameters: { duration: 0.8, volume: 0.7, pitch: 1.0 } },
    { name: 'quest_complete', category: 'ui', tags: ['quest', 'complete', 'reward'], description: 'Rewarding chime sequence', parameters: { duration: 0.6, volume: 0.65 } },
    { name: 'footstep', category: 'movement', tags: ['walk', 'step', 'dirt'], description: 'Soft dirt/stone footstep', parameters: { duration: 0.1, volume: 0.3 } },
    { name: 'chest_open', category: 'environment', tags: ['chest', 'loot', 'discover'], description: 'Creak followed by bright reveal', parameters: { duration: 0.5, volume: 0.6 } },
  ],
  shooter: [
    { name: 'pistol', category: 'combat', tags: ['gun', 'pistol', 'shoot'], description: 'Sharp crack for pistol fire', parameters: { duration: 0.15, volume: 0.8 } },
    { name: 'shotgun', category: 'combat', tags: ['gun', 'shotgun', 'blast'], description: 'Heavy boom with reverberation', parameters: { duration: 0.3, volume: 0.9 } },
    { name: 'explosion', category: 'combat', tags: ['explosion', 'blast', 'destroy'], description: 'Deep rumbling explosion with debris', parameters: { duration: 1.0, volume: 0.85, pitch: 0.7 } },
    { name: 'reload', category: 'combat', tags: ['gun', 'reload', 'mechanical'], description: 'Metallic click-clack of reloading', parameters: { duration: 0.4, volume: 0.6 } },
    { name: 'enemy_alert', category: 'voice', tags: ['enemy', 'alert', 'detect'], description: 'Short aggressive vocalization', parameters: { duration: 0.3, volume: 0.65, pitch: 0.8 } },
    { name: 'shield_hit', category: 'impact', tags: ['shield', 'deflect', 'protect'], description: 'Metallic impact with energy ring', parameters: { duration: 0.25, volume: 0.7 } },
  ],
  tower_defense: [
    { name: 'tower_place', category: 'ui', tags: ['tower', 'place', 'build'], description: 'Construction confirmation thud', parameters: { duration: 0.2, volume: 0.6 } },
    { name: 'tower_shoot', category: 'combat', tags: ['tower', 'projectile', 'fire'], description: 'Quick projectile launch sound', parameters: { duration: 0.15, volume: 0.65 } },
    { name: 'wave_start', category: 'ui', tags: ['wave', 'start', 'alert'], description: 'Ominous warning tone for new wave', parameters: { duration: 0.5, volume: 0.7, pitch: 0.8 } },
    { name: 'wave_complete', category: 'ui', tags: ['wave', 'complete', 'victory'], description: 'Relief tone for wave cleared', parameters: { duration: 0.4, volume: 0.65 } },
    { name: 'enemy_reach_end', category: 'combat', tags: ['enemy', 'leak', 'damage'], description: 'Alarming buzz for enemy reaching exit', parameters: { duration: 0.3, volume: 0.8, pitch: 0.6 } },
    { name: 'tower_upgrade', category: 'ui', tags: ['tower', 'upgrade', 'improve'], description: 'Satisfying power-up sound', parameters: { duration: 0.3, volume: 0.6, pitch: 1.2 } },
  ],
  puzzle: [
    { name: 'match', category: 'ui', tags: ['match', 'combine', 'success'], description: 'Bright chime for successful match', parameters: { duration: 0.2, volume: 0.6, pitch: 1.3 } },
    { name: 'combo', category: 'ui', tags: ['combo', 'chain', 'multi'], description: 'Ascending tones for combo chain', parameters: { duration: 0.4, volume: 0.65, pitch: 1.4 } },
    { name: 'fail', category: 'ui', tags: ['fail', 'wrong', 'error'], description: 'Descend buzz for wrong move', parameters: { duration: 0.3, volume: 0.5, pitch: 0.7 } },
    { name: 'level_complete', category: 'ui', tags: ['level', 'complete', 'win'], description: 'Cheerful completion jingle', parameters: { duration: 0.8, volume: 0.7 } },
    { name: 'swap', category: 'movement', tags: ['swap', 'move', 'slide'], description: 'Quick slide sound for piece swap', parameters: { duration: 0.1, volume: 0.4 } },
  ],
};

// ── Service ──

export class SFXGenerationService {
  /**
   * Generate a complete SFX pack for a project based on its genre.
   * Creates metadata files in assets/sfx/ that the engine can consume.
   */
  async generatePack(request: SFXPackRequest): Promise<SFXPack> {
    const { projectId, gameGenre, style = 'retro', count } = request;
    const templates = this.getTemplatesForGenre(gameGenre);
    const selected = count ? templates.slice(0, count) : templates;

    const effects: SFXDescriptor[] = selected.map((t) => ({
      id: generateId(),
      name: t.name,
      category: t.category,
      tags: t.tags,
      description: t.description,
      parameters: t.parameters,
      createdAt: new Date().toISOString(),
    }));

    const pack: SFXPack = {
      id: `pack_${Date.now()}`,
      name: `${gameGenre} SFX Pack`,
      genre: gameGenre,
      style,
      effects,
      createdAt: new Date().toISOString(),
    };

    // Persist to project
    const dir = sfxDir(projectId);
    await ensureDir(dir);
    await writeFile(join(dir, 'pack.json'), JSON.stringify(pack, null, 2));

    // Also write individual metadata files for engine consumption
    for (const sfx of effects) {
      await writeFile(
        join(dir, `${sfx.name}.sfx.json`),
        JSON.stringify(sfx, null, 2),
      );
    }

    return pack;
  }

  /**
   * List all SFX packs for a project.
   */
  async listPacks(projectId: string): Promise<SFXPack[]> {
    const dir = sfxDir(projectId);
    if (!existsSync(dir)) return [];

    const packFile = join(dir, 'pack.json');
    if (!existsSync(packFile)) return [];

    try {
      const data = await readFile(packFile, 'utf-8');
      return [JSON.parse(data)];
    } catch {
      return [];
    }
  }

  /**
   * Get a single SFX descriptor by name.
   */
  async getSFX(projectId: string, name: string): Promise<SFXDescriptor | null> {
    const file = join(sfxDir(projectId), `${name}.sfx.json`);
    if (!existsSync(file)) return null;
    try {
      return JSON.parse(await readFile(file, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Delete a SFX descriptor by name.
   */
  async deleteSFX(projectId: string, name: string): Promise<boolean> {
    const file = join(sfxDir(projectId), `${name}.sfx.json`);
    if (!existsSync(file)) return false;
    const { unlink } = await import('node:fs/promises');
    await unlink(file);
    return true;
  }

  /**
   * Get genre-appropriate SFX templates, falling back to a generic set.
   */
  private getTemplatesForGenre(genre: string): typeof GENRE_SFX_TEMPLATES.platformer {
    const normalizedKey = genre.toLowerCase().replace(/[-_\s]/g, '_');
    if (GENRE_SFX_TEMPLATES[normalizedKey]) {
      return GENRE_SFX_TEMPLATES[normalizedKey];
    }
    // Partial match
    for (const [key, templates] of Object.entries(GENRE_SFX_TEMPLATES)) {
      if (key.includes(normalizedKey) || normalizedKey.includes(key)) {
        return templates;
      }
    }
    // Default: return platformer set as generic baseline
    return GENRE_SFX_TEMPLATES.platformer;
  }
}
