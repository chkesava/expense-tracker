import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Automation & Import', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let importPage: ImportPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    importPage = new ImportPage(page);

    await loginPage.goto();
    await loginPage.login('sd5346548@gmail.com', 'Kesava@123');
  });

  test('should import expenses from CSV', async () => {
    // Create a temporary sample CSV
    const csvPath = path.join(__dirname, 'sample_import.csv');
    const csvContent = 'Date,Description,Amount,Category,Account\n2024-04-01,Netflix,15.99,Entertainment,Credit Card\n2024-04-02,Starbucks,5.50,Food,Cash';
    fs.writeFileSync(csvPath, csvContent);

    await dashboardPage.page.goto('/import');
    await importPage.uploadCSV(csvPath);
    await importPage.expectImportPreview();
    await importPage.confirmImport();

    // Verify one of the records in the main list
    await dashboardPage.page.goto('/expenses');
    await expect(dashboardPage.page.getByText('Netflix')).toBeVisible();

    // Cleanup
    fs.unlinkSync(csvPath);
  });
});
