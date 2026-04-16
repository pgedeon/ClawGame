/**
 * @clawgame/web - Placeholder Sprite Generator
 * 
 * Generates placeholder sprites for entities when no actual images are available.
 * This provides better visual feedback than colored rectangles while the asset
 * loading system is being developed.
 */

import { SpriteComponent } from '@clawgame/engine';

/** Cache of generated placeholder images */
const placeholderCache = new Map<string, HTMLImageElement>();

/**
 * Create a placeholder sprite based on entity type and color
 */
export function createPlaceholderSprite(
  type: string, 
  width: number = 32, 
  height: number = 32, 
  color?: string
): HTMLImageElement {
  const cacheKey = `${type}-${width}-${height}-${color || 'default'}`;
  
  if (placeholderCache.has(cacheKey)) {
    return placeholderCache.get(cacheKey)!;
  }

  // Check if we're in a test environment or if DOM is not available
  if (typeof document === 'undefined' || !document.createElement) {
    // Return a minimal image element for test environments
    const image = new Image();
    image.width = width;
    image.height = height;
    placeholderCache.set(cacheKey, image);
    return image;
  }

  try {
    // Create canvas for drawing
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      // Fallback for environments without canvas support
      const image = new Image();
      image.width = width;
      image.height = height;
      placeholderCache.set(cacheKey, image);
      return image;
    }

    // Determine color based on type
    const defaultColors: Record<string, string> = {
      player: '#3b82f6',
      enemy: '#ef4444',
      collectible: '#f59e0b',
      obstacle: '#6b7280',
      platform: '#10b981',
      projectile: '#f97316',
      npc: '#8b5cf6',
      treasure: '#eab308',
      powerup: '#ec4899',
    };

    const spriteColor = color || defaultColors[type] || '#8b5cf6';

    // Draw background
    ctx.fillStyle = spriteColor;
    ctx.fillRect(0, 0, width, height);

    // Add some visual details based on type
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Add type-specific details
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${Math.max(10, width / 3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const typeIcons: Record<string, string> = {
      player: 'P',
      enemy: 'E',
      collectible: 'C',
      obstacle: 'X',
      platform: '□',
      projectile: '•',
      npc: 'N',
      treasure: '$',
      powerup: '⚡',
    };

    const icon = typeIcons[type] || '?';
    ctx.fillText(icon, width / 2, height / 2);

    // Convert to image and cache
    const image = new Image();
    image.src = canvas.toDataURL();
    placeholderCache.set(cacheKey, image);

    return image;
  } catch (error) {
    // Fallback if canvas creation fails
    const image = new Image();
    image.width = width;
    image.height = height;
    placeholderCache.set(cacheKey, image);
    return image;
  }
}

/**
 * Update sprite component with placeholder image if no image is loaded
 */
export function ensureSpriteHasImage(
  sprite: SpriteComponent,
  type: string,
  fallbackColor?: string
): void {
  if (!sprite.image) {
    sprite.image = createPlaceholderSprite(
      type,
      sprite.width || 32,
      sprite.height || 32,
      sprite.color || fallbackColor
    );
  }
}

/**
 * Clear the placeholder cache (useful for testing or when assets are updated)
 */
export function clearPlaceholderCache(): void {
  placeholderCache.clear();
}

/**
 * Get the set of currently cached placeholder keys
 */
export function getPlaceholderCacheKeys(): string[] {
  return Array.from(placeholderCache.keys());
}