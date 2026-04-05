import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import logger from '../utils/logger';

export class DashboardPage extends BasePage {
  readonly thisMonthSection: Locator;
  readonly avatarButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.thisMonthSection = page.getByText('This Month', { exact: true });
    this.avatarButton = page.getByRole('button', { name: 'User menu' });
    this.logoutButton = page.getByRole('button', { name: 'Sign Out' });
  }

  /**
   * Gets the total expense for the month.
   */
  async getThisMonthTotal(): Promise<string> {
    await this.thisMonthSection.waitFor({ state: 'visible' });
    return await this.page.locator('.text-4xl.font-extrabold').innerText();
  }

  /**
   * Navigates to a specific dashboard section.
   */
  async navigateToSection(section: string) {
    logger.info(`Navigating to dashboard section: ${section}`);
    // Support both desktop (nav button) and mobile (NavLink)
    const link = this.page.getByRole('button', { name: section, exact: false }).or(this.page.getByRole('link', { name: section, exact: false }));
    await link.first().click();
    return this;
  }

  /**
   * Verifies if dashboard is fully loaded.
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.thisMonthSection.waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Performs logout action.
   */
  async logout() {
    logger.info('Performing logout');
    await this.avatarButton.waitFor({ state: 'visible' });
    await this.click(this.avatarButton);
    await this.logoutButton.waitFor({ state: 'visible' });
    await this.click(this.logoutButton);
    return this;
  }
}
