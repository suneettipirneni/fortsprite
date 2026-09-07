import { defineConfig, devices } from "@playwright/test"

process.env.BROWSER_FIXTURE_PATH = "/tmp/fortsprite-instant-fixture.json"
process.env.BROWSER_PROVIDER_STATE_PATH =
  "/tmp/fortsprite-instant-provider.json"

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
    baseURL: "http://localhost:3002",
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
    url: "http://localhost:3002/sign-in",
    timeout: 240_000,
    reuseExistingServer: false,
  },
})
