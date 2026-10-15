import { mkdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { appleStartupImages, PWA_BACKGROUND } from "../lib/pwa.ts"

// Reuse Next's installed image processor. This is an offline, manual asset task.
const require = createRequire(import.meta.url)
const sharp = require(require.resolve("sharp", {
  paths: [require.resolve("next/package.json")],
}))

const publicDirectory = new URL("../public/", import.meta.url)
const icon = await readFile(new URL("icons/icon-512.png", publicDirectory))
await mkdir(new URL("splash/", publicDirectory), { recursive: true })

for (const image of appleStartupImages) {
  const size = 128 * image.ratio
  const logo = await sharp(icon).resize(size, size).toBuffer()
  await sharp({
    create: {
      width: image.pixelWidth,
      height: image.pixelHeight,
      channels: 3,
      background: PWA_BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(fileURLToPath(new URL(image.url.slice(1), publicDirectory)))
}

console.log(`Generated ${appleStartupImages.length} Apple startup images.`)
