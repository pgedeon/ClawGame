import { compileScene, compileBootstrapHTML, extractUserRegions, USER_CODE_MARKERS } from '../src/scene-compiler';
import { createDefaultAssetPack, addAssetToPack } from '../src/asset-pack';
import type { Scene, Entity } from '../src/types';

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'hero',
    type: 'player',
    transform: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
    components: new Map([
      ['sprite', { assetId: 'hero-sprite', frameIndex: 0 }],
    ]),
    ...overrides,
  };
}

const mockScene = (entities: Entity[] = []): Scene => ({
  id: 'scene-1',
  name: 'Main Scene',
  entities: new Map(entities.map((e) => [e.id, e])),
  backgroundColor: '#1a1a2e',
  bounds: { width: 800, height: 600 },
  gridSize: 32,
});

describe('scene-compiler', () => {
  describe('compileScene', () => {
    it('generates valid Phaser Scene TypeScript', () => {
      const scene = mockScene([makeEntity()]);
      const code = compileScene(scene, { className: 'MainScene', language: 'typescript' });
      expect(code).toContain("import * as Phaser from 'phaser';");
      expect(code).toContain('export class MainScene extends Phaser.Scene');
      expect(code).toContain('preload()');
      expect(code).toContain('create()');
      expect(code).toContain('hero-sprite');
      expect(code).toContain('100, 200');
    });

    it('generates JavaScript without type annotations', () => {
      const scene = mockScene([makeEntity()]);
      const code = compileScene(scene, { className: 'MainScene', language: 'javascript' });
      expect(code).toContain('extends Phaser.Scene');
    });

    it('sorts entities deterministically', () => {
      const scene = mockScene([
        makeEntity({ id: 'z', name: 'zone', type: 'zone' }),
        makeEntity({ id: 'e', name: 'enemy', type: 'enemy', components: new Map() }),
        makeEntity({ id: 'p', name: 'player', type: 'player' }),
      ]);
      const code = compileScene(scene, { className: 'S', language: 'typescript' });
      const playerPos = code.indexOf('player');
      const enemyPos = code.indexOf('enemy');
      const zonePos = code.indexOf('zone');
      expect(playerPos).toBeLessThan(enemyPos);
      expect(enemyPos).toBeLessThan(zonePos);
    });

    it('handles empty scenes', () => {
      const scene = mockScene([]);
      const code = compileScene(scene, { className: 'Empty', language: 'typescript' });
      expect(code).toContain('Scene is empty');
    });

    it('handles text entities', () => {
      const scene = mockScene([
        makeEntity({
          id: 't1',
          name: 'Title',
          type: 'text',
          transform: { x: 400, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
          components: new Map([
            ['text', { content: 'Hello World', fontSize: '32px', color: '#ffffff', fontFamily: 'Arial' }],
          ]),
        }),
      ]);
      const code = compileScene(scene, { className: 'S', language: 'typescript' });
      expect(code).toContain('Hello World');
      expect(code).toContain('32px');
    });

    it('includes asset pack preload code', () => {
      const pack = addAssetToPack(createDefaultAssetPack('p1'), { key: 'bg', type: 'image', url: 'bg.png' });
      const scene = mockScene([makeEntity()]);
      const code = compileScene(scene, { className: 'S', language: 'typescript', assetPack: pack });
      expect(code).toContain("this.load.image('bg'");
    });
  });

  describe('user code preservation', () => {
    it('preserves user imports', () => {
      const scene = mockScene([makeEntity()]);
      const code = compileScene(scene, {
        className: 'S',
        language: 'typescript',
        userRegions: { [USER_CODE_MARKERS.IMPORTS]: "import { MyPlugin } from './plugin';" },
      });
      expect(code).toContain("import { MyPlugin } from './plugin';");
    });

    it('preserves user create code with markers', () => {
      const scene = mockScene([makeEntity()]);
      const code = compileScene(scene, {
        className: 'S',
        language: 'typescript',
        userRegions: { [USER_CODE_MARKERS.CREATE]: 'this.score = 0;' },
      });
      expect(code).toContain('this.score = 0;');
      expect(code).toContain(`BEGIN ${USER_CODE_MARKERS.CREATE}`);
      expect(code).toContain(`END ${USER_CODE_MARKERS.CREATE}`);
    });

    it('extracts user regions from compiled code', () => {
      const code = `
import Phaser from 'phaser';
// <BEGIN USER_IMPORTS>
import { extra } from 'extra';
// <END USER_IMPORTS>
export class S extends Phaser.Scene {
  create() {
    // <BEGIN USER_CREATE>
    this.foo = true;
    // <END USER_CREATE>
  }
}`;
      const regions = extractUserRegions(code);
      expect(regions[USER_CODE_MARKERS.IMPORTS]).toContain("import { extra }");
      expect(regions[USER_CODE_MARKERS.CREATE]).toContain('this.foo = true');
    });
  });

  describe('compileBootstrapHTML', () => {
    it('generates valid HTML with Phaser CDN', () => {
      const html = compileBootstrapHTML('MainScene', { width: 1024, height: 768 });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('sceneClass');
      expect(html).toContain('width: 1024');
      expect(html).toContain('height: 768');
      expect(html).toContain('cdn.jsdelivr.net');
    });

    it('snapshot test', () => {
      const html = compileBootstrapHTML('Test', {});
      expect(html).toMatchSnapshot();
    });
  });

  describe('snapshot tests', () => {
    it('compiled scene snapshot', () => {
      const scene = mockScene([
        makeEntity(),
        makeEntity({
          id: 't1', name: 'Title', type: 'text',
          transform: { x: 400, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
          components: new Map([['text', { content: 'Hello', fontSize: '32px', color: '#fff' }]]),
        }),
      ]);
      const code = compileScene(scene, { className: 'SnapshotScene', language: 'typescript' });
      expect(code).toMatchSnapshot();
    });
  });
});
