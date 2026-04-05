import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ExpensePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async addExpense(amount: string, note: string, category?: string, account?: string) {
    await this.page.getByPlaceholder('0').fill(amount);
    await this.page.getByPlaceholder('What was this for?').fill(note);
    
    if (category) {
      await this.page.getByRole('combobox').first().selectOption(category);
    }
    
    if (account) {
      await this.page.getByRole('combobox').nth(1).selectOption(account);
    }

    await this.page.getByRole('button', { name: 'Add Expense' }).click();
  }

  async expectAutoCategorization(category: string, ruleKeyword: string) {
    await expect(this.page.getByRole('combobox').first()).toHaveValue(category);
    await expect(this.page.getByText(`Auto-categorized from rule: "${ruleKeyword}"`)).toBeVisible();
  }

  async expectExpenseInList(note: string) {
    await expect(this.page.getByText(note).first()).toBeVisible();
  }
}
