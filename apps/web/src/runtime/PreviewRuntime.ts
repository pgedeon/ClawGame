export type PreviewRuntimeKind = 'legacy-canvas' | 'phaser4';

export interface PreviewRuntimeDescriptor {
  kind: PreviewRuntimeKind;
  label: string;
  shortLabel: string;
  description: string;
  experimental?: boolean;
  available: boolean;
}

export interface PreviewRuntimeSelection {
  active: PreviewRuntimeDescriptor;
  requested: PreviewRuntimeDescriptor;
  fellBack: boolean;
  reason?: string;
}
