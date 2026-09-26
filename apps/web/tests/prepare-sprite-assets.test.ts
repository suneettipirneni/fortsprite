import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

test("artwork preparation generates a stable registry and retains public images", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fortsprite-artwork-"))
  try {
    await mkdir(path.join(directory, "scripts"))
    await mkdir(path.join(directory, "assets/sprites"), { recursive: true })
    await mkdir(path.join(directory, "public/sprites"), { recursive: true })
    await copyFile(
      new URL("../scripts/prepare-sprite-assets.mjs", import.meta.url),
      path.join(directory, "scripts/prepare-sprite-assets.mjs"),
    )
    const artwork = Buffer.from("source artwork")
    for (const name of ["b", "a"]) {
      await writeFile(path.join(directory, `assets/sprites/${name}.png`), artwork)
    }
    await writeFile(
      path.join(directory, "public/sprites/catalog.json"),
      JSON.stringify([
        { id: "b", localPath: "/sprites/b.png" },
        { id: "a", localPath: "/sprites/a.png" },
        { id: "same-art", localPath: "/sprites/a.png" },
      ]),
    )
    const prepare = () => execFileSync(process.execPath, [
      path.join(directory, "scripts/prepare-sprite-assets.mjs"),
    ])
    prepare()
    const registryPath = path.join(directory, "lib/generated/sprite-artwork.ts")
    const registry = await readFile(registryPath, "utf8")
    assert.equal(registry, [
      'import type { StaticImageData } from "next/image"',
      "",
      'import artwork0 from "../../assets/sprites/a.png"',
      'import artwork1 from "../../assets/sprites/b.png"',
      "",
      "export const spriteArtwork: Record<string, StaticImageData> = {",
      '  "/sprites/a.png": artwork0,',
      '  "/sprites/b.png": artwork1,',
      "}",
      "",
    ].join("\n"))
    assert.deepEqual(await readFile(path.join(directory, "public/sprites/a.png")), artwork)
    const modified = (await stat(registryPath)).mtimeMs
    prepare()
    assert.equal((await stat(registryPath)).mtimeMs, modified)
    assert.equal(await readFile(registryPath, "utf8"), registry)
    await writeFile(path.join(directory, "public/sprites/catalog.json"), JSON.stringify([
      { id: "b", localPath: "/sprites/b.png" },
    ]))
    prepare()
    assert.doesNotMatch(await readFile(registryPath, "utf8"), /a\.png/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
