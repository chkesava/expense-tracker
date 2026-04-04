import { test, expect } from '@playwright/test';

test.describe('Expense Tracker Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('name@example.com').fill('sd5346548@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Kesava@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'This Month' })).toBeVisible({ timeout: 15000 });
  });

  test('should add a new expense', async ({ page }) => {
    // Navigate to Add page (Desktop Header behavior)
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByPlaceholder('0').fill('500');
    await page.getByPlaceholder('What was this for?').fill('Testing Automation');
    await page.getByRole('button', { name: 'Add Expense' }).click();

    await expect(page.getByText('Expense added')).toBeVisible();
    await expect(page.getByText('Testing Automation')).toBeVisible();
  });

  test('should manage settings (budgets, goals, rules)', async ({ page }) => {
    // Open settings via avatar menu
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();

    // 1. Category Budget
    await page.getByRole('combobox').nth(1).selectOption('Food');
    await page.getByPlaceholder('Budget amount').fill('2000');
    await page.getByRole('button', { name: 'Add Category Budget' }).click();
    await expect(page.locator('.Toastify__toast--success')).toBeVisible();

    // 2. Financial Goal
    const goalTitle = `Playwright Goal ${Date.now()}`;
    await page.getByPlaceholder('Goal name').fill(goalTitle);
    await page.getByPlaceholder('Target amount').fill('10000');
    await page.getByRole('button', { name: 'Add Goal' }).click();
    await expect(page.locator('.Toastify__toast--success')).toBeVisible();
    await expect(page.getByText(goalTitle)).toBeVisible();

    // 3. Auto-Categorization Rule
    const ruleKeyword = `keyword-${Date.now()}`;
    await page.getByPlaceholder('Keyword in note, e.g. "').fill(ruleKeyword);
    await page.getByRole('combobox').last().selectOption('Food');
    await page.getByRole('button', { name: 'Add' }).first().click();
    await expect(page.locator('.Toastify__toast--success')).toBeVisible();
    await expect(page.getByText(ruleKeyword)).toBeVisible();
  });

  test('should verify auto-categorization rule in action', async ({ page }) => {
    const ruleKeyword = `auto-${Date.now()}`;
    
    // Add rule
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByPlaceholder('Keyword in note, e.g. "').fill(ruleKeyword);
    await page.getByRole('combobox').last().selectOption('Travel');
    await page.getByRole('button', { name: 'Add' }).first().click();
    await expect(page.locator('.Toastify__toast--success')).toBeVisible();

    // Go to Add Expense
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByPlaceholder('What was this for?').fill(`Expense for ${ruleKeyword}`);
    
    // Check if category changed to Travel
    await expect(page.getByRole('combobox').first()).toHaveValue('Travel');
    await expect(page.getByText(`Auto-categorized from rule: "${ruleKeyword}"`)).toBeVisible();
  });
});
