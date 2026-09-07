import { execFileSync } from "node:child_process"
import { resolve } from "node:path"

export default function globalTeardown() {
  execFileSync(
    process.execPath,
    [
      resolve("../api/node_modules/tsx/dist/cli.mjs"),
      resolve("../api/tests/seed-browser.ts"),
      "--cleanup",
    ],
    { stdio: "inherit", env: process.env },
  )
}
