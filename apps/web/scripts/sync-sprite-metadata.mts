import { readFile, writeFile } from "node:fs/promises"
import { supplementalDustMetadata } from "../../api/src/catalog-metadata.ts"

const catalogPath = new URL("../public/sprites/catalog.json", import.meta.url)
const catalog = JSON.parse(await readFile(catalogPath, "utf8"))
let supplemented = 0
for (const sprite of catalog) {
  const metadata = supplementalDustMetadata(sprite)
  if (!metadata) continue
  sprite.spriteDustValue = metadata.spriteDustValue
  supplemented++
}
// Preserve the primary source's raw summon-cost string and verification date.
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Applied reviewed CertiFried resummon costs to ${supplemented} Sprites.`)
