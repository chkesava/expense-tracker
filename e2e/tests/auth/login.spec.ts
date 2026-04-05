import { test, expect } from '../../fixtures';

test.describe('Authentication Tests (@smoke)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate('/');
  });

  test('user should be able to login with valid credentials', async ({ loginPage, page }) => {
    // These credentials should be set in .env for security
    const email = process.env.E2E_TEST_USER_EMAIL;
    const password = process.env.E2E_TEST_USER_PASSWORD;
    
    if (!email || !password) {
      throw new Error('E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set in environment');
    }
    
    await loginPage.login(email, password);
    // Successful login shows a toast message "Welcome back!"
    await expect(page.getByText('Welcome back!')).toBeVisible();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('user should see error message with invalid password', async ({ loginPage, page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL || 'sd5346548@gmail.com';
    await loginPage.login(email, 'WrongPassword123!');
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
  });

  test('user should be able to toggle to signup mode', async ({ loginPage, page }) => {
    await loginPage.clickSignup();
    await expect(page.getByText('Get Started')).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
  });

  test('user should be able to navigate to forgot password mode', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
  });
});
