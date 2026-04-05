import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectBalanceVisible() {
    await expect(this.page.getByRole('heading', { name: 'This Month' })).toBeVisible();
  }

  async logout() {
    await this.page.getByLabel('User menu').click();
    await this.page.getByRole('button', { name: 'Sign Out' }).click();
  }

  async navigateToSettings() {
    await this.page.getByLabel('User menu').click();
    await this.page.getByRole('button', { name: 'Settings' }).click();
  }

  async navigateToAddExpense() {
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }
}
