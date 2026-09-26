import assert from "node:assert/strict"
import { test } from "node:test"

import { summarizeCollection, summarizeSeasons } from "../lib/collection-summary.ts"

test("season choices count the whole catalog and order unknown seasons last", () => {
  assert.deepEqual(summarizeSeasons([
    { sourceSeasonId: null, season: null },
    { sourceSeasonId: 41, season: "C7 S3" },
    { sourceSeasonId: 42, season: "C7 S4" },
    { sourceSeasonId: 42, season: "C7 S4" },
    { sourceSeasonId: null, season: null },
  ]), [
    [42, { label: "C7 S4", count: 2 }],
    [41, { label: "C7 S3", count: 1 }],
    [null, { label: "Season unavailable", count: 2 }],
  ])
})

test("collection summaries preserve facet order and independent group progress", () => {
  const summary = summarizeCollection([
    { baseName: "Jonesy", variant: "Base", rarity: "Rare", owned: true, mastered: false },
    { baseName: "Adventure", variant: "Gold", rarity: "Special", owned: true, mastered: true },
    { baseName: "Jonesy", variant: "Gold", rarity: "Special", owned: false, mastered: false },
    { baseName: "Adventure", variant: "Base", rarity: "Rare", owned: false, mastered: false },
  ])

  assert.equal(summary.captured, 2)
  assert.equal(summary.mastered, 1)
  assert.deepEqual([...summary.variants], [["Base", 2], ["Gold", 2]])
  assert.deepEqual([...summary.rarities], [["Rare", 2], ["Special", 2]])
  assert.deepEqual([...summary.groups], [
    ["Jonesy", { captured: 1, mastered: 0, total: 2 }],
    ["Adventure", { captured: 1, mastered: 1, total: 2 }],
  ])
})

test("empty selections have no facets or progress", () => {
  assert.deepEqual(summarizeSeasons([]), [])
  assert.deepEqual(summarizeCollection([]), {
    captured: 0,
    mastered: 0,
    variants: new Map(),
    rarities: new Map(),
    groups: new Map(),
  })
})
