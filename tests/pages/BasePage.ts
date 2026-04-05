import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(public page: Page) {}

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async waitForToast(message?: string) {
    const toast = this.page.locator('.Toastify__toast--success');
    await expect(toast).toBeVisible();
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  async waitForErrorToast(message?: string) {
    const toast = this.page.locator('.Toastify__toast--error');
    await expect(toast).toBeVisible();
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  async toggleTheme() {
    await this.page.getByLabel(/Switch to (dark|light) mode/).click();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}-${Date.now()}.png`, fullPage: true });
  }
}
