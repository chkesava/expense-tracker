import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign up for free' }).click();
    await expect(page.getByRole('heading', { name: 'Get Started' })).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('should show forgot password mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Email' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('should login successfully with provided credentials', async ({ page }) => {
    await page.getByPlaceholder('name@example.com').fill('sd5346548@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Kesava@123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Since it's a real Firebase login, we wait for the navigation or the dashboard to appear
    // We expect the dashboard to be visible after login
    await expect(page.getByText('This Month')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.getByPlaceholder('name@example.com').fill('sd5346548@gmail.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Look for the toast error. React-toastify usually has a specific class or we can look for the text.
    await expect(page.locator('.Toastify__toast--error')).toBeVisible();
  });
});
