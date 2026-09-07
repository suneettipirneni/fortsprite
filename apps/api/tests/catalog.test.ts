import "./env.js"

import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { after, test } from "node:test"
import { eq, inArray } from "drizzle-orm"

const { catalogItem, importCatalogSnapshot, parseCatalogSnapshot } =
  await import("../src/catalog.js")
const { db, pool } = await import("../src/db/client.js")
const { sprites, collectionEntries } = await import("../src/db/schema.js")
const { user } = await import("../src/db/auth-schema.js")

const prefix = `catalog-${randomUUID()}`
const stableKeys: string[] = []
const userId = `${prefix}-owner`

function source(suffix: string) {
  const slug = `${prefix}-${suffix}`
  const stableKey = `test:${slug}`
  stableKeys.push(stableKey)
  return {
    id: slug,
    slug,
    stableKey,
    name: "Gold Test Sprite",
    baseName: "Test Sprite",
    variant: "Gold",
    sourceVariant: "Golden",
    rarity: "Special",
    releaseStatus: "unreleased",
    displayOrder: 0,
    season: "C7 S4",
    sourceSeasonId: 42,
    localPath: "/sprites/test.webp",
    sourceImage: "https://example.com/test.webp",
    description: "First line. Second line.",
    descriptionLines: ["First line.", "Second line."],
    levelProgression: null,
    location: null,
    spriteDustValue: 0,
    sourceSummonCost: "0",
    dropChancePercent: "0.123456789",
    dropChances: [
      { source: "Sprite Chest", percent: "0.123456789" },
      { source: "Shrine", percent: "22.00" },
    ],
    sourcePage: "https://example.com/test-sprite",
    sourceVerifiedAt: "2026-09-05",
  }
}

async function record(stableKey: string) {
  const [row] = await db
    .select()
    .from(sprites)
    .where(eq(sprites.stableKey, stableKey))
  assert.ok(row)
  return row
}

after(async () => {
  await db.delete(user).where(eq(user.id, userId))
  await db.delete(sprites).where(inArray(sprites.stableKey, stableKeys))
  await pool.end()
})

test("the checked-in snapshot matches the import schema", async () => {
  const snapshot = JSON.parse(
    await readFile(
      new URL("../../web/public/sprites/catalog.json", import.meta.url),
      "utf8",
    ),
  )
  assert.equal(parseCatalogSnapshot(snapshot).length, snapshot.length)
})

test("unchanged imports preserve IDs, timestamps, exact metadata and collection history", async () => {
  const item = source("stable")
  const first = await importCatalogSnapshot([item])
  assert.equal(first.inserted, 1)
  const saved = await record(item.stableKey)
  assert.match(saved.id, /^[0-9a-f-]{36}$/)
  assert.notEqual(saved.id, item.id)
  assert.equal(saved.imageUrl, item.localPath)
  assert.equal(saved.dropChancePercent, item.dropChancePercent)
  assert.deepEqual(saved.dropChances, item.dropChances)
  assert.deepEqual(saved.descriptionLines, item.descriptionLines)
  assert.equal(saved.sourceVariant, item.sourceVariant)
  assert.equal(saved.sourceName, item.name)
  assert.equal(saved.sourceSummonCost, "0")
  assert.equal(saved.sourceImage, item.sourceImage)
  assert.equal(saved.sourceLocalPath, item.localPath)
  assert.equal(saved.levelProgression, null)
  assert.equal(saved.season, item.season)
  await db.insert(user).values({
    id: userId,
    name: "Catalog owner",
    email: `${userId}@example.com`,
    handle: `c${randomUUID().slice(0, 20)}`,
  })
  const [entry] = await db
    .insert(collectionEntries)
    .values({
      userId,
      spriteId: saved.id,
      owned: true,
      mastered: true,
    })
    .returning()
  const repeated = await importCatalogSnapshot([item])
  assert.deepEqual(repeated, {
    imported: 1,
    inserted: 0,
    updated: 0,
    unchanged: 1,
  })
  assert.deepEqual(await record(item.stableKey), saved)
  const [unchangedEntry] = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.userId, userId))
  assert.deepEqual(unchangedEntry, entry)
  const renamed = {
    ...item,
    id: `${item.id}-renamed`,
    slug: `${item.slug}-renamed`,
    releaseStatus: "retired",
    description: "Corrected description",
  }
  await importCatalogSnapshot([renamed])
  const updated = await record(item.stableKey)
  assert.equal(updated.id, saved.id)
  assert.equal(updated.slug, renamed.slug)
  assert.equal(updated.releaseStatus, "retired")
  const [retainedEntry] = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.userId, userId))
  assert.deepEqual(retainedEntry, entry)
})

test("slug matching preserves existing IDs when the source stable key changes", async () => {
  const item = source("key-change")
  await importCatalogSnapshot([item])
  const before = await record(item.stableKey)
  const changed = { ...item, stableKey: `${item.stableKey}-new` }
  stableKeys.push(changed.stableKey)
  await importCatalogSnapshot([changed])
  assert.equal((await record(changed.stableKey)).id, before.id)
})

test("conflicting identities roll back every item and omissions retain catalog rows", async () => {
  const first = source("conflict-one")
  const second = source("conflict-two")
  await importCatalogSnapshot([first, second])
  const savedFirst = await record(first.stableKey)
  const savedSecond = await record(second.stableKey)
  const extra = source("conflict-extra")
  await assert.rejects(
    importCatalogSnapshot([
      extra,
      { ...first, id: second.id, slug: second.slug },
    ]),
    /identity conflict/,
  )
  assert.deepEqual(await record(first.stableKey), savedFirst)
  assert.deepEqual(await record(second.stableKey), savedSecond)
  assert.equal(
    (
      await db
        .select()
        .from(sprites)
        .where(eq(sprites.stableKey, extra.stableKey))
    ).length,
    0,
  )
  await importCatalogSnapshot([first])
  assert.deepEqual(await record(second.stableKey), savedSecond)
  await assert.rejects(
    importCatalogSnapshot([first, first]),
    /duplicate identities/,
  )
})

test("two source items cannot silently overwrite the same existing row", async () => {
  const item = source("double-target")
  await importCatalogSnapshot([item])
  const alternate = source("double-alternate")
  await assert.rejects(
    importCatalogSnapshot([
      { ...item, id: `${item.id}-moved`, slug: `${item.slug}-moved` },
      { ...alternate, id: item.id, slug: item.slug },
    ]),
    /Multiple source items resolve/,
  )
  assert.equal((await record(item.stableKey)).slug, item.slug)
})

test("production imports retain artwork paths and repeated imports preserve IDs", async () => {
  const item = source("artwork")
  const oldEnvironment = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = "production"
    await importCatalogSnapshot([item])
    const imported = await record(item.stableKey)
    assert.equal(catalogItem(imported).imagePath, item.localPath)
    assert.equal((await importCatalogSnapshot([item])).unchanged, 1)
    assert.equal((await record(item.stableKey)).id, imported.id)
    await importCatalogSnapshot([{ ...item, localPath: null }])
    assert.equal(catalogItem(await record(item.stableKey)).imagePath, null)
  } finally {
    if (oldEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnvironment
  }
})

test("approved rarity data can expand without changing application code", async () => {
  const item = { ...source("new-rarity"), rarity: "Prismatic" }
  assert.throws(() => parseCatalogSnapshot([item]), /Unapproved catalog rarity/)
  assert.throws(
    () => parseCatalogSnapshot([item], ["Prismatic", "Prismatic"]),
    /duplicate/,
  )
  assert.equal(
    (await importCatalogSnapshot([item], { allowedRarities: ["Prismatic"] }))
      .inserted,
    1,
  )
  assert.equal((await record(item.stableKey)).rarity, "Prismatic")
  assert.equal(
    (await importCatalogSnapshot([item], { allowedRarities: ["Prismatic"] }))
      .unchanged,
    1,
  )
})
