/**
 * Export Service — Extended Tests
 * Tests Phaser code generation edge cases.
 */

import { describe, expect, it } from 'vitest';
import { ExportService } from '../services/exportService';

const mockLogger = {
  info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => mockLogger,
} as any;

describe('ExportService — compileSceneToPhaser', () => {
  const service = new ExportService(mockLogger);

  it('handles empty entity list', () => {
    const code = service.compileSceneToPhaser('EmptyScene', 'Empty', {}, [], { width: 800, height: 600 });
    expect(code).toContain('preload()');
    expect(code).toContain('create()');
  });

  it('generates entity with sprite + collision', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'Player', type: 'player',
        transform: { x: 100, y: 200 },
        components: new Map([['sprite', { assetId: 'hero' }], ['collision', { type: 'dynamic' }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain("this.load.image('hero'");
    expect(code).toContain("this.add.sprite(100, 200, 'hero')");
  });

  it('generates text entities', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'Score', type: 'text',
        transform: { x: 10, y: 10 },
        components: new Map([['text', { content: 'Score: 0', fontSize: '24px' }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain("this.add.text(10, 10, 'Score: 0'");
  });

  it('generates zone entities', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'Goal', type: 'zone',
        transform: { x: 750, y: 300 },
        components: new Map([['collision', { width: 32, height: 64 }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain('this.add.zone(750, 300');
  });

  it('generates circle entities', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'Orb', type: 'circle',
        transform: { x: 200, y: 150, width: 32, height: 32 },
        components: new Map([['sprite', { color: '#22c55e' }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain('this.add.circle(200, 150');
  });

  it('includes physics for collidable entities', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'Wall', type: 'obstacle',
        transform: { x: 400, y: 300 },
        components: new Map([['sprite', { assetId: 'brick' }], ['collision', { type: 'wall', immovable: true }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain('physics.add.existing');
  });

  it('handles multiple entities', () => {
    const entities = {
      'e1': {
        id: 'e1', name: 'P1', type: 'player',
        transform: { x: 100, y: 200 },
        components: new Map([['sprite', { assetId: 'hero' }]]),
      },
      'e2': {
        id: 'e2', name: 'P2', type: 'player',
        transform: { x: 200, y: 300 },
        components: new Map([['sprite', { assetId: 'hero2' }]]),
      },
    };
    const code = service.compileSceneToPhaser('TestScene', 'Test', entities, [], { width: 800, height: 600 });
    expect(code).toContain("this.add.sprite(100, 200, 'hero')");
    expect(code).toContain("this.add.sprite(200, 300, 'hero2')");
  });
});

describe('ExportService — generatePhaserHTML', () => {
  const service = new ExportService(mockLogger);

  it('produces valid HTML document', () => {
    const html = service.generatePhaserHTML(
      { name: 'Test Game', version: '1.0.0' },
      'GameScene',
      '    preload() {}\n    create() {}',
      [],
      { width: 800, height: 600, backgroundColor: '#1a1a2e' },
    );
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  it('includes Phaser CDN', () => {
    const html = service.generatePhaserHTML(
      { name: 'Test', version: '1.0.0' }, 'GameScene', '', [], { width: 800, height: 600 },
    );
    expect(html).toContain('phaser@4');
    expect(html).toContain('<script');
  });

  it('includes game configuration', () => {
    const html = service.generatePhaserHTML(
      { name: 'Test', version: '1.0.0' }, 'GameScene', '', [], { width: 1024, height: 768 },
    );
    expect(html).toContain('width: 1024');
    expect(html).toContain('height: 768');
  });

  it('includes scene class', () => {
    const html = service.generatePhaserHTML(
      { name: 'Test', version: '1.0.0' },
      'MyAwesomeScene',
      '    preload() { this.load.image("test", "test.png"); }',
      [],
      { width: 800, height: 600 },
    );
    expect(html).toContain('class MyAwesomeScene');
    expect(html).toContain('this.load.image("test"');
  });

  it('includes scene code in HTML', () => {
    const html = service.generatePhaserHTML(
      { name: 'Test', version: '1.0.0' }, 'GameScene',
      '    preload() { this.load.image("bg", "assets/bg.png"); }',
      [], { width: 800, height: 600 },
    );
    expect(html).toContain('class GameScene');
    expect(html).toContain('assets/bg.png');
  });
});
