/**
 * SFX Generation Service — Tests
 * M11: Generative Media Forge
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SFXGenerationService } from '../services/sfxGenerationService';
import { rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './data/test-sfx-projects';
const TEST_PROJECT = 'test-project-sfx';

describe('SFXGenerationService', () => {
  let service: SFXGenerationService;

  beforeEach(() => {
    service = new SFXGenerationService();
    // Clean up test dir completely before each test
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

  it('should generate a platformer SFX pack with correct structure', async () => {
    const pack = await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'platformer',
    });

    expect(pack).toBeDefined();
    expect(pack.genre).toBe('platformer');
    expect(pack.style).toBe('retro');
    expect(pack.effects.length).toBeGreaterThan(0);
    expect(pack.id).toMatch(/^pack_/);

    for (const sfx of pack.effects) {
      expect(sfx.id).toMatch(/^sfx_/);
      expect(sfx.name).toBeTruthy();
      expect(sfx.category).toBeTruthy();
      expect(sfx.tags).toBeInstanceOf(Array);
      expect(sfx.description).toBeTruthy();
      expect(sfx.createdAt).toBeTruthy();
    }
  });

  it('should persist pack and individual SFX files', async () => {
    await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'rpg',
    });

    const sfxDir = join(TEST_DIR, TEST_PROJECT, 'assets', 'sfx');
    expect(existsSync(join(sfxDir, 'pack.json'))).toBe(true);

    const pack = JSON.parse(readFileSync(join(sfxDir, 'pack.json'), 'utf-8'));
    for (const sfx of pack.effects) {
      expect(existsSync(join(sfxDir, `${sfx.name}.sfx.json`))).toBe(true);
    }
  });

  it('should respect count parameter', async () => {
    const pack = await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'platformer',
      count: 3,
    });

    expect(pack.effects).toHaveLength(3);
  });

  it('should handle unknown genres with fallback', async () => {
    const pack = await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'totally-unknown-genre-xyz',
    });

    expect(pack.effects.length).toBeGreaterThan(0);
  });

  it('should list packs for a project', async () => {
    await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'shooter',
    });

    const packs = await service.listPacks(TEST_PROJECT);
    expect(packs).toHaveLength(1);
    expect(packs[0].genre).toBe('shooter');
  });

  it('should return empty array when no packs exist', async () => {
    const packs = await service.listPacks(TEST_PROJECT);
    expect(packs).toEqual([]);
  });

  it('should get a single SFX by name', async () => {
    await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'platformer',
    });

    const sfx = await service.getSFX(TEST_PROJECT, 'jump');
    expect(sfx).not.toBeNull();
    expect(sfx!.name).toBe('jump');
    expect(sfx!.category).toBe('movement');
  });

  it('should return null for non-existent SFX', async () => {
    const sfx = await service.getSFX(TEST_PROJECT, 'nonexistent');
    expect(sfx).toBeNull();
  });

  it('should delete a SFX by name', async () => {
    await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'platformer',
    });

    const deleted = await service.deleteSFX(TEST_PROJECT, 'jump');
    expect(deleted).toBe(true);

    const sfx = await service.getSFX(TEST_PROJECT, 'jump');
    expect(sfx).toBeNull();
  });

  it('should return false when deleting non-existent SFX', async () => {
    const deleted = await service.deleteSFX(TEST_PROJECT, 'nonexistent');
    expect(deleted).toBe(false);
  });

  it('should support genre partial matching', async () => {
    const pack = await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'tower_defense',
    });
    expect(pack.effects.some(e => e.name === 'tower_place')).toBe(true);
  });

  it('should support custom style parameter', async () => {
    const pack = await service.generatePack({
      projectId: TEST_PROJECT,
      gameGenre: 'puzzle',
      style: 'orchestral',
    });
    expect(pack.style).toBe('orchestral');
  });
});
