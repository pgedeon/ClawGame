import { describe, expect, it } from 'vitest';
import { ExportService } from '../services/exportService';

describe('export service - Phaser export', () => {
  const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

  describe('compileSceneToPhaser', () => {
    it('generates preload and create methods', () => {
      const service = new ExportService(mockLogger);
      const entities: Record<string, any> = {
        'player-1': {
          id: 'player-1', name: 'Player', type: 'player',
          transform: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
          components: new Map([['sprite', { assetId: 'hero' }], ['collision', { type: 'dynamic' }]]),
        },
        'wall-1': {
          id: 'wall-1', name: 'Wall', type: 'obstacle',
          transform: { x: 400, y: 300 },
          components: new Map([['sprite', { assetId: 'brick' }], ['collision', { type: 'wall', immovable: true }]]),
        },
        'text-1': {
          id: 'text-1', name: 'Score', type: 'text',
          transform: { x: 10, y: 10 },
          components: new Map([['text', { content: 'Score: 0', fontSize: '24px' }]]),
        },
        'zone-1': {
          id: 'zone-1', name: 'Goal', type: 'zone',
          transform: { x: 750, y: 300 },
          components: new Map([['collision', { width: 32, height: 64 }]]),
        },
        'circle-1': {
          id: 'circle-1', name: 'Orb', type: 'circle',
          transform: { x: 200, y: 150, width: 32, height: 32 },
          components: new Map([['sprite', { color: '#22c55e' }]]),
        },
      };

      const code = service.compileSceneToPhaser('TestScene', 'Test', entities, { width: 800, height: 600 });
      expect(code).toContain('preload()');
      expect(code).toContain('create()');
      expect(code).toContain("this.load.image('hero'");
      expect(code).toContain("this.add.sprite(100, 200, 'hero')");
      expect(code).toContain('physics.add.existing');
      expect(code).toContain("this.add.text(10, 10, 'Score: 0'");
      expect(code).toContain("this.add.zone(750, 300, 32, 64)");
      expect(code).toContain('this.add.circle(200, 150, 16');
    });
  });

  describe('generatePhaserHTML', () => {
    it('produces complete HTML with Phaser CDN', () => {
      const service = new ExportService(mockLogger);
      const html = service.generatePhaserHTML(
        { name: 'Test Game', version: '1.0.0' },
        'GameScene',
        '    preload() {}\n    create() {}',
        [],
        { width: 800, height: 600, backgroundColor: '#1a1a2e' },
      );
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('phaser@4.0.0');
      expect(html).toContain('class GameScene');
      expect(html).toContain('new Phaser.Game(config)');
      expect(html).toContain('width: 800');
    });
  });
});
