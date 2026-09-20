import assert from "node:assert/strict"
import { test } from "node:test"

import {
  latestSeasonId,
  latestSeasonItems,
} from "../lib/catalog-season.ts"

test("latest season is derived from catalog metadata", () => {
  const items = [
    { id: "unknown", sourceSeasonId: null },
    { id: "older", sourceSeasonId: 41 },
    { id: "latest-a", sourceSeasonId: 42 },
    { id: "latest-b", sourceSeasonId: 42 },
  ]

  assert.equal(latestSeasonId(items), 42)
  assert.deepEqual(
    latestSeasonItems(items).map((item) => item.id),
    ["latest-a", "latest-b"],
  )
})

test("catalogs without season metadata fail closed", () => {
  const items = [{ id: "unknown", sourceSeasonId: null }]

  assert.equal(latestSeasonId(items), null)
  assert.deepEqual(latestSeasonItems(items), [])
})
