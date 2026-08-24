/**
 * Dedicated config for the exported-HTML smoke spec (e2e/export-smoke.spec.ts).
 *
 * The spec is self-contained: it talks to the ClawGame API directly via fetch
 * (E2E_API_URL, default http://localhost:3000) and serves exported artifacts
 * from its own localhost static server — no vite/api webServer entries needed.
 * Kept separate from the root playwright.config.ts so its webServer probes
 * (which assume a free port 3000) don't affect this spec on dev boxes where
 * port 3000 is occupied by unrelated services.
 *
 * Run: E2E_API_URL=http://localhost:3300 pnpm exec playwright test --config e2e/export-smoke.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /export-smoke\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    headless: true,
    ...devices['Desktop Chrome'],
  },
});
