/**
 * Sprite Loading System
 * Loads and manages sprite images for game preview rendering
 */

import type { AssetMetadata } from '../api/client';

// Asset mappings by entity type
const ENTITY_TYPE_ASSET_MAPPING: Record<string, string[]> = {
  player: ['player', 'character', 'hero'],
  enemy: ['enemy', 'monster', 'slime', 'orc'],
  'td-enemy': ['td-enemy', 'tower-enemy', 'goblin'],
  collectible: ['coin', 'gem', 'item', 'collectible'],
  health: ['health', 'potion', 'heart'],
  rune: ['rune', 'magic', 'orb'],
  obstacle: ['obstacle', 'wall', 'block'],
  platform: ['platform', 'ground', 'floor'],
  npc: ['npc', 'villager', 'merchant'],
  trigger: ['trigger', 'portal', 'door'],
  camera: ['camera', 'viewport'],
  unknown: ['default', 'placeholder'],
};

// Default fallback images (inline SVGs)
const FALLBACK_SPRITES: Record<string, string> = {
  player: `
    <svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="16" height="24" fill="#3b82f6" rx="2"/>
      <circle cx="16" cy="8" r="6" fill="#3b82f6"/>
      <rect x="12" y="36" width="4" height="8" fill="#1e40af"/>
      <rect x="20" y="36" width="4" height="8" fill="#1e40af"/>
    </svg>
  `,
  enemy: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#ef4444"/>
      <circle cx="12" cy="12" r="2" fill="#ffffff"/>
      <circle cx="20" cy="12" r="2" fill="#ffffff"/>
      <path d="M 12 20 Q 16 24 20 20" stroke="#ffffff" stroke-width="2" fill="none"/>
    </svg>
  `,
  collectible: `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill="#f59e0b"/>
      <text x="8" y="12" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold">$</text>
    </svg>
  `,
  health: `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2 C4 2 2 6 2 8 C2 12 8 14 8 14 C8 14 14 12 14 8 C14 6 12 2 8 2 Z" fill="#ef4444"/>
      <path d="M8 4 C6 4 5 6 5 7 C5 9 8 10 8 10 C8 10 9 9 9 7 C9 6 8 4 8 4 Z" fill="#ffffff"/>
    </svg>
  `,
  rune: `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <polygon points="8,2 12,6 12,10 8,14 4,10 4,6" fill="#a855f7"/>
      <circle cx="8" cy="8" r="2" fill="#ffffff"/>
    </svg>
  `,
  obstacle: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" fill="#9ca3af" rx="2"/>
      <rect x="6" y="10" width="20" height="12" fill="#6b7280" rx="1"/>
    </svg>
  `,
  platform: `
    <svg width="64" height="16" viewBox="0 0 64 16" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="4" width="64" height="8" fill="#6366f1"/>
      <rect x="0" y="2" width="64" height="4" fill="#4f46e5"/>
    </svg>
  `,
  npc: `
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="6" fill="#fbbf24"/>
      <rect x="6" y="14" width="12" height="16" fill="#f59e0b" rx="2"/>
      <circle cx="9" cy="7" r="1" fill="#000000"/>
      <circle cx="15" cy="7" r="1" fill="#000000"/>
      <path d="M 10 10 Q 12 12 14 10" stroke="#000000" stroke-width="1" fill="none"/>
    </svg>
  `,
  trigger: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="4 2"/>
      <text x="16" y="20" text-anchor="middle" fill="#10b981" font-size="16" font-weight="bold">!</text>
    </svg>
  `,
  camera: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" fill="#6b7280" rx="2"/>
      <circle cx="16" cy="16" r="6" fill="#374151"/>
      <circle cx="16" cy="16" r="4" fill="#1f2937"/>
      <rect x="26" y="12" width="4" height="8" fill="#374151"/>
    </svg>
  `,
  default: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" fill="#6b7280" rx="4"/>
      <text x="16" y="20" text-anchor="middle" fill="#ffffff" font-size="12">?</text>
    </svg>
  `,
};

interface SpriteCache {
  image: HTMLImageElement;
  width: number;
  height: number;
  isLoading: boolean;
  loadError: boolean;
}

class SpriteManager {
  private cache: Map<string, SpriteCache> = new Map();
  private fallbackImages: Map<string, HTMLImageElement> = new Map();
  private assetBaseUrl: string;

  constructor() {
    this.assetBaseUrl = (import.meta as any).env?.VITE_API_URL || '';
    this.initializeFallbackImages();
  }

  private initializeFallbackImages() {
    Object.entries(FALLBACK_SPRITES).forEach(([type, svgContent]) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
      this.fallbackImages.set(type, img);
    });
  }

  private getFallbackImage(type: string): HTMLImageElement {
    // Look for exact match first
    if (this.fallbackImages.has(type)) {
      return this.fallbackImages.get(type)!;
    }

    // Look for partial matches in the mapping
    for (const [key, values] of Object.entries(ENTITY_TYPE_ASSET_MAPPING)) {
      if (values.includes(type)) {
        return this.fallbackImages.get(key) || this.fallbackImages.get('default')!;
      }
    }

    return this.fallbackImages.get('default')!;
  }

  async loadSpriteAsset(projectId: string, asset: AssetMetadata): Promise<HTMLImageElement> {
    const cacheKey = `${projectId}-${asset.id}`;

    // Check if already in cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.loadError) {
        throw new Error(`Failed to load sprite for ${asset.id}`);
      }
      if (cached.isLoading) {
        // Wait for loading to complete
        await new Promise<void>((resolve, reject) => {
          const img = cached.image;
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load sprite'));
          }
        });
      }
      return cached.image;
    }

    // Create cache entry
    const fallback = this.getFallbackImage(asset.type);
    const cacheEntry: SpriteCache = {
      image: fallback,
      width: 32,
      height: 32,
      isLoading: false,
      loadError: false,
    };
    this.cache.set(cacheKey, cacheEntry);

    try {
      const img = new Image();
      
      img.onload = () => {
        cacheEntry.image = img;
        cacheEntry.isLoading = false;
        cacheEntry.loadError = false;
      };

      img.onerror = () => {
        // Keep fallback image
        cacheEntry.isLoading = false;
        cacheEntry.loadError = true;
      };

      // Load from API
      img.src = `${this.assetBaseUrl}/api/projects/${projectId}/assets/${asset.id}/file`;
      
      // Update cache entry to loading state
      cacheEntry.isLoading = true;
      
      // Wait for load to complete
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          cacheEntry.image = img;
          cacheEntry.isLoading = false;
          cacheEntry.loadError = false;
          resolve();
        };
        img.onerror = () => {
          cacheEntry.isLoading = false;
          cacheEntry.loadError = true;
          reject(new Error('Failed to load sprite'));
        };
      });
    } catch (error) {
      // Keep fallback image on error
      cacheEntry.isLoading = false;
      cacheEntry.loadError = true;
      throw error;
    }

    return this.cache.get(cacheKey)!.image;
  }

  getFallbackSprite(type: string): HTMLImageElement {
    return this.getFallbackImage(type);
  }

  getAssetUrl(projectId: string, assetId: string): string {
    return `${this.assetBaseUrl}/api/projects/${projectId}/assets/${assetId}/file`;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const spriteManager = new SpriteManager();
export type { SpriteManager };