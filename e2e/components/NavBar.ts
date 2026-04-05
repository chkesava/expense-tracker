import { Page, Locator } from '@playwright/test';
import logger from '../utils/logger';

export class NavBar {
  readonly navLinks: Locator;
  readonly mobileMenuButton: Locator;
  readonly mobileMenu: Locator;

  constructor(private page: Page) {
    this.navLinks = this.page.getByTestId('nav-link');
    this.mobileMenuButton = this.page.getByTestId('mobile-menu-button');
    this.mobileMenu = this.page.getByTestId('mobile-menu');
  }

  /**
   * Returns a list of all navigation links.
   */
  async getNavLinks(): Promise<string[]> {
    return await this.navLinks.allInnerTexts();
  }

  /**
   * Clicks on a navigation link by its label.
   */
  async clickNavLink(label: string) {
    logger.info(`Clicking navigation link: ${label}`);
    await this.page.getByRole('link', { name: label }).click();
  }

  /**
   * Checks if a navigation link is active.
   */
  async isActive(label: string): Promise<boolean> {
    const link = this.page.getByRole('link', { name: label });
    const classAttr = await link.getAttribute('class');
    return classAttr?.includes('active') || false;
  }

  /**
   * Gets the mobile menu button locator.
   */
  getMobileMenuButton(): Locator {
    return this.mobileMenuButton;
  }

  /**
   * Opens the mobile menu.
   */
  async openMobileMenu() {
    logger.info('Opening mobile menu');
    if (await this.mobileMenuButton.isVisible()) {
      await this.mobileMenuButton.click();
    }
  }
}
