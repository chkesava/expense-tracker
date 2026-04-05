import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AnalyticsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectChartsVisible() {
    await expect(this.page.getByText('Expense Trend')).toBeVisible();
    await expect(this.page.getByText('Spending by Category')).toBeVisible();
  }

  async exportReport() {
    // Assuming there's an export button in Analytics
    const exportBtn = this.page.getByRole('button', { name: 'Export' });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  }
}
