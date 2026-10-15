import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { spriteAbilities, variantAbilities } from "../lib/sprite-abilities"

type Description = Parameters<typeof spriteAbilities>[0]
const catalog = JSON.parse(readFileSync(new URL("../public/sprites/catalog.json", import.meta.url), "utf8")) as (Description & { id: string })[]

test("every catalog variant includes its bonus exactly once in structured and combined descriptions", () => {
  for (const sprite of catalog) {
    if (sprite.variant === "Base") continue
    const bonus = variantAbilities[sprite.variant]
    assert.ok(bonus, `${sprite.id}: unreviewed variant`)
    assert.equal(sprite.descriptionLines[0], bonus.description, sprite.id)
    assert.equal(sprite.descriptionLines.filter((line) => line === bonus.description).length, 1, sprite.id)
    assert.equal(sprite.description, sprite.descriptionLines.join(" "), sprite.id)
    assert.ok(!spriteAbilities(sprite).baseAbilities.includes(bonus.description), sprite.id)
  }
})

test("older imports with only the base ability still get the variant effect", () => {
  const result = spriteAbilities({ variant: "Gold", description: "Recover health.", descriptionLines: ["Recover health."] })
  assert.match(result.variantAbility!.description, /3x/)
  assert.deepEqual(result.baseAbilities, ["Recover health."])
})

test("combined legacy descriptions do not duplicate the bonus", () => {
  const bonus = variantAbilities.Gold!.description
  const result = spriteAbilities({ variant: "Gold", description: `${bonus} Recover health.`, descriptionLines: [] })
  assert.deepEqual(result.baseAbilities, ["Recover health."])
})

test("empty, base, and future variants preserve honest fallback behavior", () => {
  assert.deepEqual(spriteAbilities({ variant: "Base", description: "", descriptionLines: [] }), { variantAbility: null, baseAbilities: [] })
  assert.deepEqual(spriteAbilities({ variant: "Future", description: "New effect.", descriptionLines: [] }), { variantAbility: null, baseAbilities: ["New effect."] })
  assert.deepEqual(spriteAbilities({ variant: "Quack", description: null, descriptionLines: [] }).baseAbilities, [])
})
