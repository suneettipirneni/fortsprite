import "../../../api/tests/env.js"
import { execFileSync, spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const webRoot = fileURLToPath(new URL("../../", import.meta.url))
const apiTests = new URL("../../../api/tests/", import.meta.url)
const tsx = fileURLToPath(
  new URL("../../../api/node_modules/tsx/dist/cli.mjs", import.meta.url),
)
const seed = fileURLToPath(new URL("seed-browser.ts", apiTests))
const next = fileURLToPath(
  new URL("../../node_modules/next/dist/bin/next", import.meta.url),
)

function seedFixtures(cleanup = false) {
  execFileSync(
    process.execPath,
    [tsx, seed, ...(cleanup ? ["--cleanup"] : [])],
    {
      cwd: webRoot,
      env: { ...process.env, NODE_ENV: "test" },
      stdio: "inherit",
    },
  )
}

seedFixtures()
const environment: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "production",
  BETTER_AUTH_URL: "https://localhost:3002",
  WEB_ORIGIN: "https://localhost:3002",
  FORTSPRITE_DIST_DIR: ".next-instant",
  EXPOSE_TESTING_API: "1",
  SUPPORT_CONTACT_URL: "mailto:support@example.test",
  NODE_OPTIONS:
    `${process.env.NODE_OPTIONS ?? ""} --import ${new URL("browser-provider.mjs", apiTests).href}`.trim(),
}

try {
  execFileSync(
    process.execPath,
    ["scripts/prepare-sprite-assets.mjs", "--production"],
    {
      cwd: webRoot,
      env: environment,
      stdio: "inherit",
    },
  )
  execFileSync(process.execPath, [next, "build"], {
    cwd: webRoot,
    env: environment,
    stdio: "inherit",
  })
} catch (error) {
  seedFixtures(true)
  throw error
}

const child = spawn(
  process.execPath,
  [next, "start", "--hostname", "localhost", "--port", "3002"],
  {
    cwd: webRoot,
    env: environment,
    stdio: "inherit",
  },
)
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal))
child.on("exit", (code) => {
  seedFixtures(true)
  process.exit(code ?? 1)
})
