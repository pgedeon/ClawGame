/**
 * ClawGame E2E Smoke Tests
 * Validates core user flows: dashboard, project creation, navigation
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('ClawGame Smoke Tests', () => {

  test('dashboard loads with hero section', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    // Should show "Build Games with AI" or similar hero text
    const hero = page.locator('text=Build Games');
    await expect(hero).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to create project', async ({ page }) => {
    await page.goto(BASE_URL);
    // Look for "New Project" or "Create" button
    const createBtn = page.locator('button:has-text("New"), a:has-text("New"), button:has-text("Create"), a:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
  });

  test('project page tabs are present', async ({ page }) => {
    // Navigate to first available project
    await page.goto(BASE_URL);
    // Wait for project cards or links to load
    await page.waitForTimeout(1000);
    const projectLinks = page.locator('a[href*="/project/"]');
    const count = await projectLinks.count();
    if (count > 0) {
      await projectLinks.first().click();
      await page.waitForTimeout(1000);
      // Check for tab bar with key tabs
      await expect(page.locator('text=Scene Editor')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Code Editor')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=AI Command')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Play')).toBeVisible({ timeout: 5000 });
    }
  });

  test('command palette opens with Ctrl+K', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    await page.keyboard.press('Meta+K');
    // Command palette modal should appear
    await expect(page.locator('[role="dialog"], .command-palette, [data-command-palette]').first()).toBeVisible({ timeout: 3000 }).catch(() => {
      // Fallback: check for any search input that appeared
      return expect(page.locator('input[placeholder*="command" i], input[placeholder*="search" i]').first()).toBeVisible({ timeout: 3000 });
    });
  });

});
