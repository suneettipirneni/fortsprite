import "./env.js"
import { createHmac, randomUUID } from "node:crypto"
import { chmod, readFile, unlink, writeFile } from "node:fs/promises"
import { eq, inArray } from "drizzle-orm"

const { db, pool } = await import("../src/db/client.ts")
const { user, session, account, rateLimit } =
  await import("../src/db/auth-schema.ts")
const { sprites, collectionEntries } = await import("../src/db/schema.ts")
const { importCatalogSnapshot } = await import("../src/catalog.ts")
const { userRateLimitKeys } = await import("../src/rate-limit.ts")
const fixturePath =
  process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json"

async function writePrivate(path: string, value: unknown) {
  await writeFile(path, JSON.stringify(value, null, 2), { mode: 0o600 })
  await chmod(path, 0o600)
}

async function cleanup() {
  const previous = await readFile(fixturePath, "utf8")
    .then(JSON.parse)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null
      throw error
    })
  if (previous) {
    const ids: string[] = previous.actors
      ? Object.values(
          previous.actors as Record<string, { userId: string }>,
        ).map((actor) => actor.userId)
      : [previous.userId]
    await db.delete(rateLimit).where(
      inArray(
        rateLimit.key,
        ids.flatMap(userRateLimitKeys),
      ),
    )
    await db.delete(user).where(inArray(user.id, ids))
  }
  for (const path of [fixturePath]) {
    await unlink(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    })
  }
}

try {
  await cleanup()
  if (!process.argv.includes("--cleanup")) {
    const catalog = JSON.parse(
      await readFile(
        new URL("../../web/public/sprites/catalog.json", import.meta.url),
        "utf8",
      ),
    )
    await importCatalogSnapshot(catalog)
    const baseURL = process.env.WEB_ORIGIN!
    const actors = Object.fromEntries(
      ["a", "b"].map((key, index) => {
        const userId = `${index === 0 ? "a" : "B"}${randomUUID().replaceAll("-", "")}Z`
        const tokens = {
          desktop: randomUUID(),
          mobile: randomUUID(),
        }
        const cookies = Object.fromEntries(
          Object.entries(tokens).map(([project, token]) => {
            const signature = createHmac(
              "sha256",
              process.env.BETTER_AUTH_SECRET!,
            )
              .update(token)
              .digest("base64")
            return [
              project,
              {
                name: "better-auth.session_token",
                value: encodeURIComponent(`${token}.${signature}`),
                url: baseURL,
                httpOnly: true,
                sameSite: "Lax" as const,
              },
            ]
          }),
        ) as Record<"desktop" | "mobile", {
          name: string
          value: string
          url: string
          httpOnly: boolean
          sameSite: "Lax"
        }>
        return [
          key,
          {
            userId,
            displayName:
              index === 0 ? "Browser collector" : "Browser squadmate",
            providerDisplayName:
              index === 0 ? "Google Collector" : "Google Squadmate",
            handle: `browser_${randomUUID().slice(0, 8)}`,
            tokens,
            cookies,
          },
        ]
      }),
    )
    for (const actor of Object.values(actors)) {
      await db
        .insert(user)
        .values({
          id: actor.userId,
          name: actor.providerDisplayName,
          appDisplayName: actor.displayName,
          email: `${actor.userId}@test.invalid`,
          handle: actor.handle,
        })
      await db
        .insert(account)
        .values({
          id: randomUUID(),
          userId: actor.userId,
          accountId: `google-${actor.userId}`,
          providerId: "google",
          scope: "openid,email,profile",
        })
      await db.insert(session).values(
        Object.values(actor.tokens).map((token) => ({
          id: randomUUID(),
          token,
          userId: actor.userId,
          expiresAt: new Date(Date.now() + 86_400_000),
          updatedAt: new Date(),
        })),
      )
    }
    const selected = await db
      .select()
      .from(sprites)
      .where(eq(sprites.releaseStatus, "released"))
    selected.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug),
    )
    const [first, second] = selected
    if (!first || !second)
      throw new Error("Browser fixtures need two released Sprites")
    const a = actors.a!
    const b = actors.b!
    await db.insert(collectionEntries).values([
      { userId: a.userId, spriteId: first.id, owned: true, mastered: false },
      { userId: b.userId, spriteId: second.id, owned: true, mastered: false },
    ])
    await writePrivate(fixturePath, {
      userId: a.userId,
      cookies: a.cookies,
      baseURL,
      actors,
      sprites: [first, second].map((sprite) => ({
        id: sprite.id,
        baseName: sprite.baseName,
        variant: sprite.variantName,
        rarity: sprite.rarity,
      })),
    })
    console.log(`Seeded two browser users and ${catalog.length} catalog items`)
  }
} finally {
  await pool.end()
}
