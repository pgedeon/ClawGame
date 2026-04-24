/**
 * @clawgame/engine - Phaser-compatible asset pack types and utilities
 */

/** Valid Phaser loader asset types. */
export type AssetPackEntryType =
  | 'image'
  | 'spritesheet'
  | 'atlas'
  | 'atlasJSON'
  | 'audio'
  | 'tilemapTiledJSON'
  | 'tilemapCSV'
  | 'animation'
  | 'binary'
  | 'json'
  | 'text'
  | 'video'
  | 'font';

export const ASSET_PACK_ENTRY_TYPES: AssetPackEntryType[] = [
  'image', 'spritesheet', 'atlas', 'atlasJSON', 'audio',
  'tilemapTiledJSON', 'tilemapCSV', 'animation', 'binary',
  'json', 'text', 'video', 'font',
];

export interface AssetPackEntry {
  key: string;
  type: AssetPackEntryType;
  url: string;
  frameConfig?: {
    frameWidth: number;
    frameHeight: number;
    endFrame?: number;
    margin?: number;
    spacing?: number;
  };
  atlasURL?: string;
  jsonURL?: string;
}

export interface AssetPack {
  version: 1;
  baseUrl: string;
  entries: AssetPackEntry[];
}

export interface AssetPackValidation {
  valid: boolean;
  errors: string[];
}

// ─── Utilities ───

export function createDefaultAssetPack(projectId: string): AssetPack {
  return {
    version: 1,
    baseUrl: `/projects/${projectId}/assets`,
    entries: [],
  };
}

export function addAssetToPack(pack: AssetPack, entry: AssetPackEntry): AssetPack {
  return {
    ...pack,
    entries: [...pack.entries, entry],
  };
}

export function removeAssetFromPack(pack: AssetPack, key: string): AssetPack {
  return {
    ...pack,
    entries: pack.entries.filter((e) => e.key !== key),
  };
}

export function serializeAssetPack(pack: AssetPack): string {
  return JSON.stringify(pack, null, 2);
}

export function parseAssetPack(json: string): AssetPack {
  const parsed = JSON.parse(json) as AssetPack;
  if (parsed.version !== 1) {
    throw new Error(`Unsupported asset pack version: ${parsed.version}`);
  }
  return parsed;
}

const VALID_KEY_RE = /^[a-zA-Z0-9_-]+$/;

export function validateAssetPack(pack: AssetPack): AssetPackValidation {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < pack.entries.length; i++) {
    const entry = pack.entries[i];

    if (!entry.key.trim()) {
      errors.push(`Entry ${i}: key is empty`);
    } else if (!VALID_KEY_RE.test(entry.key)) {
      errors.push(`Entry "${entry.key}": key contains invalid characters (use alphanumeric, hyphens, underscores)`);
    } else if (seenKeys.has(entry.key)) {
      errors.push(`Entry "${entry.key}": duplicate key`);
    } else {
      seenKeys.add(entry.key);
    }

    if (!entry.url.trim()) {
      errors.push(`Entry "${entry.key}": URL is empty`);
    }

    if (!ASSET_PACK_ENTRY_TYPES.includes(entry.type)) {
      errors.push(`Entry "${entry.key}": invalid type "${entry.type}"`);
    }

    if (entry.type === 'spritesheet' && entry.frameConfig) {
      if (entry.frameConfig.frameWidth <= 0) {
        errors.push(`Entry "${entry.key}": frameWidth must be > 0`);
      }
      if (entry.frameConfig.frameHeight <= 0) {
        errors.push(`Entry "${entry.key}": frameHeight must be > 0`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Convert an existing project asset (from API) to an asset pack entry. */
export function assetToPackEntry(asset: {
  id: string;
  name?: string;
  type?: string;
  url?: string;
  width?: number;
  height?: number;
}): AssetPackEntry | null {
  const key = (asset.name || asset.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const url = asset.url || `assets/${asset.id}`;

  let type: AssetPackEntryType = 'image';
  const assetType = (asset.type || '').toLowerCase();

  if (assetType.includes('audio') || assetType.includes('sound') || assetType.includes('music')) {
    type = 'audio';
  } else if (assetType.includes('spritesheet') || assetType.includes('tileset')) {
    type = 'spritesheet';
  } else if (assetType.includes('atlas')) {
    type = 'atlas';
  } else if (assetType.includes('json')) {
    type = 'json';
  } else if (assetType.includes('tilemap')) {
    type = 'tilemapTiledJSON';
  }

  const entry: AssetPackEntry = { key, type, url };

  if (type === 'spritesheet' && asset.width && asset.height) {
    entry.frameConfig = { frameWidth: asset.width, frameHeight: asset.height };
  }

  return entry;
}

/** Generate a Phaser preload code snippet from an asset pack. */
export function generatePreloadCode(pack: AssetPack): string {
  const lines: string[] = [];
  for (const entry of pack.entries) {
    switch (entry.type) {
      case 'image':
        lines.push(`    this.load.image('${entry.key}', '${entry.url}');`);
        break;
      case 'spritesheet':
        lines.push(`    this.load.spritesheet('${entry.key}', '${entry.url}', ${JSON.stringify(entry.frameConfig)});`);
        break;
      case 'atlas':
        lines.push(`    this.load.atlas('${entry.key}', '${entry.url}', '${entry.atlasURL || entry.url.replace(/\\.[^.]+$/, '.json')}');`);
        break;
      case 'audio':
        lines.push(`    this.load.audio('${entry.key}', '${entry.url}');`);
        break;
      case 'json':
        lines.push(`    this.load.json('${entry.key}', '${entry.url}');`);
        break;
      case 'tilemapTiledJSON':
        lines.push(`    this.load.tilemapTiledJSON('${entry.key}', '${entry.url}');`);
        break;
      default:
        lines.push(`    this.load.${entry.type}('${entry.key}', '${entry.url}');`);
    }
  }
  return lines.join('\n');
}
