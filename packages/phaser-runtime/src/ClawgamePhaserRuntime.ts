import { Game, AUTO, CANVAS, Scale, WEBGL } from 'phaser';
import { ClawgamePhaserScene } from './ClawgamePhaserScene';
import { buildPhaserPreviewBootstrap } from './buildPreviewBootstrap';
import type { CanonicalSceneLike, PhaserPreviewBootstrap, PhaserRuntimeErrorReporter } from './types';

export interface PhaserRuntimeDescriptor {
  kind: 'phaser4';
  label: string;
  shortLabel: string;
  description: string;
  experimental: boolean;
  available: boolean;
}

export const PHASER4_RUNTIME_DESCRIPTOR: PhaserRuntimeDescriptor = {
  kind: 'phaser4',
  label: 'Phaser 4 Runtime',
  shortLabel: 'Phaser 4',
  description: 'Phaser 4 runtime backend for game preview and export.',
  experimental: false,
  available: true,
};

type SceneFactory = () => ClawgamePhaserScene;
export type PhaserRuntimeRendererType = 'webgl' | 'auto' | 'canvas';

export interface PhaserRuntimeMountOptions {
  width?: number;
  height?: number;
  rendererType?: PhaserRuntimeRendererType;
  errorReporter?: PhaserRuntimeErrorReporter;
}

export type PhaserRuntimeGameConfig = Omit<Phaser.Types.Core.GameConfig, 'parent' | 'scene'>;

function resolveRendererType(rendererType: PhaserRuntimeRendererType = 'webgl'): number {
  if (rendererType === 'auto') return AUTO;
  if (rendererType === 'canvas') return CANVAS;
  return WEBGL;
}

export function buildPhaserGameConfig(
  bootstrap: PhaserPreviewBootstrap,
  opts: PhaserRuntimeMountOptions = {},
): PhaserRuntimeGameConfig {
  const width = opts.width ?? bootstrap.bounds?.width ?? 800;
  const height = opts.height ?? bootstrap.bounds?.height ?? 600;
  const backgroundColor = bootstrap.backgroundColor ?? '#0f172a';

  return {
    type: resolveRendererType(opts.rendererType),
    width,
    height,
    backgroundColor,
    render: {
      roundPixels: true,
      smoothPixelArt: false,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: bootstrap.physics?.debug ?? false,
        ...(bootstrap.physics?.gravity ? { gravity: { ...bootstrap.physics.gravity } } : {}),
      },
    },
    scale: {
      width,
      height,
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH,
      expandParent: false,
    },
    input: { keyboard: true, mouse: true, touch: true },
  };
}

export class ClawgamePhaserRuntime {
  readonly kind = PHASER4_RUNTIME_DESCRIPTOR.kind;
  readonly descriptor = PHASER4_RUNTIME_DESCRIPTOR;

  private game: Game | null = null;
  private scene: ClawgamePhaserScene | null = null;
  private sceneFactory: SceneFactory | null = null;

  setSceneFactory(factory: SceneFactory): void {
    this.sceneFactory = factory;
  }

  createScene(): ClawgamePhaserScene {
    if (this.sceneFactory) return this.sceneFactory();
    return new ClawgamePhaserScene();
  }

  createPreviewBootstrap(scene: CanonicalSceneLike): PhaserPreviewBootstrap {
    return buildPhaserPreviewBootstrap(scene);
  }

  mount(
    parent: HTMLElement,
    bootstrap: PhaserPreviewBootstrap,
    opts?: PhaserRuntimeMountOptions,
  ): Game | null {
    const sceneInstance = this.createScene();
    sceneInstance.setBootstrap(bootstrap, opts?.errorReporter);
    this.game = new Game({
      ...buildPhaserGameConfig(bootstrap, opts),
      parent,
      scene: [sceneInstance],
    });
    this.scene = sceneInstance;
    return this.game;
  }

  unmount(): void {
    this.destroy();
  }

  getGame(): Game | null {
    return this.game;
  }

  getScene(): ClawgamePhaserScene | null {
    return this.scene;
  }

  destroy(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.scene = null;
  }

  // ─── Asset Pack Loading ───

  /**
   * Load all entries from a Phaser-compatible asset pack.
   * Call after mount(), during or before the scene's preload phase.
   */
  async loadAssetPack(pack: {
    version: number;
    baseUrl: string;
    entries: Array<{
      key: string;
      type: string;
      url: string;
      frameConfig?: any;
      atlasURL?: string;
      jsonURL?: string;
    }>;
  }): Promise<void> {
    const scene = this.scene;
    if (!scene || !this.game) {
      throw new Error('Runtime not mounted. Call mount() first.');
    }

    const loader = scene.load;
    if (!loader) {
      throw new Error('Scene loader not available.');
    }

    const baseUrl = pack.baseUrl || '';
    for (const entry of pack.entries) {
      const url = `${baseUrl}/${entry.url}`.replace(/\/+/g, '/');

      switch (entry.type) {
        case 'image':
          loader.image(entry.key, url);
          break;
        case 'spritesheet':
          loader.spritesheet(entry.key, url, entry.frameConfig);
          break;
        case 'atlas':
          loader.atlas(entry.key, url, entry.atlasURL || url.replace(/\.[^.]+$/, '.json'));
          break;
        case 'atlasJSON':
          // atlasJSON handled same as atlas for compatibility
          loader.atlas(entry.key, url, entry.jsonURL || url.replace(/\.[^.]+$/, '.json'));
          break;
        case 'audio':
          loader.audio(entry.key, url);
          break;
        case 'json':
          loader.json(entry.key, url);
          break;
        case 'text':
          loader.text(entry.key, url);
          break;
        case 'tilemapTiledJSON':
          loader.tilemapTiledJSON(entry.key, url);
          break;
        case 'tilemapCSV':
          loader.tilemapCSV(entry.key, url);
          break;
        case 'video':
          loader.video(entry.key, url);
          break;
        case 'binary':
          loader.binary(entry.key, url);
          break;
        default:
          break;
      }
    }

    return new Promise<void>((resolve, reject) => {
      loader.once('complete', () => resolve());
      loader.once('loaderror', (_fileObj: any) => reject(new Error('Asset pack load failed')));
      loader.start();
    });
  }
}
