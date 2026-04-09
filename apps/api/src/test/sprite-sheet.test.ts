/**
 * Sprite Sheet Service — Tests
 * M11: Generative Media Forge
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpriteSheetService } from '../services/spriteSheetService';
import { rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './data/test-sprite-projects';
const TEST_PROJECT = 'test-project-sprites';

describe('SpriteSheetService', () => {
  let service: SpriteSheetService;

  beforeEach(() => {
    service = new SpriteSheetService();
    const projectDir = join(TEST_DIR, TEST_PROJECT);
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
    process.env.PROJECTS_DIR = TEST_DIR;
  });

  afterEach(() => {
    const projectDir = join(TEST_DIR, TEST_PROJECT);
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
    delete process.env.PROJECTS_DIR;
  });

  it('should generate a sprite sheet from a prompt', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'pixel knight character',
    });

    expect(sheet).toBeDefined();
    expect(sheet.prompt).toBe('pixel knight character');
    expect(sheet.name).toBe('pixel_knight_character');
    expect(sheet.artStyle).toBe('pixel');
    expect(sheet.frameWidth).toBe(32);
    expect(sheet.frameHeight).toBe(32);
    expect(sheet.columns).toBe(8);
    expect(sheet.rows).toBe(8);
    expect(sheet.frameCount).toBe(64);
    expect(sheet.frames).toHaveLength(64);
    expect(sheet.id).toMatch(/^sprite_/);
    expect(sheet.animations.length).toBeGreaterThan(0);
  });

  it('should persist sprite sheet JSON and SVG files', async () => {
    await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'blue dragon enemy',
    });

    const dir = join(TEST_DIR, TEST_PROJECT, 'assets', 'sprites');
    expect(existsSync(join(dir, 'blue_dragon_enemy.spritesheet.json'))).toBe(true);
    expect(existsSync(join(dir, 'blue_dragon_enemy.svg'))).toBe(true);

    const data = JSON.parse(readFileSync(join(dir, 'blue_dragon_enemy.spritesheet.json'), 'utf-8'));
    expect(data.prompt).toBe('blue dragon enemy');
  });

  it('should select animations based on prompt keywords', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'platformer player character with jump and attack',
    });

    const animNames = sheet.animations.map(a => a.name);
    expect(animNames).toContain('idle');
    expect(animNames).toContain('jump');
    expect(animNames).toContain('attack');
  });

  it('should respect explicit animation list', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'wizard character',
      animations: ['idle', 'cast', 'death'],
    });

    const animNames = sheet.animations.map(a => a.name);
    expect(animNames).toContain('idle');
    expect(animNames).toContain('cast');
    expect(animNames).toContain('death');
    expect(animNames).not.toContain('walk');
  });

  it('should support custom dimensions', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'large boss enemy',
      frameWidth: 64,
      frameHeight: 64,
      columns: 4,
      rows: 4,
    });

    expect(sheet.frameWidth).toBe(64);
    expect(sheet.frameHeight).toBe(64);
    expect(sheet.columns).toBe(4);
    expect(sheet.rows).toBe(4);
    expect(sheet.frameCount).toBe(16);
    expect(sheet.frames).toHaveLength(16);
  });

  it('should generate correct frame coordinates', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'test sprite',
      columns: 4,
      rows: 2,
    });

    // Frame 0: top-left
    expect(sheet.frames[0].x).toBe(0);
    expect(sheet.frames[0].y).toBe(0);
    // Frame 5: row 1, col 1
    expect(sheet.frames[5].x).toBe(32);
    expect(sheet.frames[5].y).toBe(32);
    // Frame 7: row 1, col 3
    expect(sheet.frames[7].x).toBe(96);
    expect(sheet.frames[7].y).toBe(32);
  });

  it('should list sprite sheets for a project', async () => {
    await service.generate({ projectId: TEST_PROJECT, prompt: 'hero' });
    await service.generate({ projectId: TEST_PROJECT, prompt: 'villain' });

    const sheets = await service.list(TEST_PROJECT);
    expect(sheets).toHaveLength(2);
  });

  it('should return empty array when no sheets exist', async () => {
    const sheets = await service.list(TEST_PROJECT);
    expect(sheets).toEqual([]);
  });

  it('should get a single sprite sheet by name', async () => {
    await service.generate({ projectId: TEST_PROJECT, prompt: 'goblin' });

    const sheet = await service.get(TEST_PROJECT, 'goblin');
    expect(sheet).not.toBeNull();
    expect(sheet!.name).toBe('goblin');
  });

  it('should return null for non-existent sprite sheet', async () => {
    const sheet = await service.get(TEST_PROJECT, 'nonexistent');
    expect(sheet).toBeNull();
  });

  it('should delete a sprite sheet and its SVG', async () => {
    await service.generate({ projectId: TEST_PROJECT, prompt: 'skeleton' });

    const dir = join(TEST_DIR, TEST_PROJECT, 'assets', 'sprites');
    expect(existsSync(join(dir, 'skeleton.spritesheet.json'))).toBe(true);

    const deleted = await service.delete(TEST_PROJECT, 'skeleton');
    expect(deleted).toBe(true);
    expect(existsSync(join(dir, 'skeleton.spritesheet.json'))).toBe(false);
    expect(existsSync(join(dir, 'skeleton.svg'))).toBe(false);
  });

  it('should return false when deleting non-existent sheet', async () => {
    const deleted = await service.delete(TEST_PROJECT, 'nonexistent');
    expect(deleted).toBe(false);
  });

  it('should handle long prompts by truncating name', async () => {
    const sheet = await service.generate({
      projectId: TEST_PROJECT,
      prompt: 'a very long description of a character that goes on and on and on and on and on and on and on and on and on',
    });

    expect(sheet.name.length).toBeLessThanOrEqual(40);
  });

  it('should support all art styles', async () => {
    for (const style of ['pixel', 'vector', 'hand-drawn', 'cartoon', 'realistic'] as const) {
      const sheet = await service.generate({
        projectId: TEST_PROJECT,
        prompt: `test ${style}`,
        artStyle: style,
      });
      expect(sheet.artStyle).toBe(style);
    }
  });
});
