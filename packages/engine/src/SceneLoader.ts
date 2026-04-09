/**
 * @clawgame/engine - Scene Loader
 *
 * Data-driven scene loading from SerializableScene data.
 * Resolves asset references, converts to runtime types, and loads into Engine.
 *
 * This is the single canonical path for loading scenes — used by:
 * - Scene editor (preview)
 * - Game preview (play)
 * - Export runtime (standalone)
 * - AI-generated scenes
 *
 * No fork between editor and preview: both go through SceneLoader.
 */

import {
  SerializableScene,
  SerializableEntity,
  Scene,
  Entity,
  SpriteComponent,
  toRuntimeEntity,
} from './types';
import { Engine } from './Engine';

/**
 * Asset resolver function — given an asset reference string,
 * returns the corresponding HTMLImageElement or null.
 *
 * Different environments provide different resolvers:
 * - Editor: resolves from project asset store
 * - Preview: resolves from uploaded/generated assets
 * - Export: resolves from embedded base64 data
 */
export type AssetResolver = (assetRef: string) => Promise<HTMLImageElement | null>;

/**
 * SceneLoader options
 */
export interface SceneLoaderOptions {
  /** Custom asset resolver. If not provided, sprites without images get fallback colors. */
  assetResolver?: AssetResolver;
  /** Whether to emit scene:load event (default: true) */
  emitEvents?: boolean;
}

/**
 * Result of loading a scene
 */
export interface SceneLoadResult {
  scene: Scene;
  /** Entities whose assets failed to resolve */
  missingAssets: string[];
  /** Total entities loaded */
  entityCount: number;
  /** Time taken in ms */
  loadTimeMs: number;
}

export class SceneLoader {
  private assetResolver: AssetResolver | null;
  private emitEvents: boolean;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(options: SceneLoaderOptions = {}) {
    this.assetResolver = options.assetResolver ?? null;
    this.emitEvents = options.emitEvents ?? true;
  }

  /**
   * Load a serializable scene into an Engine instance.
   * Resolves assets, converts to runtime scene, and starts rendering.
   */
  async loadIntoEngine(
    data: SerializableScene,
    engine: Engine,
  ): Promise<SceneLoadResult> {
    const result = await this.load(data);
    engine.loadScene(result.scene);
    return result;
  }

  /**
   * Load a serializable scene into a runtime Scene.
   * Does not require an Engine — useful for testing and headless rendering.
   */
  async load(data: SerializableScene): Promise<SceneLoadResult> {
    const startTime = performance.now();
    const missingAssets: string[] = [];

    // Convert serializable entities to runtime entities
    const entities = new Map<string, Entity>();

    for (const se of data.entities) {
      const entity = toRuntimeEntity(se);
      await this.resolveSpriteAssets(entity, se, missingAssets);
      entities.set(entity.id, entity);
    }

    const scene: Scene = { name: data.name, entities };

    const loadTimeMs = performance.now() - startTime;

    return {
      scene,
      missingAssets,
      entityCount: entities.size,
      loadTimeMs,
    };
  }

  /**
   * Resolve sprite asset references for a single entity.
   * Updates the entity's sprite component with the loaded image.
   */
  private async resolveSpriteAssets(
    entity: Entity,
    original: SerializableEntity,
    missingAssets: string[],
  ): Promise<void> {
    const spriteData = original.components.sprite as Partial<SpriteComponent> | undefined;
    if (!spriteData?.assetRef) return;

    const sprite = entity.components.get('sprite') as SpriteComponent | undefined;
    if (!sprite) return;

    // Check cache first
    const cached = this.imageCache.get(spriteData.assetRef);
    if (cached) {
      sprite.image = cached;
      return;
    }

    // Try resolver
    if (this.assetResolver) {
      try {
        const image = await this.assetResolver(spriteData.assetRef);
        if (image) {
          this.imageCache.set(spriteData.assetRef, image);
          sprite.image = image;
          return;
        }
      } catch {
        // Fall through to missing
      }
    }

    missingAssets.push(spriteData.assetRef);
  }

  /**
   * Clear the image cache. Useful when assets are updated.
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Invalidate a specific cached asset.
   */
  invalidateAsset(assetRef: string): void {
    this.imageCache.delete(assetRef);
  }

  /**
   * Get the set of currently cached asset references.
   */
  getCachedAssets(): string[] {
    return Array.from(this.imageCache.keys());
  }
}
