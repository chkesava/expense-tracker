import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensePage } from './pages/ExpensePage';

test.describe('Expense Management', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let expensePage: ExpensePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    expensePage = new ExpensePage(page);

    await loginPage.goto();
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
  });

  test('should search for an expense', async () => {
    const uniqueNote = `SearchTest ${Date.now()}`;
    await dashboardPage.navigateToAddExpense();
    await expensePage.addExpense('123', uniqueNote, 'Travel');
    
    // Go to Expenses list
    await dashboardPage.page.goto('/expenses');
    await dashboardPage.page.getByPlaceholder('Search expenses...').fill(uniqueNote);
    await dashboardPage.takeScreenshot('search-executed');
    await expect(dashboardPage.page.getByText(uniqueNote)).toBeVisible();
  });

  test('should edit an expense', async () => {
    const note = `ToEdit ${Date.now()}`;
    const newNote = `Edited ${Date.now()}`;
    
    await dashboardPage.navigateToAddExpense();
    await expensePage.addExpense('100', note);
    
    await dashboardPage.page.goto('/expenses');
    await dashboardPage.page.getByText(note).click();
    await dashboardPage.page.getByRole('button', { name: 'Edit' }).click();
    
    await dashboardPage.page.getByPlaceholder('What was this for?').fill(newNote);
    await dashboardPage.page.getByRole('button', { name: 'Update Expense' }).click();
    
    await expensePage.waitForToast('updated');
    await expect(dashboardPage.page.getByText(newNote)).toBeVisible();
  });

  test('should delete an expense', async () => {
    const note = `ToDelete ${Date.now()}`;
    await dashboardPage.navigateToAddExpense();
    await expensePage.addExpense('99', note);
    
    await dashboardPage.page.goto('/expenses');
    await dashboardPage.page.getByText(note).click();
    
    // Set up dialog listener
    dashboardPage.page.once('dialog', dialog => dialog.accept());
    await dashboardPage.page.getByRole('button', { name: 'Delete' }).click();
    
    await expensePage.waitForToast('deleted');
    await expect(dashboardPage.page.getByText(note)).not.toBeVisible();
  });
});
