import { test as base, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { testDataFactory } from '../utils/testDataFactory';
import { UserData } from '../types';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface TestFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: {
    page: any;
    loginPage: LoginPage;
    dashboardPage: DashboardPage;
  };
  testUser: UserData;
}

/**
 * Extend base test with custom fixtures.
 */
export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }: { page: any }, use: (r: LoginPage) => Promise<void>) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }: { page: any }, use: (r: DashboardPage) => Promise<void>) => {
    await use(new DashboardPage(page));
  },
  testUser: async ({}, use: (r: UserData) => Promise<void>) => {
    const user = testDataFactory.generateUser();
    await use(user);
  },
  authenticatedPage: async ({ page, loginPage, dashboardPage }: { page: any, loginPage: LoginPage, dashboardPage: DashboardPage }, use: (r: { page: any, loginPage: LoginPage, dashboardPage: DashboardPage }) => Promise<void>) => {
    // Perform login before each test that uses this fixture
    const email = process.env.E2E_TEST_USER_EMAIL;
    const password = process.env.E2E_TEST_USER_PASSWORD;
    
    if (!email || !password) {
      throw new Error('E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set in environment');
    }
    
    await loginPage.navigate('/');
    // Check if already logged in (no login form)
    if (await loginPage.isLoginFormVisible()) {
      await loginPage.login(email, password);
    }
    
    await expect(page).toHaveURL(/.*dashboard/);
    await dashboardPage.isLoaded();
    
    await use({ page, loginPage, dashboardPage });
  },
});

export { expect };

/**
 * Custom API Context with base URL and auth headers.
 */
export const apiContextFixture = async ({ playwright }: { playwright: any }, use: (r: APIRequestContext) => Promise<void>) => {
  const apiContext = await playwright.request.newContext({
    baseURL: process.env.E2E_API_URL || 'http://localhost:3000',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.E2E_API_TOKEN || 'test-token'}`,
      'Content-Type': 'application/json',
    },
  });
  await use(apiContext);
  await apiContext.dispose();
};
