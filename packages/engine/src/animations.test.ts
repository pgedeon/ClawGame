import {
  createDefaultAnimationsConfig,
  createAnimation,
  serializeAnimationsConfig,
  parseAnimationsConfig,
  addAnimation,
  removeAnimation,
  updateAnimation,
  generateAnimationCode,
} from '../src/animations';

describe('animations', () => {
  describe('createAnimation', () => {
    it('creates with defaults', () => {
      const anim = createAnimation('walk', ['walk-0', 'walk-1', 'walk-2']);
      expect(anim.key).toBe('walk');
      expect(anim.frames).toHaveLength(3);
      expect(anim.frameRate).toBe(12);
      expect(anim.repeat).toBe(-1);
      expect(anim.yoyo).toBe(false);
    });

    it('overrides defaults', () => {
      const anim = createAnimation('run', ['r-0'], { frameRate: 24, repeat: 0, yoyo: true });
      expect(anim.frameRate).toBe(24);
      expect(anim.repeat).toBe(0);
      expect(anim.yoyo).toBe(true);
    });
  });

  describe('config CRUD', () => {
    it('adds and removes animations', () => {
      let config = createDefaultAnimationsConfig();
      config = addAnimation(config, createAnimation('walk', ['w-0']));
      config = addAnimation(config, createAnimation('run', ['r-0']));
      expect(config.animations).toHaveLength(2);
      config = removeAnimation(config, 'walk');
      expect(config.animations).toHaveLength(1);
      expect(config.animations[0].key).toBe('run');
    });

    it('updates animation', () => {
      let config = addAnimation(createDefaultAnimationsConfig(), createAnimation('walk', ['w-0']));
      config = updateAnimation(config, 'walk', { frameRate: 30 });
      expect(config.animations[0].frameRate).toBe(30);
    });
  });

  describe('serialize/parse round-trip', () => {
    it('round-trips correctly', () => {
      let config = createDefaultAnimationsConfig();
      config = addAnimation(config, createAnimation('walk', ['w-0', 'w-1']));
      const json = serializeAnimationsConfig(config);
      const parsed = parseAnimationsConfig(json);
      expect(parsed.animations).toHaveLength(1);
      expect(parsed.animations[0].frames).toHaveLength(2);
    });

    it('throws on wrong version', () => {
      expect(() => parseAnimationsConfig('{"version":2}')).toThrow('Unsupported');
    });
  });

  describe('generateAnimationCode', () => {
    it('generates anims.create calls', () => {
      let config = addAnimation(createDefaultAnimationsConfig(), createAnimation('walk', ['w-0', 'w-1']));
      const code = generateAnimationCode(config);
      expect(code).toContain("this.anims.create({");
      expect(code).toContain("key: 'walk'");
      expect(code).toContain("frameRate: 12");
      expect(code).toContain("repeat: -1");
    });
  });
});
