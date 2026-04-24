/**
 * Image Style Preset Service — M11: Generative Media Forge
 *
 * Curated generation profiles tuned for specific asset roles.
 * Each preset defines prompt templates, dimensions, style, and palette overrides
 * so users can quickly generate character/enemy/prop/background assets
 * without hand-tuning every parameter.
 */

import { FastifyLoggerInstance } from 'fastify';
import { AIImageGenerationService, AIImageGenerationRequest } from './aiImageGenerationService';

// ── Types ──

export type AssetRole =
  | 'character'
  | 'enemy'
  | 'npc'
  | 'prop'
  | 'background'
  | 'tileset'
  | 'icon'
  | 'effect'
  | 'ui-element';

export type ArtStyle = 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';

export interface StylePreset {
  id: string;
  name: string;
  role: AssetRole;
  artStyle: ArtStyle;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  promptTemplate: string; // {description} placeholder
  paletteOverrides?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    bg?: string;
  };
  examples: string[]; // example descriptions
}

export interface GenerateFromPresetRequest {
  projectId: string;
  presetId: string;
  description: string;
  artStyle?: ArtStyle; // override preset default
  width?: number;
  height?: number;
  count?: number; // 1-6 variants
}

export interface PresetGenerationResult {
  preset: StylePreset;
  assets: Array<{
    id: string;
    content: string;
    format: string;
    width: number;
    height: number;
    generationTime: number;
  }>;
}

// ── Presets ──

const PRESETS: StylePreset[] = [
  // ── Characters ──
  {
    id: 'character-hero',
    name: 'Hero Character',
    role: 'character',
    artStyle: 'pixel',
    description: 'Player-controlled protagonist sprite with clear silhouette',
    defaultWidth: 64,
    defaultHeight: 64,
    promptTemplate: 'A {style} game character sprite: {description}. Standing idle pose, clear silhouette, game-ready.',
    paletteOverrides: { primary: '#4361ee', secondary: '#3a0ca3', accent: '#4cc9f0' },
    examples: ['knight in blue armor', 'space marine with helmet', 'elf ranger with bow'],
  },
  {
    id: 'character-mage',
    name: 'Mage / Wizard',
    role: 'character',
    artStyle: 'cartoon',
    description: 'Spellcaster character with staff and robes',
    defaultWidth: 64,
    defaultHeight: 64,
    promptTemplate: 'A {style} wizard/mage character sprite: {description}. Magical aura, flowing robes, game-ready.',
    paletteOverrides: { primary: '#7209b7', secondary: '#560bad', accent: '#f72585' },
    examples: ['fire wizard with red robes', 'ice sorceress', 'old wizard with grey beard'],
  },
  {
    id: 'character-rogue',
    name: 'Rogue / Thief',
    role: 'character',
    artStyle: 'pixel',
    description: 'Stealthy agile character with dark clothing',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} rogue/thief character sprite: {description}. Agile pose, dark clothing, game-ready.',
    paletteOverrides: { primary: '#2d3436', secondary: '#636e72', accent: '#dfe6e9' },
    examples: ['hooded assassin with daggers', 'ninja in black', 'thief with mask'],
  },

  // ── Enemies ──
  {
    id: 'enemy-slime',
    name: 'Slime Enemy',
    role: 'enemy',
    artStyle: 'cartoon',
    description: 'Classic gelatinous blob enemy',
    defaultWidth: 48,
    defaultHeight: 48,
    promptTemplate: 'A {style} slime enemy sprite: {description}. Bouncy, gelatinous, slightly menacing, game-ready.',
    paletteOverrides: { primary: '#00b894', secondary: '#00cec9', accent: '#55efc4' },
    examples: ['green slime blob', 'blue ice slime', 'purple poison slime'],
  },
  {
    id: 'enemy-skeleton',
    name: 'Skeleton Warrior',
    role: 'enemy',
    artStyle: 'pixel',
    description: 'Undead skeleton with weapon',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} skeleton enemy sprite: {description}. Undead, bony, wielding weapon, game-ready.',
    paletteOverrides: { primary: '#dfe6e9', secondary: '#b2bec3', accent: '#ffeaa7' },
    examples: ['skeleton with sword', 'skeleton archer', 'skeleton mage'],
  },
  {
    id: 'enemy-boss',
    name: 'Boss Monster',
    role: 'enemy',
    artStyle: 'cartoon',
    description: 'Large imposing boss enemy',
    defaultWidth: 128,
    defaultHeight: 128,
    promptTemplate: 'A {style} large boss monster sprite: {description}. Imposing, detailed, threatening, game-ready boss.',
    paletteOverrides: { primary: '#d63031', secondary: '#e17055', accent: '#fdcb6e' },
    examples: ['dragon boss', 'demon lord', 'giant golem'],
  },
  {
    id: 'enemy-flying',
    name: 'Flying Enemy',
    role: 'enemy',
    artStyle: 'pixel',
    description: 'Airborne enemy like bat or bird',
    defaultWidth: 48,
    defaultHeight: 48,
    promptTemplate: 'A {style} flying enemy sprite: {description}. Wings spread, airborne threat, game-ready.',
    paletteOverrides: { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#fd79a8' },
    examples: ['giant bat', 'evil crow', 'fairy enemy'],
  },

  // ── NPCs ──
  {
    id: 'npc-shopkeeper',
    name: 'Shopkeeper NPC',
    role: 'npc',
    artStyle: 'cartoon',
    description: 'Friendly vendor NPC',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} shopkeeper NPC sprite: {description}. Friendly, behind counter or waving, game-ready.',
    paletteOverrides: { primary: '#fdcb6e', secondary: '#e17055', accent: '#ffeaa7' },
    examples: ['potions merchant', 'blacksmith', 'traveling trader'],
  },
  {
    id: 'npc-questgiver',
    name: 'Quest Giver NPC',
    role: 'npc',
    artStyle: 'cartoon',
    description: 'NPC with quest/exclamation mark',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} quest giver NPC sprite: {description}. Important-looking, exclamation mark indicator, game-ready.',
    paletteOverrides: { primary: '#ffeaa7', secondary: '#fdcb6e', accent: '#f39c12' },
    examples: ['village elder', 'knight commander', 'mysterious stranger'],
  },

  // ── Props ──
  {
    id: 'prop-chest',
    name: 'Treasure Chest',
    role: 'prop',
    artStyle: 'pixel',
    description: 'Collectible treasure chest',
    defaultWidth: 32,
    defaultHeight: 32,
    promptTemplate: 'A {style} treasure chest prop sprite: {description}. Game item, collectible, game-ready.',
    paletteOverrides: { primary: '#e17055', secondary: '#d63031', accent: '#fdcb6e' },
    examples: ['gold treasure chest', 'locked wooden chest', 'gem chest'],
  },
  {
    id: 'prop-platform',
    name: 'Platform',
    role: 'prop',
    artStyle: 'pixel',
    description: 'Jumpable platform or ledge',
    defaultWidth: 96,
    defaultHeight: 24,
    promptTemplate: 'A {style} platform/ledge prop sprite: {description}. Solid, game-ready platform.',
    paletteOverrides: { primary: '#636e72', secondary: '#2d3436', accent: '#b2bec3' },
    examples: ['stone platform', 'wooden bridge', 'floating cloud platform'],
  },
  {
    id: 'prop-door',
    name: 'Door / Portal',
    role: 'prop',
    artStyle: 'pixel',
    description: 'Entrance or portal to next area',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} door/portal prop sprite: {description}. Entrance to next area, game-ready.',
    paletteOverrides: { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#74b9ff' },
    examples: ['wooden dungeon door', 'magic portal', 'stone archway'],
  },
  {
    id: 'prop-tree',
    name: 'Tree / Obstacle',
    role: 'prop',
    artStyle: 'cartoon',
    description: 'Decorative tree or obstacle',
    defaultWidth: 48,
    defaultHeight: 64,
    promptTemplate: 'A {style} tree/obstacle prop sprite: {description}. Decorative, game-ready.',
    paletteOverrides: { primary: '#00b894', secondary: '#2d3436', accent: '#55efc4' },
    examples: ['pine tree', 'dead tree', 'palm tree', 'mushroom'],
  },

  // ── Backgrounds ──
  {
    id: 'bg-outdoor',
    name: 'Outdoor Background',
    role: 'background',
    artStyle: 'cartoon',
    description: 'Outdoor landscape with sky and terrain',
    defaultWidth: 640,
    defaultHeight: 360,
    promptTemplate: 'A {style} outdoor game background: {description}. Scrolling landscape with depth layers, game-ready.',
    paletteOverrides: { bg: '#87CEEB', primary: '#2d6a4f', secondary: '#1b4332', accent: '#74b9ff' },
    examples: ['grassy plains with mountains', 'sunset desert', 'snowy tundra'],
  },
  {
    id: 'bg-indoor',
    name: 'Indoor Background',
    role: 'background',
    artStyle: 'pixel',
    description: 'Interior room or dungeon background',
    defaultWidth: 640,
    defaultHeight: 360,
    promptTemplate: 'A {style} indoor game background: {description}. Room interior with details, game-ready.',
    paletteOverrides: { bg: '#2d3436', primary: '#636e72', secondary: '#b2bec3', accent: '#dfe6e9' },
    examples: ['castle throne room', 'dungeon corridor', 'tavern interior'],
  },
  {
    id: 'bg-space',
    name: 'Space Background',
    role: 'background',
    artStyle: 'vector',
    description: 'Outer space or sci-fi background',
    defaultWidth: 640,
    defaultHeight: 360,
    promptTemplate: 'A {style} space/sci-fi game background: {description}. Stars, nebulae, planets, game-ready.',
    paletteOverrides: { bg: '#0d1b2a', primary: '#1b263b', secondary: '#415a77', accent: '#778da9' },
    examples: ['deep space with nebula', 'asteroid field', 'space station exterior'],
  },

  // ── Tilesets ──
  {
    id: 'tileset-ground',
    name: 'Ground Tileset',
    role: 'tileset',
    artStyle: 'pixel',
    description: 'Ground and floor tiles',
    defaultWidth: 256,
    defaultHeight: 256,
    promptTemplate: 'A {style} ground/floor tileset: {description}. Seamless tiles for level building, game-ready.',
    paletteOverrides: { primary: '#636e72', secondary: '#2d3436', accent: '#b2bec3' },
    examples: ['stone dungeon floor', 'grass terrain', 'sand desert tiles'],
  },
  {
    id: 'tileset-walls',
    name: 'Wall Tileset',
    role: 'tileset',
    artStyle: 'pixel',
    description: 'Wall and barrier tiles',
    defaultWidth: 256,
    defaultHeight: 256,
    promptTemplate: 'A {style} wall/barrier tileset: {description}. Seamless wall tiles for level building, game-ready.',
    paletteOverrides: { primary: '#636e72', secondary: '#b2bec3', accent: '#dfe6e9' },
    examples: ['brick wall', 'stone castle wall', 'ice cave wall'],
  },

  // ── Icons ──
  {
    id: 'icon-item',
    name: 'Item Icon',
    role: 'icon',
    artStyle: 'vector',
    description: 'Inventory item icon',
    defaultWidth: 32,
    defaultHeight: 32,
    promptTemplate: 'A {style} game item icon: {description}. Clean, recognizable, inventory-ready.',
    paletteOverrides: { primary: '#fdcb6e', secondary: '#e17055', accent: '#d63031' },
    examples: ['health potion', 'magic sword', 'gold coin', 'shield'],
  },
  {
    id: 'icon-skill',
    name: 'Skill Icon',
    role: 'icon',
    artStyle: 'vector',
    description: 'Skill or ability icon',
    defaultWidth: 32,
    defaultHeight: 32,
    promptTemplate: 'A {style} skill/ability icon: {description}. Dynamic, clear symbol, game-ready.',
    paletteOverrides: { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#fd79a8' },
    examples: ['fireball', 'heal spell', 'shield bash', 'stealth'],
  },

  // ── Effects ──
  {
    id: 'effect-explosion',
    name: 'Explosion Effect',
    role: 'effect',
    artStyle: 'cartoon',
    description: 'Explosion or impact effect sprite',
    defaultWidth: 64,
    defaultHeight: 64,
    promptTemplate: 'A {style} explosion/impact effect sprite: {description}. Dynamic, impactful, game-ready.',
    paletteOverrides: { primary: '#d63031', secondary: '#e17055', accent: '#fdcb6e' },
    examples: ['fire explosion', 'electric spark', 'poison cloud'],
  },

  // ── UI Elements ──
  {
    id: 'ui-button',
    name: 'Game Button',
    role: 'ui-element',
    artStyle: 'vector',
    description: 'In-game UI button',
    defaultWidth: 128,
    defaultHeight: 48,
    promptTemplate: 'A {style} game UI button: {description}. Clean, clickable, game-ready.',
    paletteOverrides: { primary: '#4361ee', secondary: '#3a0ca3', accent: '#4cc9f0' },
    examples: ['start button', 'pause button', 'settings gear'],
  },
  {
    id: 'ui-healthbar',
    name: 'Health Bar Frame',
    role: 'ui-element',
    artStyle: 'vector',
    description: 'Health/mana bar frame',
    defaultWidth: 200,
    defaultHeight: 24,
    promptTemplate: 'A {style} health/mana bar frame UI element: {description}. Clean, readable, game-ready.',
    paletteOverrides: { primary: '#d63031', secondary: '#00b894', accent: '#636e72' },
    examples: ['health bar', 'mana bar', 'stamina bar', 'boss health bar'],
  },
];

const PRESET_MAP = new Map(PRESETS.map(p => [p.id, p]));

// ── Service ──

export class ImageStylePresetService {
  private imageService: AIImageGenerationService;

  constructor(logger: FastifyLoggerInstance) {
    this.imageService = new AIImageGenerationService(logger);
  }

  /** List all available presets, optionally filtered by role */
  listPresets(role?: AssetRole): StylePreset[] {
    if (role) return PRESETS.filter(p => p.role === role);
    return [...PRESETS];
  }

  /** Get a single preset by ID */
  getPreset(presetId: string): StylePreset | undefined {
    return PRESET_MAP.get(presetId);
  }

  /** List available asset roles */
  listRoles(): AssetRole[] {
    return [...new Set(PRESETS.map(p => p.role))];
  }

  /** Generate assets from a preset */
  async generateFromPreset(request: GenerateFromPresetRequest): Promise<PresetGenerationResult> {
    const preset = PRESET_MAP.get(request.presetId);
    if (!preset) {
      throw new Error(`Unknown preset: ${request.presetId}. Available: ${PRESETS.map(p => p.id).join(', ')}`);
    }

    const artStyle = request.artStyle || preset.artStyle;
    const width = request.width || preset.defaultWidth;
    const height = request.height || preset.defaultHeight;
    const count = Math.min(Math.max(request.count || 1, 1), 6);

    const prompt = preset.promptTemplate
      .replace('{style}', artStyle)
      .replace('{description}', request.description);

    const assets: PresetGenerationResult['assets'] = [];

    for (let i = 0; i < count; i++) {
      const variantPrompt = count > 1 ? `${prompt} (variant ${i + 1})` : prompt;

      const result = await this.imageService.generateAsset({
        type: this.mapRoleToType(preset.role),
        prompt: variantPrompt,
        style: artStyle,
        width,
        height,
        format: 'svg',
      });

      assets.push({
        id: `preset-${preset.id}-${Date.now()}-${i}`,
        content: result.content,
        format: 'svg',
        width,
        height,
        generationTime: result.metadata.generationTime,
      });
    }

    return { preset, assets };
  }

  private mapRoleToType(role: AssetRole): 'sprite' | 'tileset' | 'icon' | 'background' | 'texture' {
    switch (role) {
      case 'character':
      case 'enemy':
      case 'npc':
      case 'effect':
        return 'sprite';
      case 'prop':
      case 'ui-element':
        return 'sprite';
      case 'tileset':
        return 'tileset';
      case 'icon':
        return 'icon';
      case 'background':
        return 'background';
      default:
        return 'sprite';
    }
  }
}
