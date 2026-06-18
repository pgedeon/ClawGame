// Test setup — runs before any test modules are imported
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Set test directories BEFORE any service modules are imported
const TEST_DIR = mkdtempSync(join(tmpdir(), 'clawgame-api-test-'));
process.env.PROJECTS_DIR = TEST_DIR;
process.env.ASSETS_DIR = TEST_DIR;
process.env.EXPORTS_DIR = TEST_DIR;

// Clean up on exit
process.on('exit', () => {
  try {
    const { rmSync } = require('node:fs');
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
});
