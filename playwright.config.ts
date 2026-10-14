import { defineConfig, devices } from '@playwright/test'

// End-to-end tests, run LOCALLY. There is no CI job for them, deliberately:
// the catalogue's `node-validate` fixes its image to `node:<version>-<layer>`,
// which carries no browser, and its `node-test` job is blocking. A suite that
// had to download ~400 MB of browsers on every pipeline would be slow and
// flaky for little return on a template.
//
// The script is therefore `test:e2e` rather than `test`, so that turning
// `node-test` on by accident cannot pick it up and fail on a missing browser.
//
//   npm run test:e2e        headless, what you run before pushing
//   npm run test:e2e:ui     the watch-mode UI, for writing them
//
// One-off setup per clone, since the browsers are not in node_modules:
//   npx playwright install chromium
export default defineConfig({
  testDir: './e2e',

  // mtgtop8 and Scryfall are intercepted and served from saved data (see
  // e2e/mock.ts), so the suite runs offline and is deterministic. Whether the
  // live site still parses is the parsers' job, through their fixtures and a
  // manual look at the real thing.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'line' : 'html',

  use: {
    baseURL: 'http://localhost:5173',
    // Only kept for a failing test: traces are large, and a green run should
    // leave nothing behind.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright starts the dev server itself, so `npm run test:e2e` is the whole
  // command. `reuseExistingServer` keeps a `make dev` you already have running
  // from being killed and restarted between runs.
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
