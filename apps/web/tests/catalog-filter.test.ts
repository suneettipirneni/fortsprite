import assert from "node:assert/strict"
import test from "node:test"

import { filterCatalogResults, toCatalogResult, type CatalogResult } from "../lib/catalog-filter"

function item(
  id: string,
  overrides: Partial<CatalogResult> = {},
): CatalogResult {
  return {
    id,
    baseName: "Water",
    variant: "Base",
    rarity: "Rare",
    displayOrder: 0,
    imagePath: null,
    ...overrides,
  }
}
const helper = {
  id: "friend",
  handle: "friend",
  displayName: "Friend",
  initials: "F",
  fortniteDisplayName: null,
  mastered: false,
}
const all = {
  query: "",
  variant: "all",
  rarity: "all",
  availability: "all",
} as const

test("compact result payloads preserve filtering, ordering, and helper profiles", () => {
  const entries = [
    { ...item("water", { helpers: [helper], displayOrder: 2 }), description: "Unused detail" },
    { ...item("gold", { variant: "Gold", rarity: "Epic" }), sourcePage: "https://example.com" },
    { ...item("air", { baseName: "Air" }), descriptionLines: ["Unused detail"] },
  ]
  const compact = entries.map(toCatalogResult)
  for (const filters of [
    all,
    { ...all, query: "water" },
    { ...all, variant: "Gold", rarity: "Epic" },
    { ...all, availability: "available" as const },
    { ...all, availability: "unavailable" as const },
  ]) {
    assert.deepEqual(
      filterCatalogResults(compact, filters),
      filterCatalogResults(entries, filters).map(toCatalogResult),
    )
  }
  assert.deepEqual(compact[0]?.helpers, [helper])
  assert.ok(JSON.stringify(compact).length < JSON.stringify(entries).length)
})

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
