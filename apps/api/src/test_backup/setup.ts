import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Vitest setup: redirect PROJECTS_DIR to a temp directory.
 * Runs once per test file, so only create the dir if not already set.
 */
if (!process.env.PROJECTS_DIR || !process.env.PROJECTS_DIR.includes('clawgame-test-')) {
  process.env.PROJECTS_DIR = mkdtempSync(join(tmpdir(), 'clawgame-test-'));
}
