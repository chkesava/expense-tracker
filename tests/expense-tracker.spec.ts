import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensePage } from './pages/ExpensePage';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Expense Tracker Features', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let expensePage: ExpensePage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    expensePage = new ExpensePage(page);
    settingsPage = new SettingsPage(page);

    await loginPage.goto();
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
    await dashboardPage.expectBalanceVisible();
  });

  test('should add a new expense', async () => {
    const uniqueNote = `Playwright Expense ${Date.now()}`;
    await dashboardPage.navigateToAddExpense();
    await expensePage.addExpense('500', uniqueNote, 'Food');
    await expensePage.waitForToast('Expense added');
    await expensePage.takeScreenshot('expense-added');
    await expensePage.expectExpenseInList(uniqueNote);
  });

  test('should manage settings (budgets, goals, rules)', async () => {
    await dashboardPage.navigateToSettings();

    // 1. Category Budget
    await settingsPage.addCategoryBudget('Food', '2000');

    // 2. Financial Goal
    const goalTitle = `Goal ${Date.now()}`;
    await settingsPage.addFinancialGoal(goalTitle, '10000');
    await expect(settingsPage.page.getByText(goalTitle)).toBeVisible();

    // 3. Auto-Categorization Rule
    const ruleKeyword = `keyword-${Date.now()}`;
    await settingsPage.addAutoCategorizationRule(ruleKeyword, 'Food');
    await settingsPage.takeScreenshot('settings-with-rules');
    await expect(settingsPage.page.getByText(ruleKeyword)).toBeVisible();
  });

  test('should verify auto-categorization rule in action', async () => {
    const ruleKeyword = `auto-${Date.now()}`;
    
    // Add rule
    await dashboardPage.navigateToSettings();
    await settingsPage.addAutoCategorizationRule(ruleKeyword, 'Travel');

    // Go to Add Expense
    await dashboardPage.navigateToAddExpense();
    await expensePage.page.getByPlaceholder('What was this for?').fill(`Business ${ruleKeyword}`);
    
    // Check if category changed to Travel automatically
    await expensePage.expectAutoCategorization('Travel', ruleKeyword);
  });
});
