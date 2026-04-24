export interface EditorEntityBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export type EditorRenderKind = 'image' | 'sprite' | 'rectangle' | 'circle' | 'text' | 'zone';

export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(gridSize) || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

export function calculateDragPosition(
  pointerX: number,
  pointerY: number,
  offsetX: number,
  offsetY: number,
  gridSize: number,
  snapping: boolean,
): { x: number; y: number } {
  const x = pointerX - offsetX;
  const y = pointerY - offsetY;

  if (!snapping) {
    return { x, y };
  }

  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
}

export function calculateKeyboardNudge(
  key: string,
  gridSize: number,
  shiftKey: boolean,
): { dx: number; dy: number } | null {
  const amount = shiftKey ? 1 : gridSize;

  switch (key) {
    case 'ArrowLeft':
      return { dx: -amount, dy: 0 };
    case 'ArrowRight':
      return { dx: amount, dy: 0 };
    case 'ArrowUp':
      return { dx: 0, dy: -amount };
    case 'ArrowDown':
      return { dx: 0, dy: amount };
    default:
      return null;
  }
}

export function hitTestEntityBounds(
  point: { x: number; y: number },
  bounds: EditorEntityBounds,
): boolean {
  const scaleX = bounds.scaleX || 1;
  const scaleY = bounds.scaleY || 1;
  const rotation = bounds.rotation || 0;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const translatedX = point.x - bounds.x;
  const translatedY = point.y - bounds.y;
  const localX = (translatedX * cos - translatedY * sin) / scaleX;
  const localY = (translatedX * sin + translatedY * cos) / scaleY;

  return localX >= 0 && localX <= bounds.width && localY >= 0 && localY <= bounds.height;
}

export function createCollisionSignature(collision: unknown): string | null {
  return collision ? JSON.stringify(collision) : null;
}

export function shouldReplaceEntityVisual(
  current: { renderKind: EditorRenderKind; assetRef: string | null },
  next: { renderKind: EditorRenderKind; assetRef: string | null },
): boolean {
  return current.renderKind !== next.renderKind || current.assetRef !== next.assetRef;
}
