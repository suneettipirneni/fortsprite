import { defineConfig } from "@playwright/test"
import config from "./playwright.instant.config"

export default defineConfig({
  ...config,
  testMatch: "**/*.perf.ts",
  timeout: 180_000,
  outputDir: "/tmp/fortsprite-performance-results",
  use: { ...config.use, trace: "on" },
})
