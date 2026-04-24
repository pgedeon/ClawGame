/**
 * @clawgame/engine - Tilemap types and utilities
 */

export interface TileLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  /** 2D array: rows[col] = tile index (-1 = empty) */
  data: number[][];
}

export interface Tileset {
  id: string;
  name: string;
  imageKey: string;     // asset pack key
  tileWidth: number;
  tileHeight: number;
  columns: number;      // tiles per row in the spritesheet
  margin: number;
  spacing: number;
  firstGid: number;     // global ID offset
  /** Collision flags per tile: gid -> boolean */
  collisionTiles?: Set<number>;
}

export interface TilemapData {
  version: 1;
  width: number;        // in tiles
  height: number;       // in tiles
  tileWidth: number;
  tileHeight: number;
  tilesets: Tileset[];
  layers: TileLayer[];
  /** Map of global tile IDs to collision categories */
  collisionMap?: Record<number, string>;
}

export function createDefaultTilemap(width: number, height: number, tileWidth: number, tileHeight: number): TilemapData {
  const emptyLayer = (): number[][] => Array.from({ length: height }, () => Array(width).fill(-1));
  return {
    version: 1,
    width,
    height,
    tileWidth,
    tileHeight,
    tilesets: [],
    layers: [{
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      data: emptyLayer(),
    }],
  };
}

export function addTileLayer(map: TilemapData, name: string): TilemapData {
  const emptyData = Array.from({ length: map.height }, () => Array(map.width).fill(-1));
  return {
    ...map,
    layers: [...map.layers, {
      id: `layer-${map.layers.length + 1}`,
      name,
      visible: true,
      locked: false,
      opacity: 1,
      data: emptyData,
    }],
  };
}

export function removeTileLayer(map: TilemapData, layerId: string): TilemapData {
  return { ...map, layers: map.layers.filter((l) => l.id !== layerId) };
}

export function setTile(map: TilemapData, layerId: string, col: number, row: number, gid: number): TilemapData {
  return {
    ...map,
    layers: map.layers.map((layer) => {
      if (layer.id !== layerId) return layer;
      const data = layer.data.map((r) => [...r]);
      if (row >= 0 && row < map.height && col >= 0 && col < map.width) {
        data[row][col] = gid;
      }
      return { ...layer, data };
    }),
  };
}

export function fillRect(map: TilemapData, layerId: string, col: number, row: number, w: number, h: number, gid: number): TilemapData {
  return {
    ...map,
    layers: map.layers.map((layer) => {
      if (layer.id !== layerId) return layer;
      const data = layer.data.map((r) => [...r]);
      for (let r = row; r < Math.min(row + h, map.height); r++) {
        for (let c = col; c < Math.min(col + w, map.width); c++) {
          if (r >= 0 && c >= 0) data[r][c] = gid;
        }
      }
      return { ...layer, data };
    }),
  };
}

export function addTileset(map: TilemapData, tileset: Omit<Tileset, 'id' | 'firstGid'>): TilemapData {
  const maxGid = map.tilesets.reduce((max, ts) => max + ts.columns * Math.ceil(1), 0);
  return {
    ...map,
    tilesets: [...map.tilesets, { ...tileset, id: `tileset-${map.tilesets.length + 1}`, firstGid: maxGid || 1 }],
  };
}

/** Compile tilemap setup to Phaser code */
export function generateTilemapCode(map: TilemapData): string[] {
  const lines: string[] = [];

  // Preload tileset images
  for (const ts of map.tilesets) {
    lines.push(`    this.load.spritesheet('${ts.name}', '${ts.imageKey}', { frameWidth: ${ts.tileWidth}, frameHeight: ${ts.tileHeight} });`);
  }

  // Create method
  lines.push('');
  lines.push('    // Tilemap setup');

  if (map.tilesets.length > 0) {
    // Create a blank tilemap
    lines.push(`    const map = this.make.tilemap({ data: null, tileWidth: ${map.tileWidth}, tileHeight: ${map.tileHeight} });`);

    // For each layer, create tile data
    for (let li = 0; li < map.layers.length; li++) {
      const layer = map.layers[li];
      if (!layer.visible) continue;

      lines.push(`    // Layer: ${layer.name}`);
      const dataStr = layer.data.map((row) => `[${row.join(',')}]`).join(', ');
      lines.push(`    const layer${li}Data = [${dataStr}];`);
      lines.push(`    const layer${li} = map.createLayer(0, null, 0, 0);`);
      lines.push(`    layer${li}.setName('${layer.name}');`);
      if (layer.opacity < 1) lines.push(`    layer${li}.setAlpha(${layer.opacity});`);
    }
  }

  return lines;
}
