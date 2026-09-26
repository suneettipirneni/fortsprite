import { defineConfig, devices } from "@playwright/test"

process.env.BROWSER_FIXTURE_PATH = "/tmp/fortsprite-instant-fixture.json"

export default defineConfig({
  testDir: "./tests/instant",
  testMatch: "**/*.instant.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: "/tmp/fortsprite-instant-results",
  reporter: "list",
  use: {
    baseURL: "https://localhost:3002",
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
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
    stdout: "pipe",
    command: "node ../api/node_modules/tsx/dist/cli.mjs tests/instant/start.ts",
    url: "https://localhost:3002/sign-in",
    ignoreHTTPSErrors: true,
    timeout: 240_000,
    reuseExistingServer: false,
  },
})
