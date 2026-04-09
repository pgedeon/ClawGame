import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss onboarding tour if it appears
    await page.goto('/');

    try {
      const closeTour = page.locator('.onboarding-close').first();
      const overlay = page.locator('.onboarding-overlay').first();

      // Check if tour exists and is visible
      const tourExists = await overlay.count() > 0;
      if (tourExists) {
        await closeTour.click();
        // Wait for overlay to disappear
        await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    } catch (e) {
      // Tour might not exist or already dismissed
    }
  });

  test('dashboard loads and shows projects', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/ClawGame/i);

    // Check that the dashboard hero section is visible
    await expect(page.getByText('Build Games with AI')).toBeVisible();

    // Check that the projects section exists
    const projectsSection = page.getByText('Your Projects');
    await expect(projectsSection).toBeVisible();
  });

  test('can create a new project', async ({ page }) => {
    await page.goto('/');

    // Dismiss onboarding first
    try {
      const closeTour = page.locator('.onboarding-close').first();
      const overlay = page.locator('.onboarding-overlay').first();
      if (await overlay.count() > 0) {
        await closeTour.click();
        await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    } catch (e) {}

    // Click the "New Project" link in hero section
    const newProjectLink = page.getByRole('link', { name: /new project/i }).first();
    await newProjectLink.click();

    // Should navigate to create-project page
    await page.waitForURL(/\/create-project/i, { timeout: 5000 });

    // Verify we're on the create project page
    await expect(page.getByText(/Create New Project/i)).toBeVisible();
  });

  test('can navigate to a project and see the project page', async ({ page }) => {
    await page.goto('/');

    // Dismiss onboarding first
    try {
      const closeTour = page.locator('.onboarding-close').first();
      const overlay = page.locator('.onboarding-overlay').first();
      if (await overlay.count() > 0) {
        await closeTour.click();
        await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    } catch (e) {}

    // Navigate to the first project card (if any exist)
    const projectCard = page.locator('.project-card').first();
    const cardExists = await projectCard.count() > 0;

    if (cardExists) {
      await projectCard.click();

      // Verify we're on a project page (any project URL is fine)
      await page.waitForURL(/\/project\/[a-z0-9-]+/i, { timeout: 5000 });

      // Verify the URL changed to a project page
      expect(page.url()).toMatch(/\/project\/[a-z0-9-]+/i);
    } else {
      // If no projects exist, skip this test
      test.skip();
    }
  });
});
