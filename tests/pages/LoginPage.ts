import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    await this.page.getByPlaceholder('name@example.com').fill(email);
    await this.page.getByPlaceholder('••••••••').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  async signup(name: string, email: string, password: string) {
    await this.page.getByRole('button', { name: 'Sign up for free' }).click();
    await this.page.getByPlaceholder('John Doe').fill(name);
    await this.page.getByPlaceholder('name@example.com').fill(email);
    await this.page.getByPlaceholder('••••••••').fill(password);
    await this.page.getByRole('button', { name: 'Create Account' }).click();
  }

  async resetPassword(email: string) {
    await this.page.getByRole('button', { name: 'Forgot?' }).click();
    await this.page.getByPlaceholder('name@example.com').fill(email);
    await this.page.getByRole('button', { name: 'Send Reset Email' }).click();
  }

  async loginWithGoogle() {
    await this.page.getByRole('button', { name: 'Google Account' }).click();
  }

  async switchToLogin() {
    await this.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }

  async expectHeading(text: string) {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }
}
