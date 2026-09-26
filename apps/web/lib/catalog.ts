import "server-only"

import { getCatalog as readCatalog } from "@fortsprite/api/catalog"
import { CatalogRevisionMismatchError } from "@workspace/contracts"
import { cacheLife, cacheTag } from "next/cache"

export async function getCatalog(revision: string) {
  "use cache"
  cacheLife("days")
  cacheTag("sprite-catalog", `sprite-catalog:${revision}`)
  const catalog = await readCatalog()
  if (catalog.revision !== revision) throw new CatalogRevisionMismatchError()
  return catalog
}

export async function getCachedCatalog() {
  "use cache"
  cacheLife("days")
  cacheTag("sprite-catalog")
  return readCatalog()
}
