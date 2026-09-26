import assert from "node:assert/strict"
import test from "node:test"
import type { CollectionItem } from "@workspace/contracts"
import {
  filterCollection,
  type CollectionFilters,
} from "../lib/collection-filter"

const defaults: CollectionFilters = {
  query: "",
  capture: null,
  mastery: null,
  variants: [],
  rarities: [],
  seasons: [],
  sort: "catalog",
}
function item(
  id: string,
  overrides: Partial<CollectionItem> = {},
): CollectionItem {
  return {
    id,
    spriteId: id,
    stableKey: id,
    slug: id,
    baseName: "Alpha",
    variant: "Gold",
    sourceVariant: "Gold",
    rarity: "Rare",
    releaseStatus: "released",
    displayOrder: 0,
    season: "Chapter 7 Season 4",
    sourceSeasonId: 74,
    imagePath: null,
    description: null,
    descriptionLines: [],
    levelProgression: null,
    location: null,
    spriteDustValue: null,
    dropChancePercent: null,
    dropChances: [],
    sourcePage: "https://example.test/sprite",
    sourceVerifiedAt: "2026-09-06T00:00:00Z",
    owned: false,
    mastered: false,
    updatedAt: null,
    helpers: [],
    ...overrides,
  } as CollectionItem
}
const ids = (items: CollectionItem[]) => items.map((item) => item.id)

test("collection search keeps variant-name order, season text and normalized whitespace", () => {
  const items = [
    item("known"),
    item("unknown", { baseName: "Beta", season: null, sourceSeasonId: null }),
  ]
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, query: "  GOLD alpha  " })),
    ["known"],
  )
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, query: "alpha gold" })),
    [],
  )
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, query: "season 4" })),
    ["known"],
  )
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, query: "Season unavailable" })),
    ["unknown"],
  )
})

test("capture, mastery, rarity and variant tokens intersect", () => {
  const items = [
    item("mastered", { owned: true, mastered: true }),
    item("owned", { owned: true, mastered: false }),
    item("missing"),
    item("other-rarity", { rarity: "Epic", owned: true, mastered: true }),
    item("other-variant", { variant: "Base", owned: true, mastered: true }),
  ]
  assert.deepEqual(
    ids(
      filterCollection(items, {
        ...defaults,
        mastery: "mastered",
        rarities: ["Rare"],
        variants: ["Gold"],
      }),
    ),
    ["mastered"],
  )
  assert.deepEqual(
    ids(
      filterCollection(items, {
        ...defaults,
        capture: "captured",
        rarities: ["Rare"],
        variants: ["Gold"],
      }),
    ),
    ["mastered", "owned"],
  )
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, capture: "missing" })),
    ["missing"],
  )
})

test("captured and not mastered compose without including missing Sprites", () => {
  const items = [
    item("mastered", { owned: true, mastered: true }),
    item("captured", { owned: true, mastered: false }),
    item("missing"),
  ]

  assert.deepEqual(
    ids(
      filterCollection(items, {
        ...defaults,
        capture: "captured",
        mastery: "not-mastered",
      }),
    ),
    ["captured"],
  )
  assert.deepEqual(
    ids(
      filterCollection(items, {
        ...defaults,
        mastery: "not-mastered",
      }),
    ),
    ["captured", "missing"],
  )
})

test("multiple values are ORed within a token category", () => {
  const items = [
    item("gold-rare"),
    item("base-epic", { variant: "Base", rarity: "Epic" }),
    item("silver-uncommon", { variant: "Silver", rarity: "Uncommon" }),
  ]

  assert.deepEqual(
    ids(
      filterCollection(items, {
        ...defaults,
        variants: ["Gold", "Base"],
        rarities: ["Rare", "Epic"],
      }),
    ),
    ["gold-rare", "base-epic"],
  )
})

test("selected seasons combine with other filters and include unknown season", () => {
  const items = [
    item("current", { sourceSeasonId: 74, owned: true }),
    item("older", { sourceSeasonId: 73, owned: true }),
    item("unknown", { sourceSeasonId: null, season: null }),
  ]
  assert.deepEqual(ids(filterCollection(items, { ...defaults, seasons: [74] })), ["current"])
  assert.deepEqual(ids(filterCollection(items, { ...defaults, seasons: [74, 73], capture: "captured" })), ["current", "older"])
  assert.deepEqual(ids(filterCollection(items, { ...defaults, seasons: [null] })), ["unknown"])
  assert.deepEqual(ids(filterCollection(items, defaults)), ["current", "older", "unknown"])
})

test("season sorting keeps unknown seasons last and uses catalog order within a season", () => {
  const items = [
    item("unknown", { sourceSeasonId: null, displayOrder: 0 }),
    item("old", { sourceSeasonId: 0, displayOrder: 3 }),
    item("new-later", { sourceSeasonId: 2, displayOrder: 2 }),
    item("new-first", { sourceSeasonId: 2, displayOrder: 1 }),
  ]
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, sort: "season-newest" })),
    ["new-first", "new-later", "old", "unknown"],
  )
  assert.deepEqual(
    ids(filterCollection(items, { ...defaults, sort: "season-oldest" })),
    ["old", "new-first", "new-later", "unknown"],
  )
  assert.deepEqual(ids(filterCollection(items, defaults)), [
    "unknown",
    "new-first",
    "new-later",
    "old",
  ])
})

test("equal catalog order remains stable and filtering never mutates input", () => {
  const items = [item("z"), item("a"), item("before", { displayOrder: -1 })]
  for (const value of items) Object.freeze(value)
  Object.freeze(items)
  const result = filterCollection(items, defaults)
  assert.deepEqual(ids(result), ["before", "z", "a"])
  assert.deepEqual(ids(items), ["z", "a", "before"])
  assert.equal(result[1], items[0])
  assert.notEqual(result, items)
})
