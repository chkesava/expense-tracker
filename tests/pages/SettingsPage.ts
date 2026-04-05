import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async addCategoryBudget(category: string, amount: string) {
    await this.page.getByRole('combobox').nth(1).selectOption(category);
    await this.page.getByPlaceholder('Budget amount').fill(amount);
    await this.page.getByRole('button', { name: 'Add Category Budget' }).click();
    await this.waitForToast();
  }

  async addFinancialGoal(name: string, target: string) {
    await this.page.getByPlaceholder('Goal name').fill(name);
    await this.page.getByPlaceholder('Target amount').fill(target);
    await this.page.getByRole('button', { name: 'Add Goal' }).click();
    await this.waitForToast();
  }

  async addAutoCategorizationRule(keyword: string, category: string) {
    await this.page.getByPlaceholder('Keyword in note, e.g. "').fill(keyword);
    await this.page.getByRole('combobox').last().selectOption(category);
    await this.page.getByRole('button', { name: 'Add' }).first().click();
    await this.waitForToast();
  }

  async addAccount(name: string, type: string, balance: string) {
    await this.page.getByPlaceholder('Account name (e.g. HDFC Bank)').fill(name);
    await this.page.getByRole('combobox').first().selectOption(type);
    await this.page.getByPlaceholder('Initial balance').fill(balance);
    await this.page.getByRole('button', { name: 'Add Account' }).click();
    await this.waitForToast();
  }

  async addCategory(name: string, icon: string) {
    await this.page.getByPlaceholder('Category name (e.g. Shopping)').fill(name);
    await this.page.getByPlaceholder('Icon (emoji)').fill(icon);
    await this.page.getByRole('button', { name: 'Add Category' }).click();
    await this.waitForToast();
  }
}
