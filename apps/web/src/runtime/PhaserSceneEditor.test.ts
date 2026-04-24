import { describe, expect, it } from 'vitest';
import {
  calculateDragPosition,
  calculateKeyboardNudge,
  createCollisionSignature,
  hitTestEntityBounds,
  shouldReplaceEntityVisual,
  snapToGrid,
} from './PhaserSceneEditorGeometry';

describe('PhaserSceneEditor interaction helpers', () => {
  it('hit tests points inside unscaled entity bounds', () => {
    const bounds = { x: 100, y: 50, width: 32, height: 48 };

    expect(hitTestEntityBounds({ x: 100, y: 50 }, bounds)).toBe(true);
    expect(hitTestEntityBounds({ x: 132, y: 98 }, bounds)).toBe(true);
    expect(hitTestEntityBounds({ x: 133, y: 98 }, bounds)).toBe(false);
    expect(hitTestEntityBounds({ x: 120, y: 49 }, bounds)).toBe(false);
  });

  it('hit tests against scaled and rotated entity bounds', () => {
    const scaled = { x: 10, y: 20, width: 16, height: 16, scaleX: 2, scaleY: 0.5 };
    expect(hitTestEntityBounds({ x: 41, y: 27 }, scaled)).toBe(true);
    expect(hitTestEntityBounds({ x: 43, y: 27 }, scaled)).toBe(false);

    const rotated = {
      x: 0,
      y: 0,
      width: 10,
      height: 20,
      rotation: Math.PI / 2,
    };
    expect(hitTestEntityBounds({ x: -10, y: 5 }, rotated)).toBe(true);
    expect(hitTestEntityBounds({ x: 5, y: 5 }, rotated)).toBe(false);
  });

  it('calculates snapped and unsnapped drag positions', () => {
    expect(snapToGrid(47, 32)).toBe(32);
    expect(snapToGrid(49, 32)).toBe(64);
    expect(calculateDragPosition(77, 98, 10, 11, 32, true)).toEqual({ x: 64, y: 96 });
    expect(calculateDragPosition(77, 98, 10, 11, 32, false)).toEqual({ x: 67, y: 87 });
  });

  it('calculates keyboard nudge offsets', () => {
    expect(calculateKeyboardNudge('ArrowLeft', 32, false)).toEqual({ dx: -32, dy: 0 });
    expect(calculateKeyboardNudge('ArrowRight', 32, true)).toEqual({ dx: 1, dy: 0 });
    expect(calculateKeyboardNudge('ArrowUp', 16, false)).toEqual({ dx: 0, dy: -16 });
    expect(calculateKeyboardNudge('ArrowDown', 16, true)).toEqual({ dx: 0, dy: 1 });
    expect(calculateKeyboardNudge('Enter', 32, false)).toBeNull();
  });

  it('keeps rectangle live sync in place for size and color changes', () => {
    expect(shouldReplaceEntityVisual(
      { renderKind: 'rectangle', assetRef: null },
      { renderKind: 'rectangle', assetRef: null },
    )).toBe(false);
  });

  it('replaces visuals when asset rendering changes', () => {
    expect(shouldReplaceEntityVisual(
      { renderKind: 'rectangle', assetRef: null },
      { renderKind: 'image', assetRef: 'asset-1' },
    )).toBe(true);
    expect(shouldReplaceEntityVisual(
      { renderKind: 'image', assetRef: 'asset-1' },
      { renderKind: 'image', assetRef: 'asset-2' },
    )).toBe(true);
  });

  it('detects collision body sync changes', () => {
    const wall = createCollisionSignature({ width: 32, height: 16, type: 'wall' });
    const resizedWall = createCollisionSignature({ width: 64, height: 16, type: 'wall' });

    expect(wall).not.toBeNull();
    expect(resizedWall).not.toEqual(wall);
    expect(createCollisionSignature(undefined)).toBeNull();
  });
});
