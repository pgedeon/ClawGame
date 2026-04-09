import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '*.spec.ts',
    },
  ],
});
