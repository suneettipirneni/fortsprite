import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { supplementalDustMetadata } from "../../api/src/catalog-metadata.ts"

const overrideSprite = { baseName: "Jonesy", variant: "Base", sourceSeasonId: 42, season: "C7 S4" }

test("supplemental costs distinguish base and special variants and retain provenance", () => {
  const metadata = supplementalDustMetadata(overrideSprite)
  assert.equal(metadata?.spriteDustValue, 100)
  assert.equal(metadata?.spriteDustSource.url, "https://certifriedmultitool.com/sprites/info")
  for (const variant of ["Gold", "Cheat Master", "Loot Hacker", "Bounty Hunter", "Trick or Treat", "Quack"])
    assert.equal(supplementalDustMetadata({ ...overrideSprite, variant })?.spriteDustValue, 1500)
  assert.equal(supplementalDustMetadata({ ...overrideSprite, baseName: "Klombo" })?.spriteDustValue, 2000)
  assert.equal(supplementalDustMetadata({ ...overrideSprite, baseName: "Klombo", variant: "Gold" })?.spriteDustValue, 2400)
})

test("Override costs never spill into other seasons, unknown families or unreviewed variants", () => {
  for (const overrides of [
    { sourceSeasonId: 41, season: "C7 S3" },
    { sourceSeasonId: 43, season: "C7 MS" },
    { sourceSeasonId: null },
    { season: "C7 S3" },
    { baseName: "Unknown" },
    { variant: "Future" },
    { baseName: "Mega Man", variant: "Gold" },
  ]) assert.equal(supplementalDustMetadata({ ...overrideSprite, ...overrides }), null)
})

test("checked-in snapshot contains supplemental costs for every Override Sprite", () => {
  const catalog = JSON.parse(readFileSync(new URL("../public/sprites/catalog.json", import.meta.url), "utf8"))
  const overrideSeason = catalog.filter((sprite: typeof overrideSprite) => sprite.sourceSeasonId === 42)
  assert.equal(overrideSeason.length, 162)
  for (const sprite of overrideSeason) {
    assert.equal(sprite.sourceSummonCost, "0", "retain the primary source's raw value")
    const metadata = supplementalDustMetadata(sprite)
    assert.ok(metadata, sprite.id)
    assert.equal(sprite.spriteDustValue, metadata.spriteDustValue, sprite.id)
    assert.ok(sprite.spriteDustValue > 0, sprite.id)
  }
})
