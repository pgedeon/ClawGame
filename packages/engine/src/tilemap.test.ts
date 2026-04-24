import {
  createDefaultTilemap,
  addTileLayer,
  removeTileLayer,
  setTile,
  fillRect,
  addTileset,
  generateTilemapCode,
} from '../src/tilemap';

describe('tilemap', () => {
  describe('createDefaultTilemap', () => {
    it('creates with correct dimensions', () => {
      const map = createDefaultTilemap(10, 8, 32, 32);
      expect(map.width).toBe(10);
      expect(map.height).toBe(8);
      expect(map.layers).toHaveLength(1);
      expect(map.layers[0].data).toHaveLength(8);
      expect(map.layers[0].data[0]).toHaveLength(10);
    });
  });

  describe('addTileLayer', () => {
    it('adds a new layer', () => {
      const map = createDefaultTilemap(4, 4, 16, 16);
      const next = addTileLayer(map, 'Collision');
      expect(next.layers).toHaveLength(2);
      expect(next.layers[1].name).toBe('Collision');
    });
  });

  describe('removeTileLayer', () => {
    it('removes a layer by id', () => {
      let map = createDefaultTilemap(4, 4, 16, 16);
      map = addTileLayer(map, 'Extra');
      const next = removeTileLayer(map, 'layer-2');
      expect(next.layers).toHaveLength(1);
    });
  });

  describe('setTile', () => {
    it('sets a tile at given position', () => {
      const map = createDefaultTilemap(4, 4, 16, 16);
      const next = setTile(map, 'layer-1', 2, 1, 5);
      expect(next.layers[0].data[1][2]).toBe(5);
      // Original unchanged
      expect(map.layers[0].data[1][2]).toBe(-1);
    });

    it('ignores out-of-bounds', () => {
      const map = createDefaultTilemap(4, 4, 16, 16);
      const next = setTile(map, 'layer-1', 99, 99, 1);
      expect(next.layers[0].data).toEqual(map.layers[0].data);
    });
  });

  describe('fillRect', () => {
    it('fills a rectangle of tiles', () => {
      const map = createDefaultTilemap(4, 4, 16, 16);
      const next = fillRect(map, 'layer-1', 1, 1, 2, 2, 3);
      expect(next.layers[0].data[1][1]).toBe(3);
      expect(next.layers[0].data[2][2]).toBe(3);
      expect(next.layers[0].data[0][0]).toBe(-1);
    });
  });

  describe('addTileset', () => {
    it('adds a tileset', () => {
      const map = createDefaultTilemap(4, 4, 16, 16);
      const next = addTileset(map, { name: 'grass', imageKey: 'grass-tiles', tileWidth: 16, tileHeight: 16, columns: 8, margin: 0, spacing: 0 });
      expect(next.tilesets).toHaveLength(1);
      expect(next.tilesets[0].name).toBe('grass');
    });
  });

  describe('generateTilemapCode', () => {
    it('generates preload and create code', () => {
      let map = createDefaultTilemap(4, 4, 16, 16);
      map = addTileset(map, { name: 'tiles', imageKey: 'tiles.png', tileWidth: 16, tileHeight: 16, columns: 4, margin: 0, spacing: 0 });
      const code = generateTilemapCode(map);
      expect(code.some((l) => l.includes('spritesheet'))).toBe(true);
      expect(code.some((l) => l.includes('Layer 1'))).toBe(true);
    });
  });
});
