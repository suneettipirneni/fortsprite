import { defineConfig } from "@playwright/test"
import config from "./playwright.config"

export default defineConfig({
  ...config,
  testMatch: ["**/webmcp.spec.ts", "**/mcp-keys.spec.ts", "**/mcp-oauth.spec.ts"],
  projects: config.projects?.filter((project) => project.name === "desktop" || project.name === "mobile"),
  use: {
    ...config.use,
    launchOptions: {
      args: ["--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport", "--enable-experimental-web-platform-features"],
    },
  },
})
