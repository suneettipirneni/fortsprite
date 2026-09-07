import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { fileURLToPath } from "node:url"

import { importCatalogSnapshot } from "../src/catalog.js"
import { pool } from "../src/db/client.js"

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      approvals: { type: "string" },
      rarities: { type: "string" },
      "allow-source-artwork": { type: "boolean", default: false },
    },
  })
  if (positionals.length > 1) throw new Error("Pass one catalog snapshot path")
  const snapshotPath = positionals[0]
    ? resolve(positionals[0])
    : fileURLToPath(
        new URL("../../web/public/sprites/catalog.json", import.meta.url),
      )
  const snapshot: unknown = JSON.parse(await readFile(snapshotPath, "utf8"))
  const approvals: unknown = values.approvals
    ? JSON.parse(await readFile(resolve(values.approvals), "utf8"))
    : undefined
  const allowedRarities: unknown = values.rarities
    ? JSON.parse(await readFile(resolve(values.rarities), "utf8"))
    : undefined
  const result = await importCatalogSnapshot(snapshot, {
    approvals,
    allowedRarities,
    allowSourceArtwork: values["allow-source-artwork"],
  })
  console.log(
    `Catalog imported. ${result.inserted} inserted, ${result.updated} updated, ${result.unchanged} unchanged. Existing Sprite IDs and collection history preserved.`,
  )
} finally {
  await pool.end()
}
