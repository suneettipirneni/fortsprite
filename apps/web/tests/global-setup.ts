import { execFileSync } from "node:child_process"
import { resolve } from "node:path"

export default function globalSetup() {
  execFileSync(
    process.execPath,
    [
      resolve("../api/node_modules/tsx/dist/cli.mjs"),
      resolve("../api/tests/seed-browser.ts"),
    ],
    { stdio: "inherit", env: process.env },
  )
}
