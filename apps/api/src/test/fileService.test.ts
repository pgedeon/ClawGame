/**
 * FileService tests
 * Tests file operations against a temp directory.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getFileTree, readFileContent, writeFileContent, deleteFile, createDirectory, searchFiles } from '../services/fileService';

const PROJECTS_DIR = process.env.PROJECTS_DIR!;

describe('FileService', () => {
  const projectId = 'test-project';

  beforeAll(async () => {
    // Create test project structure
    await mkdir(join(PROJECTS_DIR, projectId, 'scenes'), { recursive: true });
    await mkdir(join(PROJECTS_DIR, projectId, 'src'), { recursive: true });
    await writeFile(join(PROJECTS_DIR, projectId, 'scenes', 'main.scene.json'), '{"entities":[]}');
    await writeFile(join(PROJECTS_DIR, projectId, 'src', 'player.ts'), 'export class Player {}');
    await writeFile(join(PROJECTS_DIR, projectId, 'package.json'), '{"name":"test"}');
    await writeFile(join(PROJECTS_DIR, projectId, 'README.md'), '# Test Project');
  });

  describe('getFileTree', () => {
    it('returns file tree with correct structure', async () => {
      const tree = await getFileTree(projectId);
      expect(tree).toBeInstanceOf(Array);
      expect(tree.length).toBeGreaterThan(0);

      const packageJson = tree.find(n => n.name === 'package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson!.type).toBe('file');
      expect(packageJson!.extension).toBe('.json');
    });

    it('includes directories with children', async () => {
      const tree = await getFileTree(projectId);
      const scenesDir = tree.find(n => n.name === 'scenes');
      expect(scenesDir).toBeDefined();
      expect(scenesDir!.type).toBe('directory');
      expect(scenesDir!.children).toBeDefined();
      expect(scenesDir!.children!.length).toBe(1);
    });

    it('ignores node_modules and .git', async () => {
      await mkdir(join(PROJECTS_DIR, projectId, 'node_modules'), { recursive: true });
      await writeFile(join(PROJECTS_DIR, projectId, 'node_modules', 'pkg.json'), '{}');

      const tree = await getFileTree(projectId);
      expect(tree.find(n => n.name === 'node_modules')).toBeUndefined();
    });
  });

  describe('readFileContent', () => {
    it('reads text file content', async () => {
      const content = await readFileContent(projectId, 'package.json');
      expect(content.path).toBe('package.json');
      expect(content.content).toBe('{"name":"test"}');
      expect(content.encoding).toBe('utf-8');
    });

    it('throws for non-existent file', async () => {
      await expect(readFileContent(projectId, 'nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('writeFileContent', () => {
    it('creates new file', async () => {
      const result = await writeFileContent(projectId, 'new-file.txt', 'hello world');
      expect(result.created).toBe(true);
      expect(result.size).toBe(11);

      const content = await readFileContent(projectId, 'new-file.txt');
      expect(content.content).toBe('hello world');
    });

    it('updates existing file', async () => {
      await writeFileContent(projectId, 'update-me.txt', 'v1');
      const result = await writeFileContent(projectId, 'update-me.txt', 'v2');
      expect(result.created).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('deletes existing file', async () => {
      await writeFileContent(projectId, 'to-delete.txt', 'bye');
      const result = await deleteFile(projectId, 'to-delete.txt');
      expect(result).toBe(true);
      await expect(readFileContent(projectId, 'to-delete.txt')).rejects.toThrow();
    });
  });

  describe('createDirectory', () => {
    it('creates nested directories', async () => {
      const result = await createDirectory(projectId, 'nested/deep/dir');
      expect(result).toBe(true);
    });
  });

  describe('searchFiles', () => {
    it('finds files matching query', async () => {
      const results = await searchFiles(projectId, 'player');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes('player'))).toBe(true);
    });

    it('returns empty for no matches', async () => {
      const results = await searchFiles(projectId, 'nonexistent-file-xyz');
      expect(results).toEqual([]);
    });
  });
});

describe('Path traversal protection', () => {
  it('rejects paths escaping project directory', async () => {
    await expect(readFileContent('test-project', '../../../etc/passwd')).rejects.toThrow();
  });

  it('rejects write paths escaping project directory', async () => {
    await expect(writeFileContent('test-project', '../../evil.txt', 'hack')).rejects.toThrow();
  });
});
