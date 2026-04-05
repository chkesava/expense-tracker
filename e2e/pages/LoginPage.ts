import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import logger from '../utils/logger';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByPlaceholder('name@example.com');
    this.passwordInput = page.getByPlaceholder('••••••••');
    this.submitButton = page.getByRole('button', { name: /Sign In|Create Account|Send Reset Email/i });
    this.forgotPasswordLink = page.getByRole('button', { name: 'Forgot?' });
    this.signupLink = page.getByRole('button', { name: 'Sign up for free' });
  }

  /**
   * Performs login action.
   */
  async login(email: string, password: string) {
    logger.info(`Performing login for email: ${email}`);
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
    return this;
  }

  /**
   * Gets the authentication error message text from toast.
   */
  async getErrorMessage(): Promise<string> {
    const toast = this.page.locator('.Toastify__toast--error');
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    return await toast.innerText();
  }

  /**
   * Checks if login form elements are visible with a short wait.
   */
  async isLoginFormVisible(): Promise<boolean> {
    try {
      await this.emailInput.waitFor({ state: 'visible', timeout: 5000 });
      logger.info('Login form is visible');
      return true;
    } catch (e) {
      logger.info('Login form is NOT visible after timeout');
      return false;
    }
  }

  /**
   * Navigates to forgot password mode.
   */
  async clickForgotPassword() {
    logger.info('Clicking forgot password link');
    await this.click(this.forgotPasswordLink);
    return this;
  }

  /**
   * Switches to signup mode.
   */
  async clickSignup() {
    logger.info('Switching to signup mode');
    await this.click(this.signupLink);
    return this;
  }
}
