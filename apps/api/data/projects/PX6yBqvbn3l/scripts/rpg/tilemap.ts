/**
 * Eclipse of Runes — Tilemap Engine
 * Renders Tiled-compatible tile maps with multiple layers.
 * Supports collision layer queries for the physics system.
 */

export interface Tileset {
  name: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tileCount: number;
  // Color-based rendering (no sprites yet)
  palette: Record<number, string>;
}

export interface TileLayer {
  name: string;
  data: number[];       // tile IDs, row-major
  width: number;        // tiles across
  height: number;       // tiles down
  visible: boolean;
  opacity: number;
}

export interface TilemapData {
  width: number;        // map width in tiles
  height: number;       // map height in tiles
  tileWidth: number;
  tileHeight: number;
  layers: TileLayer[];
  tilesets: Tileset[];
}

export class TilemapEngine {
  private data: TilemapData;
  private collisionLayer: TileLayer | null = null;

  constructor(data: TilemapData) {
    this.data = data;
    this.refreshCollisionLayer();
  }

  /**
   * Find the collision layer by convention: first layer named 'collision'
   */
  refreshCollisionLayer(): void {
    this.collisionLayer = this.data.layers.find(
      l => l.name.toLowerCase() === 'collision'
    ) || null;
  }

  get width(): number { return this.data.width; }
  get height(): number { return this.data.height; }
  get tileWidth(): number { return this.data.tileWidth; }
  get tileHeight(): number { return this.data.tileHeight; }
  get pixelWidth(): number { return this.data.width * this.data.tileWidth; }
  get pixelHeight(): number { return this.data.height * this.data.tileHeight; }

  /**
   * Get tile ID at grid position
   */
  getTileAt(layerName: string, col: number, row: number): number {
    const layer = this.data.layers.find(l => l.name === layerName);
    if (!layer || col < 0 || row < 0 || col >= layer.width || row >= layer.height) return 0;
    return layer.data[row * layer.width + col];
  }

  /**
   * Check if a tile at pixel position is solid (collision layer)
   */
  isSolid(px: number, py: number): boolean {
    if (!this.collisionLayer) return false;
    const col = Math.floor(px / this.data.tileWidth);
    const row = Math.floor(py / this.data.tileHeight);
    if (col < 0 || row < 0 || col >= this.data.width || row >= this.data.height) return true;
    return this.collisionLayer.data[row * this.data.width + col] !== 0;
  }

  /**
   * Check if an axis-aligned bounding box overlaps any solid tiles
   */
  isBoxBlocked(x: number, y: number, w: number, h: number): boolean {
    // Check the four corners + center points for better coverage
    const points = [
      [x + 2, y + 2],
      [x + w - 2, y + 2],
      [x + 2, y + h - 2],
      [x + w - 2, y + h - 2],
      [x + w / 2, y + h / 2],
    ];
    return points.some(([px, py]) => this.isSolid(px, py));
  }

  /**
   * Render all visible layers within camera viewport
   */
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewportW: number, viewportH: number): void {
    const tw = this.data.tileWidth;
    const th = this.data.tileHeight;

    // Calculate visible tile range
    const startCol = Math.max(0, Math.floor(cameraX / tw));
    const endCol = Math.min(this.data.width, Math.ceil((cameraX + viewportW) / tw) + 1);
    const startRow = Math.max(0, Math.floor(cameraY / th));
    const endRow = Math.min(this.data.height, Math.ceil((cameraY + viewportH) / th) + 1);

    for (const layer of this.data.layers) {
      if (!layer.visible || layer.name.toLowerCase() === 'collision') continue;

      const tileset = this.data.tilesets[0]; // Use first tileset for rendering
      if (!tileset) continue;

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const tileId = layer.data[row * layer.width + col];
          if (tileId === 0) continue; // empty tile

          const screenX = Math.round(col * tw - cameraX);
          const screenY = Math.round(row * th - cameraY);

          const color = tileset.palette[tileId];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(screenX, screenY, tw, th);
          }
        }
      }
    }
  }
}
