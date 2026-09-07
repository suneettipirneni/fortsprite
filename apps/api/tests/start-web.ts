import "./env.js"
import { execFileSync, spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const webRoot = fileURLToPath(new URL("../../web/", import.meta.url))
execFileSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../../web/scripts/prepare-sprite-assets.mjs", import.meta.url),
    ),
  ],
  {
    cwd: webRoot,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
  },
)
const providerPreload = new URL("./browser-provider.mjs", import.meta.url).href
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../../web/node_modules/next/dist/bin/next", import.meta.url),
    ),
    "dev",
    "--hostname",
    "localhost",
    "--port",
    "3000",
  ],
  {
    cwd: webRoot,
    env: {
      ...process.env,
      FORTSPRITE_DIST_DIR: ".next-e2e",
      SUPPORT_CONTACT_URL: "mailto:support@example.test",
      NODE_OPTIONS:
        `${process.env.NODE_OPTIONS ?? ""} --import ${providerPreload}`.trim(),
    },
    stdio: "inherit",
  },
)
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal))
child.on("exit", (code) => process.exit(code ?? 1))
