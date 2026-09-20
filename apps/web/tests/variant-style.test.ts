import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import {
  isStyledVariant,
  variantStyle,
  variantStyles,
} from "../lib/variant-style.ts"

test("every catalog variant has an intentional visual style", async () => {
  const catalog = JSON.parse(
    await readFile(
      new URL("../public/sprites/catalog.json", import.meta.url),
      "utf8",
    ),
  ) as { variant: string }[]
  const missing = [
    ...new Set(catalog.map(({ variant }) => variant)),
  ].filter((variant) => !isStyledVariant(variant))

  assert.deepEqual(missing, [])
})

test("Base stays neutral while every other variant has its own background", () => {
  assert.deepEqual(variantStyles.Base.frame, {
    backgroundColor: "var(--background)",
  })

  const backgrounds = Object.entries(variantStyles)
    .filter(([variant]) => variant !== "Base")
    .map(([, style]) => JSON.stringify(style.frame))

  assert.equal(new Set(backgrounds).size, backgrounds.length)
  assert.ok(backgrounds.every((background) => background.includes("radial-gradient")))
  assert.ok(backgrounds.every((background) => !background.includes("linear-gradient")))
})

test("an unregistered future variant never falls back to the Base background", () => {
  assert.notDeepEqual(
    variantStyle("Future Variant").frame,
    variantStyles.Base.frame,
  )
})
