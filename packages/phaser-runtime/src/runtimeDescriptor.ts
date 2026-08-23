/**
 * Runtime identity metadata. Kept in a phaser-free module so that
 * UI/config code can import the descriptor without loading the Phaser
 * runtime (see docs/engine-audit.md §4 item 5 — single source of truth).
 */
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
