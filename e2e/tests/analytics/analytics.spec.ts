import { test, expect } from '../../fixtures';
import { NavBar } from '../../components/NavBar';

/**
 * UI tests for the Analytics page.
 */
test.describe('Analytics Page UI', () => {
  test('should display analytics after navigation', async ({ page, authenticatedPage }) => {
    const nav = new NavBar(page);
    await nav.clickNavLink('Analytics');
    // Verify URL contains /analytics
    await expect(page).toHaveURL(/.*\/analytics/);
    // Verify the page heading is visible
    await expect(page.getByRole('heading', { name: /analytics/i, exact: false })).toBeVisible();
    // Verify a chart element is present (adjust selector as needed)
    await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
  });
});
