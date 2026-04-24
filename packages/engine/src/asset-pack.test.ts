import {
  createDefaultAssetPack,
  addAssetToPack,
  removeAssetFromPack,
  serializeAssetPack,
  parseAssetPack,
  validateAssetPack,
  assetToPackEntry,
  generatePreloadCode,
  type AssetPack,
  type AssetPackEntry,
} from '../src/asset-pack';

describe('asset-pack', () => {
  describe('createDefaultAssetPack', () => {
    it('creates an empty pack with correct version', () => {
      const pack = createDefaultAssetPack('proj-1');
      expect(pack.version).toBe(1);
      expect(pack.entries).toEqual([]);
      expect(pack.baseUrl).toContain('proj-1');
    });
  });

  describe('addAssetToPack', () => {
    it('adds an entry immutably', () => {
      const pack = createDefaultAssetPack('p1');
      const entry: AssetPackEntry = { key: 'hero', type: 'image', url: 'hero.png' };
      const next = addAssetToPack(pack, entry);
      expect(next.entries).toHaveLength(1);
      expect(next.entries[0].key).toBe('hero');
      expect(pack.entries).toHaveLength(0); // original unchanged
    });
  });

  describe('removeAssetFromPack', () => {
    it('removes by key immutably', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'hero', type: 'image', url: 'hero.png' });
      const next = removeAssetFromPack(pack, 'hero');
      expect(next.entries).toHaveLength(0);
      expect(pack.entries).toHaveLength(1);
    });
  });

  describe('serializeAssetPack / parseAssetPack', () => {
    it('round-trips correctly', () => {
      const pack = addAssetToPack(
        createDefaultAssetPack('p1'),
        { key: 'tile', type: 'spritesheet', url: 'tile.png', frameConfig: { frameWidth: 16, frameHeight: 16 } },
      );
      const json = serializeAssetPack(pack);
      const parsed = parseAssetPack(json);
      expect(parsed.version).toBe(1);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].frameConfig?.frameWidth).toBe(16);
    });

    it('throws on unsupported version', () => {
      expect(() => parseAssetPack('{"version":99}')).toThrow('Unsupported');
    });
  });

  describe('validateAssetPack', () => {
    it('valid pack passes', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'hero', type: 'image', url: 'hero.png' });
      expect(validateAssetPack(pack).valid).toBe(true);
    });

    it('catches duplicate keys', () => {
      const pack = createDefaultAssetPack('p1');
      const p1 = addAssetToPack(pack, { key: 'a', type: 'image', url: 'a.png' });
      const p2 = addAssetToPack(p1, { key: 'a', type: 'image', url: 'a2.png' });
      expect(validateAssetPack(p2).valid).toBe(false);
      expect(validateAssetPack(p2).errors[0]).toContain('duplicate');
    });

    it('catches empty key', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: '', type: 'image', url: 'x.png' });
      expect(validateAssetPack(pack).valid).toBe(false);
    });

    it('catches empty URL', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'a', type: 'image', url: '' });
      expect(validateAssetPack(pack).valid).toBe(false);
    });

    it('catches invalid type', () => {
      const pack = addAssetToPack(
        createDefaultAssetPack('p1'),
        { key: 'a', type: 'invalid' as any, url: 'x.png' },
      );
      expect(validateAssetPack(pack).valid).toBe(false);
    });

    it('catches invalid key characters', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'has spaces', type: 'image', url: 'x.png' });
      expect(validateAssetPack(pack).valid).toBe(false);
    });

    it('catches invalid spritesheet frameConfig', () => {
      const pack = addAssetToPack(
        createDefaultAssetPack('p1'),
        { key: 'tile', type: 'spritesheet', url: 't.png', frameConfig: { frameWidth: 0, frameHeight: 16 } },
      );
      expect(validateAssetPack(pack).valid).toBe(false);
    });
  });

  describe('assetToPackEntry', () => {
    it('converts image asset', () => {
      const entry = assetToPackEntry({ id: '1', name: 'hero', type: 'sprite', url: 'hero.png' });
      expect(entry?.key).toBe('hero');
      expect(entry?.type).toBe('image');
    });

    it('converts audio asset', () => {
      const entry = assetToPackEntry({ id: '1', name: 'bgm', type: 'audio' });
      expect(entry?.type).toBe('audio');
    });

    it('converts spritesheet asset', () => {
      const entry = assetToPackEntry({ id: '1', name: 'tiles', type: 'spritesheet', width: 16, height: 16 });
      expect(entry?.type).toBe('spritesheet');
      expect(entry?.frameConfig?.frameWidth).toBe(16);
    });

    it('returns null for invalid input gracefully', () => {
      expect(assetToPackEntry({ id: '1' })).toBeTruthy();
    });
  });

  describe('generatePreloadCode', () => {
    it('generates image load code', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'hero', type: 'image', url: 'hero.png' });
      expect(generatePreloadCode(pack)).toContain("this.load.image('hero'");
    });

    it('generates spritesheet load code', () => {
      const pack = addAssetToPack(
        createDefaultAssetPack('p1'),
        { key: 'tiles', type: 'spritesheet', url: 't.png', frameConfig: { frameWidth: 16, frameHeight: 16 } },
      );
      expect(generatePreloadCode(pack)).toContain("this.load.spritesheet('tiles'");
    });

    it('generates audio load code', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'sfx', type: 'audio', url: 'sfx.mp3' });
      expect(generatePreloadCode(pack)).toContain("this.load.audio('sfx'");
    });
  });
});
