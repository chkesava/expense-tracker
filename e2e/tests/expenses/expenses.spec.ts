import { test, expect } from '../../fixtures';
import { NavBar } from '../../components/NavBar';

/**
 * UI tests for the Expenses page.
 */
test.describe('Expenses Page UI', () => {
  test('should display expenses list after navigation', async ({ page, authenticatedPage }) => {
    const nav = new NavBar(page);
    await nav.clickNavLink('Expenses');
    // Verify URL contains /expenses
    await expect(page).toHaveURL(/.*\/expenses/);
    // Verify the page heading is visible
    await expect(page.getByRole('heading', { name: /expenses/i, exact: false })).toBeVisible();
    // Verify at least one expense row is present (table or list)
    const expenseRows = page.locator('[data-testid="expense-row"]');
    await expect(expenseRows.first()).toBeVisible();
  });
});
