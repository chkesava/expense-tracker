import { test, expect } from '../../fixtures';
import { NavBar } from '../../components/NavBar';

/**
 * UI tests for the Settings page.
 */
test.describe('Settings Page UI', () => {
  test('should display settings after navigation', async ({ page, authenticatedPage }) => {
    const nav = new NavBar(page);
    await nav.clickNavLink('Settings');
    // Verify URL contains /settings
    await expect(page).toHaveURL(/.*\/settings/);
    // Verify the page heading is visible
    await expect(page.getByRole('heading', { name: /settings/i, exact: false })).toBeVisible();
    // Verify a known element on settings page, e.g., export button
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });
});
