import { Page, Locator } from '@playwright/test';
import logger from './logger';

/**
 * Retries a flaky asynchronous action.
 * @param fn The async function to retry.
 * @param retries Number of retries (default: 3).
 * @param delay Delay between retries in ms (default: 1000).
 */
export async function retryAction<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Action failed, retrying (${i + 1}/${retries})...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Waits for network to be idle.
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    logger.warn('Network idle timed out, proceeding anyway.');
  }
}

/**
 * Scrolls an element into view.
 */
export async function scrollIntoView(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
}

/**
 * Handles file downloads and returns the file path.
 */
export async function downloadFile(page: Page, triggerLocator: Locator): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await triggerLocator.click();
  const download = await downloadPromise;
  const filePath = path.join(process.cwd(), 'e2e/test-results', download.suggestedFilename());
  await download.saveAs(filePath);
  return filePath;
}
import path from 'path';

/**
 * Mocks an API response.
 */
export async function mockAPIResponse(page: Page, urlPattern: string | RegExp, responseBody: any, status = 200) {
  await page.route(urlPattern, async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });
}

/**
 * Generates a formatted timestamp for unique naming.
 */
export function generateTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
