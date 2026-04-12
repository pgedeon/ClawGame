import { ClawgamePhaserScene } from './ClawgamePhaserScene';
import { buildPhaserPreviewBootstrap } from './buildPreviewBootstrap';
import type { CanonicalSceneLike, PhaserPreviewBootstrap } from './types';

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
  description: 'Scaffolded Phaser 4 runtime backend for future preview/export integration.',
  experimental: true,
  available: false,
};

export class ClawgamePhaserRuntime {
  readonly kind = PHASER4_RUNTIME_DESCRIPTOR.kind;
  readonly descriptor = PHASER4_RUNTIME_DESCRIPTOR;

  createScene(): ClawgamePhaserScene {
    return new ClawgamePhaserScene();
  }

  createPreviewBootstrap(scene: CanonicalSceneLike): PhaserPreviewBootstrap {
    return buildPhaserPreviewBootstrap(scene);
  }

  mount(): never {
    throw new Error('ClawgamePhaserRuntime is scaffolded but not mounted by the web preview yet.');
  }
}
