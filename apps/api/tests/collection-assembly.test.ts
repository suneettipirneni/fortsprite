import assert from "node:assert/strict"
import { test } from "node:test"
import { assembleCollection } from "@workspace/contracts"
import type { CatalogItem, CatalogSnapshot, CollectionTrackingSnapshot } from "@workspace/contracts"

function sprite(id: string, baseName: string, variant: string): CatalogItem {
  return {
    id,
    slug: id,
    stableKey: id,
    baseName,
    variant,
    sourceVariant: variant,
    rarity: "Rare",
    releaseStatus: "released",
    displayOrder: 1,
    season: "Test season",
    sourceSeasonId: 1,
    imagePath: null,
    description: null,
    descriptionLines: [],
    levelProgression: null,
    location: null,
    spriteDustValue: null,
    dropChancePercent: null,
    dropChances: [],
    sourcePage: "https://example.test/sprite",
    sourceVerifiedAt: "2026-09-26T00:00:00.000Z",
  }
}

const catalog: CatalogSnapshot = {
  revision: "release-1",
  items: [sprite("oak", "Oak", "Base"), sprite("pine", "Pine", "Gold"), sprite("retired", "Retired", "Base")],
}
const tracking: CollectionTrackingSnapshot = {
  catalogRevision: "release-1",
  entries: [
    { spriteId: "pine", owned: true, mastered: true, updatedAt: "2026-09-26T10:00:00.000Z" },
    { spriteId: "oak", owned: false, mastered: false, updatedAt: null },
  ],
  helpers: [{
    spriteId: "oak",
    mastered: true,
    profile: {
      id: "friend",
      handle: "oak_friend",
      displayName: "Oak friend",
      fortniteDisplayName: null,
      initials: "OF",
    },
  }],
}

test("assembly follows catalog order and current released membership with live tracking and helpers", () => {
  const collection = assembleCollection(catalog, tracking)
  assert.deepEqual(collection.items.map((item) => ({
    id: item.id,
    owned: item.owned,
    mastered: item.mastered,
    helpers: item.helpers.map((helper) => [helper.id, helper.mastered]),
  })), [
    { id: "oak", owned: false, mastered: false, helpers: [["friend", true]] },
    { id: "pine", owned: true, mastered: true, helpers: [] },
  ])
  assert.deepEqual(collection.progress, { total: 2, owned: 1, mastered: 1 })
  assert.equal(collection.updatedAt, "2026-09-26T10:00:00.000Z")
})

test("all query filters preserve unfiltered progress and the latest tracking timestamp", () => {
  const collection = assembleCollection(catalog, tracking, {
    search: "PINE GOLD", variant: "Gold", rarity: "Rare", ownership: "owned",
  })
  assert.deepEqual(collection.items.map((item) => item.id), ["pine"])
  assert.deepEqual(collection.progress, { total: 2, owned: 1, mastered: 1 })
  assert.equal(collection.updatedAt, "2026-09-26T10:00:00.000Z")
  assert.deepEqual(assembleCollection(catalog, tracking, {
    search: "pine", ownership: "missing",
  }).items, [])
  assert.deepEqual(assembleCollection(catalog, tracking, { ownership: "missing" })
    .items.map((item) => item.id), ["oak"])
})

test("empty collections have zero progress and incompatible catalog revisions fail", () => {
  assert.deepEqual(assembleCollection({ revision: "empty", items: [] }, {
    catalogRevision: "empty", entries: [], helpers: [],
  }), { items: [], progress: { total: 0, owned: 0, mastered: 0 }, updatedAt: null })
  assert.throws(() => assembleCollection(catalog, {
    ...tracking, catalogRevision: "release-2",
  }), /catalog changed while loading/)
})
