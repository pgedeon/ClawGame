import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Vitest globalSetup — runs in a separate worker process BEFORE any test files.
 * Creates a temp dir and writes its path to a well-known file so setup.ts can read it.
 */
export default function () {
  const tempDir = join(tmpdir(), 'clawgame-test-data');
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(join(tempDir, '.testdir'), tempDir);
}
