import "../../../api/tests/env.js"
import { execFileSync, spawn } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { request } from "node:http"
import { createServer } from "node:https"
import { tmpdir } from "node:os"
import { join } from "node:path"
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
  PASSKEY_RP_ID: "localhost",
  PASSKEY_ORIGIN: "https://localhost:3002",
  FORTSPRITE_DIST_DIR: ".next-instant",
  EXPOSE_TESTING_API: "1",
  SUPPORT_CONTACT_URL: "mailto:support@example.test",
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

const certificateDirectory = mkdtempSync(join(tmpdir(), "fortsprite-instant-tls-"))
const keyPath = join(certificateDirectory, "localhost.key")
const certificatePath = join(certificateDirectory, "localhost.crt")
try {
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=localhost", "-keyout", keyPath, "-out", certificatePath,
  ], { stdio: "pipe" })
} catch (error) {
  rmSync(certificateDirectory, { recursive: true, force: true })
  seedFixtures(true)
  throw error
}

const server = createServer({
  key: readFileSync(keyPath),
  cert: readFileSync(certificatePath),
}, (incoming, outgoing) => {
  const upstream = request({
    hostname: "localhost",
    port: 3003,
    path: incoming.url,
    method: incoming.method,
    headers: { ...incoming.headers, "x-forwarded-proto": "https" },
  }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers)
    response.pipe(outgoing)
  })
  upstream.on("error", () => {
    outgoing.writeHead(502)
    outgoing.end()
  })
  incoming.pipe(upstream)
})

const child = spawn(
  process.execPath,
  [next, "start", "--hostname", "localhost", "--port", "3003"],
  {
    cwd: webRoot,
    env: environment,
    stdio: "inherit",
  },
)
server.listen(3002, "localhost")
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal))
child.on("exit", (code) => {
  server.close()
  rmSync(certificateDirectory, { recursive: true, force: true })
  seedFixtures(true)
  process.exit(code ?? 1)
})
