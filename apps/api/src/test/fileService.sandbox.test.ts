import { describe, it, expect } from 'vitest';
import { getFileTree, readFileContent, writeFileContent, deleteFile, createDirectory } from '../services/fileService';

describe('fileService sandbox validation', () => {
  it('should reject path traversal with ..', async () => {
    await expect(readFileContent('test-project', '../../../etc/passwd')).rejects.toThrow('Path traversal');
  });

  it('should reject path traversal in getFileTree', async () => {
    await expect(getFileTree('test-project', '../../')).rejects.toThrow('Path traversal');
  });

  it('should reject path traversal in writeFileContent', async () => {
    await expect(writeFileContent('test-project', '../../../tmp/evil.txt', 'hack')).rejects.toThrow('Path traversal');
  });

  it('should reject path traversal in deleteFile', async () => {
    await expect(deleteFile('test-project', '../../../tmp/evil.txt')).rejects.toThrow('Path traversal');
  });

  it('should reject path traversal in createDirectory', async () => {
    await expect(createDirectory('test-project', '../../../tmp/evil')).rejects.toThrow('Path traversal');
  });

  it('should allow legitimate nested paths', async () => {
    // This should NOT throw — just may fail because project doesn't exist
    try {
      await readFileContent('nonexistent-project', 'src/main.ts');
    } catch (e: any) {
      // Should be ENOENT, not path traversal
      expect(e.message).not.toContain('Path traversal');
    }
  });
});
