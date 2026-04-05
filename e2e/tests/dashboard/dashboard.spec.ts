import { test, expect } from '../../fixtures';

test.describe('Dashboard Tests (@regression)', () => {
  test('dashboard should load correctly for authenticated user', async ({ authenticatedPage }) => {
    const { dashboardPage } = authenticatedPage;
    await expect(dashboardPage.thisMonthSection).toBeVisible();
    const total = await dashboardPage.getThisMonthTotal();
    expect(total).toContain('₹');
  });

  test('user should be able to navigate to Analytics section', async ({ authenticatedPage, page }) => {
    const { dashboardPage } = authenticatedPage;
    await dashboardPage.navigateToSection('Analytics');
    await expect(page).toHaveURL(/.*analytics/);
  });

  test('user should be able to navigate to Expenses section', async ({ authenticatedPage, page }) => {
    const { dashboardPage } = authenticatedPage;
    await dashboardPage.navigateToSection('Expenses');
    await expect(page).toHaveURL(/.*expenses/);
  });

  test('user should be able to open user menu and see profile info', async ({ authenticatedPage, page }) => {
    const { dashboardPage } = authenticatedPage;
    await dashboardPage.click(dashboardPage.avatarButton);
    await expect(page.getByText('sd5346548@gmail.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('user should be able to logout', async ({ authenticatedPage, page }) => {
    const { dashboardPage } = authenticatedPage;
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/$/); // Back to root/login
  });
});
