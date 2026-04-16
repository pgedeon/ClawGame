import { LEGACY_CANVAS_RUNTIME_DESCRIPTOR } from './legacyCanvasRuntime';
import type {
  PreviewRuntimeKind,
  PreviewRuntimeDescriptor,
  PreviewRuntimeSelection,
} from './PreviewRuntime';

export type {
  PreviewRuntimeDescriptor,
  PreviewRuntimeKind,
  PreviewRuntimeSelection,
} from './PreviewRuntime';

export const DEFAULT_PREVIEW_RUNTIME_KIND: PreviewRuntimeKind = 'phaser4';

export const PHASER4_RUNTIME_DESCRIPTOR: PreviewRuntimeDescriptor = {
  kind: 'phaser4',
  label: 'Phaser 4 Runtime',
  shortLabel: 'Phaser 4',
  description: 'Phaser 4 runtime with Arcade physics, scene bootstrap, and entity rendering.',
  experimental: false,
  available: true,
};

const PREVIEW_RUNTIME_DESCRIPTORS: Record<PreviewRuntimeKind, PreviewRuntimeDescriptor> = {
  'legacy-canvas': LEGACY_CANVAS_RUNTIME_DESCRIPTOR,
  phaser4: PHASER4_RUNTIME_DESCRIPTOR,
};

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function normalizePreviewRuntimeKind(value: string | null | undefined): PreviewRuntimeKind | null {
  if (value === 'legacy-canvas' || value === 'phaser4') return value;
  return null;
}

export const PREVIEW_RUNTIME_STORAGE_KEY = 'clawgame-preview-runtime';

export function listPreviewRuntimeDescriptors(): PreviewRuntimeDescriptor[] {
  return Object.values(PREVIEW_RUNTIME_DESCRIPTORS);
}

export function getPreviewRuntimeDescriptor(kind: PreviewRuntimeKind): PreviewRuntimeDescriptor {
  return PREVIEW_RUNTIME_DESCRIPTORS[kind];
}

export function getRequestedPreviewRuntimeKind(storage?: StorageLike): PreviewRuntimeKind {
  const s = storage ?? getDefaultStorage();
  const stored = normalizePreviewRuntimeKind(s?.getItem(PREVIEW_RUNTIME_STORAGE_KEY) ?? null);
  return stored ?? DEFAULT_PREVIEW_RUNTIME_KIND;
}

export function setRequestedPreviewRuntimeKind(kind: PreviewRuntimeKind, storage?: StorageLike): void {
  const s = storage ?? getDefaultStorage();
  s?.setItem(PREVIEW_RUNTIME_STORAGE_KEY, kind);
}

export function resolvePreviewRuntimeSelection(storage?: StorageLike): PreviewRuntimeSelection {
  const requestedKind = getRequestedPreviewRuntimeKind(storage);
  const requested = PREVIEW_RUNTIME_DESCRIPTORS[requestedKind];

  if (requested.available) {
    return { requested, active: requested, fellBack: false };
  }

  const fallback = LEGACY_CANVAS_RUNTIME_DESCRIPTOR;
  return { requested, active: fallback, fellBack: true, reason: `${requested.shortLabel} not available` };
}
