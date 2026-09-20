import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { fileURLToPath } from "node:url"

import manifest from "../app/manifest"
import { config as proxyConfig } from "../proxy"

const appRoot = fileURLToPath(new URL("..", import.meta.url))

function pngDimensions(contents: Buffer) {
  assert.equal(contents.toString("ascii", 1, 4), "PNG")
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
  }
}

test("the install manifest includes standalone and maskable app icons", async () => {
  const value = manifest()

  assert.equal(value.id, "/")
  assert.equal(value.start_url, "/")
  assert.equal(value.scope, "/")
  assert.equal(value.display, "standalone")
  assert.equal(value.background_color, "#061947")
  assert.equal(value.theme_color, "#061947")
  assert.ok(value.icons?.some((icon) => icon.purpose === "maskable"))

  const expectedIcons = [
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/icon-maskable-512.png", 512],
    ["app/apple-icon.png", 180],
  ] as const

  for (const [path, expectedSize] of expectedIcons) {
    const dimensions = pngDimensions(await readFile(`${appRoot}/${path}`))
    assert.deepEqual(dimensions, {
      width: expectedSize,
      height: expectedSize,
    })
  }
})

test("the service worker leaves authenticated routes and APIs network-only", async () => {
  const serviceWorker = await readFile(`${appRoot}/public/sw.js`, "utf8")

  assert.match(serviceWorker, /request\.mode === "navigate"/)
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)\.catch/)
  assert.doesNotMatch(serviceWorker, /pathname\.startsWith\("\/api\//)
  assert.match(serviceWorker, /pathname\.startsWith\("\/sprites\/"\)/)
})

test("the authentication proxy keeps PWA bootstrap routes public", () => {
  const matcher = proxyConfig.matcher[0]

  assert.match(matcher, /offline/)
  assert.match(matcher, /manifest\.webmanifest/)
  assert.match(matcher, /sw\.js/)
})
