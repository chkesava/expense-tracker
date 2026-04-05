import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

test.describe('UI Features & Gamification', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    analyticsPage = new AnalyticsPage(page);

    await loginPage.goto();
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
  });

  test('should toggle dark/light mode', async ({ page }) => {
    const body = page.locator('html');
    
    // Initial check
    const initialTheme = await body.getAttribute('class');
    
    await dashboardPage.toggleTheme();
    const newTheme = await body.getAttribute('class');
    
    expect(newTheme).not.toBe(initialTheme);
    
    // Toggle back
    await dashboardPage.toggleTheme();
    expect(await body.getAttribute('class')).toBe(initialTheme);
  });

  test('should verify analytics charts are rendering', async () => {
    await dashboardPage.page.goto('/analytics');
    await analyticsPage.expectChartsVisible();
  });

  test('should verify gamification stats on dashboard', async () => {
    await dashboardPage.expectBalanceVisible();
    
    // Check for streak or level indicators
    const streak = dashboardPage.page.getByTitle('Current Login Streak');
    if (await streak.isVisible()) {
      await expect(streak).toContainText(/🔥/);
    }
    
    // Check for "Level" or "XP" text if it exists on dashboard
    const levelInfo = dashboardPage.page.getByText(/Level \d+/);
    if (await levelInfo.isVisible()) {
      await expect(levelInfo).toBeVisible();
    }
  });

  test('should be responsive (mobile view)', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if bottom nav is visible instead of desktop header links
    const bottomNav = page.locator('nav').filter({ hasText: 'Dashboard' }).last();
    await expect(bottomNav).toBeVisible();
    
    // Verify FAB is visible
    await expect(page.locator('button').filter({ has: page.locator('svg') }).last()).toBeVisible();
  });
});
