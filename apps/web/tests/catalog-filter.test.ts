import assert from "node:assert/strict"
import test from "node:test"

import { filterCatalogResults, type CatalogResult } from "../lib/catalog-filter"

function item(
  id: string,
  overrides: Partial<CatalogResult> = {},
): CatalogResult {
  return {
    id,
    slug: id,
    stableKey: id,
    baseName: "Water",
    variant: "Base",
    sourceVariant: "Base",
    rarity: "Rare",
    releaseStatus: "released",
    displayOrder: 0,
    season: null,
    sourceSeasonId: null,
    imagePath: null,
    description: null,
    descriptionLines: [],
    levelProgression: null,
    location: null,
    spriteDustValue: null,
    dropChancePercent: null,
    dropChances: [],
    sourcePage: "https://example.com/sprites",
    sourceVerifiedAt: "2026-09-06",
    ...overrides,
  }
}
const helper = {
  id: "friend",
  handle: "friend",
  displayName: "Friend",
  initials: "F",
  fortniteDisplayName: null,
}
const all = {
  query: "",
  variant: "all",
  rarity: "all",
  availability: "all",
} as const

test("availability comes before catalog order and ties have deterministic IDs", () => {
  const entries = [
    item("z"),
    item("b", { helpers: [helper], displayOrder: 9 }),
    item("a"),
  ]
  assert.deepEqual(
    filterCatalogResults(entries, all).map((entry) => entry.id),
    ["b", "a", "z"],
  )
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["z", "b", "a"],
  )
})

test("search, rarity, variant, and availability are applied together", () => {
  const entries = [
    item("match", { variant: "Gold", rarity: "Epic", helpers: [helper] }),
    item("wrong-variant", { rarity: "Epic", helpers: [helper] }),
    item("wrong-rarity", { variant: "Gold", helpers: [helper] }),
    item("unavailable", { variant: "Gold", rarity: "Epic" }),
    item("wrong-name", {
      variant: "Gold",
      rarity: "Epic",
      helpers: [helper],
      baseName: "Air",
    }),
  ]
  assert.deepEqual(
    filterCatalogResults(entries, {
      query: " WATER ",
      variant: "Gold",
      rarity: "Epic",
      availability: "available",
    }).map((entry) => entry.id),
    ["match"],
  )
})

test("comparison catalogs without helper records can be independently filtered", () => {
  const forYou = [item("water"), item("air", { baseName: "Air" })]
  const forFriend = [item("gold-water", { variant: "Gold" })]
  assert.deepEqual(
    filterCatalogResults(forYou, { ...all, query: "air" }).map(
      (entry) => entry.id,
    ),
    ["air"],
  )
  assert.deepEqual(
    filterCatalogResults(forFriend, all).map((entry) => entry.id),
    ["gold-water"],
  )
  assert.deepEqual(filterCatalogResults([], all), [])
})
