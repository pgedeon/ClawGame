import type {
  PreviewRuntimeDescriptor,
  PreviewRuntimeKind,
  PreviewRuntimeSelection,
} from './PreviewRuntime';
import { LEGACY_CANVAS_RUNTIME_DESCRIPTOR } from './legacyCanvasRuntime';

interface StorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export const PREVIEW_RUNTIME_STORAGE_KEY = 'clawgame-preview-runtime';
export const DEFAULT_PREVIEW_RUNTIME_KIND: PreviewRuntimeKind = 'legacy-canvas';

export const PHASER4_RUNTIME_DESCRIPTOR: PreviewRuntimeDescriptor = {
  kind: 'phaser4',
  label: 'Phaser 4 Runtime',
  shortLabel: 'Phaser 4',
  description: 'Phaser 4 backend scaffold with canonical scene bootstrap mapping; mount path still pending.',
  experimental: true,
  available: false,
};

const PREVIEW_RUNTIME_DESCRIPTORS: Record<PreviewRuntimeKind, PreviewRuntimeDescriptor> = {
  'legacy-canvas': LEGACY_CANVAS_RUNTIME_DESCRIPTOR,
  phaser4: PHASER4_RUNTIME_DESCRIPTOR,
};

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage;
}

function normalizePreviewRuntimeKind(value: string | null | undefined): PreviewRuntimeKind | null {
  if (value === 'legacy-canvas' || value === 'phaser4') {
    return value;
  }
  return null;
}

export function getRequestedPreviewRuntimeKind(storage: StorageLike | undefined = getDefaultStorage()): PreviewRuntimeKind {
  const configured = normalizePreviewRuntimeKind(storage?.getItem(PREVIEW_RUNTIME_STORAGE_KEY));
  return configured ?? DEFAULT_PREVIEW_RUNTIME_KIND;
}

export function getPreviewRuntimeDescriptor(kind: PreviewRuntimeKind): PreviewRuntimeDescriptor {
  return PREVIEW_RUNTIME_DESCRIPTORS[kind];
}

export function listPreviewRuntimeDescriptors(): PreviewRuntimeDescriptor[] {
  return Object.values(PREVIEW_RUNTIME_DESCRIPTORS);
}

export function setRequestedPreviewRuntimeKind(
  kind: PreviewRuntimeKind,
  storage: StorageLike | undefined = getDefaultStorage(),
): void {
  storage?.setItem?.(PREVIEW_RUNTIME_STORAGE_KEY, kind);
}

export function resolvePreviewRuntimeSelection(
  storage: StorageLike | undefined = getDefaultStorage(),
): PreviewRuntimeSelection {
  const requestedKind = getRequestedPreviewRuntimeKind(storage);
  const requested = getPreviewRuntimeDescriptor(requestedKind);

  if (requested.available) {
    return {
      active: requested,
      requested,
      fellBack: false,
    };
  }

  return {
    active: LEGACY_CANVAS_RUNTIME_DESCRIPTOR,
    requested,
    fellBack: requested.kind !== LEGACY_CANVAS_RUNTIME_DESCRIPTOR.kind,
    reason: `${requested.label} has scene bootstrap scaffolding but is not mounted by the preview yet.`,
  };
}
