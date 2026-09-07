import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: "/tmp/fortsprite-playwright-results",
  reporter: "list",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command:
      "node ../api/node_modules/tsx/dist/cli.mjs ../api/tests/start-web.ts",
    url: "http://localhost:3000/sign-in",
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
