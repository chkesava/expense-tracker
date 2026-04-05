import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test('should show login page by default', async () => {
    await loginPage.expectHeading('Welcome Back');
    await expect(loginPage.page.getByPlaceholder('name@example.com')).toBeVisible();
  });

  test('should toggle between login and signup', async () => {
    await loginPage.page.getByRole('button', { name: 'Sign up for free' }).click();
    await loginPage.expectHeading('Get Started');
    await expect(loginPage.page.getByPlaceholder('John Doe')).toBeVisible();

    await loginPage.switchToLogin();
    await loginPage.expectHeading('Welcome Back');
  });

  test('should show forgot password mode', async () => {
    await loginPage.page.getByRole('button', { name: 'Forgot?' }).click();
    await loginPage.expectHeading('Reset Password');
    await loginPage.takeScreenshot('forgot-password-screen');
    await expect(loginPage.page.getByRole('button', { name: 'Send Reset Email' })).toBeVisible();

    await loginPage.switchToLogin();
    await loginPage.expectHeading('Welcome Back');
  });

  test('should login successfully with provided credentials', async () => {
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
    await dashboardPage.expectBalanceVisible();
    await dashboardPage.takeScreenshot('logged-in-dashboard');
  });

  test('should show error for incorrect password', async () => {
    await loginPage.login('sd5346548@gmail.com', 'wrongpassword');
    await loginPage.waitForErrorToast();
  });

  test('should logout successfully', async () => {
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
    await dashboardPage.expectBalanceVisible();
    await dashboardPage.logout();
    await loginPage.expectHeading('Welcome Back');
  });
});
