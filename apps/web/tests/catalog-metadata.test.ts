import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { supplementalDustMetadata } from "../../api/src/catalog-metadata.ts"

const current = { baseName: "Jonesy", variant: "Base", sourceSeasonId: 42, season: "C7 S4" }

test("supplemental costs distinguish base and special variants and retain provenance", () => {
  const metadata = supplementalDustMetadata(current)
  assert.equal(metadata?.spriteDustValue, 100)
  assert.equal(metadata?.spriteDustSource.url, "https://certifriedmultitool.com/sprites/info")
  for (const variant of ["Gold", "Cheat Master", "Loot Hacker", "Bounty Hunter", "Trick or Treat", "Quack"])
    assert.equal(supplementalDustMetadata({ ...current, variant })?.spriteDustValue, 1500)
  assert.equal(supplementalDustMetadata({ ...current, baseName: "Klombo" })?.spriteDustValue, 2000)
  assert.equal(supplementalDustMetadata({ ...current, baseName: "Klombo", variant: "Gold" })?.spriteDustValue, 2400)
})

test("current costs never spill into archived seasons, unknown families or unreviewed variants", () => {
  for (const overrides of [
    { sourceSeasonId: 41, season: "C7 S3" },
    { sourceSeasonId: 43, season: "C7 S5" },
    { sourceSeasonId: null },
    { season: "C7 S3" },
    { baseName: "Unknown" },
    { variant: "Future" },
    { baseName: "Mega Man", variant: "Gold" },
  ]) assert.equal(supplementalDustMetadata({ ...current, ...overrides }), null)
})

test("checked-in snapshot contains supplemental costs for every current-season Sprite", () => {
  const catalog = JSON.parse(readFileSync(new URL("../public/sprites/catalog.json", import.meta.url), "utf8"))
  const currentSeason = catalog.filter((sprite: typeof current) => sprite.sourceSeasonId === 42)
  assert.equal(currentSeason.length, 162)
  for (const sprite of currentSeason) {
    assert.equal(sprite.sourceSummonCost, "0", "retain the primary source's raw value")
    const metadata = supplementalDustMetadata(sprite)
    assert.ok(metadata, sprite.id)
    assert.equal(sprite.spriteDustValue, metadata.spriteDustValue, sprite.id)
    assert.ok(sprite.spriteDustValue > 0, sprite.id)
  }
})
