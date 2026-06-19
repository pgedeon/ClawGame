import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREVIEW_RUNTIME_KIND,
  getRequestedPreviewRuntimeKind,
  listPreviewRuntimeDescriptors,
  resolvePreviewRuntimeSelection,
  setRequestedPreviewRuntimeKind,
} from '../runtime/previewRuntimeConfig';

describe('preview runtime config', () => {
  it('defaults to phaser4 runtime when no preference exists', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };

    expect(getRequestedPreviewRuntimeKind(storage)).toBe(DEFAULT_PREVIEW_RUNTIME_KIND);
  });

  it('uses phaser4 when requested and available', () => {
    const storage = { getItem: vi.fn(() => 'phaser4'), setItem: vi.fn() };

    const selection = resolvePreviewRuntimeSelection(storage);

    expect(selection.requested.kind).toBe('phaser4');
    expect(selection.active.kind).toBe('phaser4');
    expect(selection.fellBack).toBe(false);
  });

  it('falls back to phaser4 when legacy-canvas is requested (legacy removed)', () => {
    const storage = { getItem: vi.fn(() => 'legacy-canvas'), setItem: vi.fn() };

    const selection = resolvePreviewRuntimeSelection(storage);

    // Legacy canvas was removed in Phase 7 — always resolves to phaser4
    expect(selection.active.kind).toBe('phaser4');
  });

  it('persists the requested runtime kind to storage', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };

    setRequestedPreviewRuntimeKind('phaser4', storage);

    expect(storage.setItem).toHaveBeenCalledWith('clawgame-preview-runtime', 'phaser4');
  });

  it('lists phaser4 as the only preview runtime descriptor', () => {
    const descriptors = listPreviewRuntimeDescriptors();

    expect(descriptors.map((descriptor) => descriptor.kind)).toEqual(['phaser4']);
  });
});
