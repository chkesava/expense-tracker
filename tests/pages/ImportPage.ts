import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import * as path from 'path';

export class ImportPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async uploadCSV(filePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByText('Click to upload or drag').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  async expectImportPreview() {
    await expect(this.page.getByText('Preview Records')).toBeVisible();
  }

  async confirmImport() {
    await this.page.getByRole('button', { name: 'Import All' }).click();
    await this.waitForToast('imported');
  }
}
