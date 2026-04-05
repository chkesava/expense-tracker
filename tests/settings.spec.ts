import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Settings Management', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    settingsPage = new SettingsPage(page);

    await loginPage.goto();
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
    await dashboardPage.navigateToSettings();
  });

  test('should manage accounts', async () => {
    const accName = `Test Acc ${Date.now()}`;
    await settingsPage.addAccount(accName, 'Bank', '1000');
    await settingsPage.takeScreenshot('account-added');
    await expect(settingsPage.page.getByText(accName)).toBeVisible();
  });

  test('should manage custom categories', async () => {
    const catName = `Test Cat ${Date.now()}`;
    await settingsPage.addCategory(catName, '🧪');
    await settingsPage.takeScreenshot('category-added');
    await expect(settingsPage.page.getByText(catName)).toBeVisible();
  });

  test('should manage budgets and goals', async () => {
    const goalName = `Test Goal ${Date.now()}`;
    await settingsPage.addCategoryBudget('Food', '1500');
    await settingsPage.addFinancialGoal(goalName, '5000');
    await settingsPage.takeScreenshot('goal-added');
    await expect(settingsPage.page.getByText(goalName)).toBeVisible();
  });

  test('should manage auto-categorization rules', async () => {
    const keyword = `rule-${Date.now()}`;
    await settingsPage.addAutoCategorizationRule(keyword, 'Travel');
    await settingsPage.takeScreenshot('rule-added');
    await expect(settingsPage.page.getByText(keyword)).toBeVisible();
  });
});
