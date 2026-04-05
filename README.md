# End‑to‑End (E2E) Test Suite

## Prerequisites
- **Node.js** (v14+) and **npm** installed.
- Install project dependencies:
  ```bash
  npm install
  ```
- Install Playwright browsers (if not already installed):
  ```bash
  npx playwright install
  ```

## Environment Configuration
The suite uses environment-specific `.env` files located in the root directory:
- `.env.dev`: Local development settings.
- `.env.staging`: Staging environment settings.
- `.env.production`: Production environment settings.

These files contain:
- `E2E_BASE_URL`: Browser entry point.
- `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`: Credentials.
- `VITE_FIREBASE_*`: Firebase configuration for the application.

## Running the tests
The project uses `cross-env` for platform-independent environment variable injection.

| Script | Description |
|--------|-------------|
| `npm run test:e2e` | Run tests using default `.env` settings. |
| `npm run test:e2e:dev` | Run tests using `.env.dev`. |
| `npm run test:e2e:staging` | Run tests using `.env.staging`. |
| `npm run test:e2e:smoke` | Run tests tagged with `@smoke`. |
| `npm run test:e2e:ui` | Open Playwright UI mode. |

### Running Specific Tests
To run a specific test file or case:
```bash
npx playwright test e2e/tests/auth/login.spec.ts
npx playwright test -g "valid login"
```

## GitHub Actions CI/CD
A workflow is configured in `.github/workflows/playwright.yml` to run E2E tests on every push to the `main` branch.

### Required GitHub Secrets
To ensure the pipeline passes, add following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. (from your `.env`)
- `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`
- `E2E_BASE_URL_DEV`, `E2E_BASE_URL_STAGING`, `E2E_BASE_URL_PRODUCTION`

---
*All tests are environment-driven; ensure your `.env` files are up to date!*
