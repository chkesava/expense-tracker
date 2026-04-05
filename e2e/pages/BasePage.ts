import { Page, Locator, expect } from '@playwright/test';
import logger from '../utils/logger';

/**
 * Abstract BasePage class sharing common actions and utilities across all Page Objects.
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigates to a specific path relative to the baseURL.
   * @param path The relative path to navigate to.
   */
  async navigate(path: string) {
    logger.info(`Navigating to: ${path}`);
    await this.page.goto(path);
    return this;
  }

  /**
   * Waits for the page to reach 'load' state.
   */
  async waitForPageLoad() {
    logger.info('Waiting for page load state');
    await this.page.waitForLoadState('load');
    return this;
  }

  /**
   * Takes a screenshot and attaches it to the report.
   * @param name Name of the screenshot.
   */
  async takeScreenshot(name: string) {
    logger.info(`Taking screenshot: ${name}`);
    await this.page.screenshot({ path: `e2e/test-results/screenshots/${name}.png` });
    return this;
  }

  /**
   * Gets the current page title.
   */
  async getTitle(): Promise<string> {
    const title = await this.page.title();
    logger.info(`Page title: ${title}`);
    return title;
  }

  /**
   * Clicks on an element identified by a locator.
   */
  async click(locator: Locator) {
    logger.info('Clicking on element');
    await locator.click();
    return this;
  }

  /**
   * Fills an input field with a value.
   */
  async fill(locator: Locator, value: string) {
    logger.info(`Filling element with value: ${value}`);
    await locator.fill(value);
    return this;
  }

  /**
   * Waits for an element to be visible.
   */
  async waitForElement(locator: Locator, timeout = 10000) {
    logger.info('Waiting for element to be visible');
    await locator.waitFor({ state: 'visible', timeout });
    return this;
  }

  /**
   * Checks if an element is visible.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    const visible = await locator.isVisible();
    logger.info(`Element visibility: ${visible}`);
    return visible;
  }

  /**
   * Selects an option from a dropdown.
   */
  async selectOption(locator: Locator, value: string) {
    logger.info(`Selecting option: ${value}`);
    await locator.selectOption(value);
    return this;
  }

  /**
   * Gets an attribute value from an element.
   */
  async getAttribute(locator: Locator, attr: string): Promise<string | null> {
    const value = await locator.getAttribute(attr);
    logger.info(`Attribute ${attr} value: ${value}`);
    return value;
  }

  /**
   * Helper to get element by data-testid.
   */
  protected getByTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }
}
