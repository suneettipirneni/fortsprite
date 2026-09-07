import "./env.js"
import { createHmac, randomUUID } from "node:crypto"
import { chmod, readFile, unlink, writeFile } from "node:fs/promises"
import { eq, inArray } from "drizzle-orm"

const { db, pool } = await import("../src/db/client.ts")
const { user, session, account, rateLimit } =
  await import("../src/db/auth-schema.ts")
const { sprites, collectionEntries } = await import("../src/db/schema.ts")
const { importCatalogSnapshot } = await import("../src/catalog.ts")
const fixturePath =
  process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json"
const providerPath =
  process.env.BROWSER_PROVIDER_STATE_PATH ??
  "/tmp/fortsprite-browser-provider.json"

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
        ids.map((id) => `friend-discovery:${id}`),
      ),
    )
    await db.delete(user).where(inArray(user.id, ids))
  }
  for (const path of [fixturePath, providerPath]) {
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
    await importCatalogSnapshot(catalog, { allowSourceArtwork: true })
    const baseURL = process.env.WEB_ORIGIN!
    const actors = Object.fromEntries(
      ["a", "b"].map((key, index) => {
        const userId = `${index === 0 ? "a" : "B"}${randomUUID().replaceAll("-", "")}Z`
        const token = randomUUID()
        const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
          .update(token)
          .digest("base64")
        return [
          key,
          {
            userId,
            epicId: randomUUID().replaceAll("-", ""),
            accessToken: `browser-${randomUUID()}`,
            displayName:
              index === 0 ? "Browser collector" : "Browser squadmate",
            epicDisplayName: index === 0 ? "Epic Collector" : "Epic Squadmate",
            handle: `browser_${randomUUID().slice(0, 8)}`,
            token,
            cookie: {
              name: "better-auth.session_token",
              value: encodeURIComponent(`${token}.${signature}`),
              url: baseURL,
              httpOnly: true,
              sameSite: "Lax" as const,
            },
          },
        ]
      }),
    )
    for (const actor of Object.values(actors)) {
      await db
        .insert(user)
        .values({
          id: actor.userId,
          name: actor.epicDisplayName,
          appDisplayName: actor.displayName,
          email: `${actor.userId}@test.invalid`,
          handle: actor.handle,
        })
      await db
        .insert(account)
        .values({
          id: randomUUID(),
          userId: actor.userId,
          accountId: actor.epicId,
          providerId: "epic-games",
          accessToken: actor.accessToken,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          scope: "basic_profile,friends_list",
        })
      await db
        .insert(session)
        .values({
          id: randomUUID(),
          token: actor.token,
          userId: actor.userId,
          expiresAt: new Date(Date.now() + 86_400_000),
          updatedAt: new Date(),
        })
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
    const provider = {
      accounts: Object.values(actors).map((actor) => ({
        accountId: actor.epicId,
        displayName: actor.epicDisplayName,
        accessToken: actor.accessToken,
      })),
      visibleAccountIds: [a.epicId, b.epicId],
      friendships: { [a.epicId]: [b.epicId], [b.epicId]: [a.epicId] },
      outage: false,
    }
    await writePrivate(providerPath, provider)
    await writePrivate(fixturePath, {
      userId: a.userId,
      cookie: a.cookie,
      baseURL,
      actors,
      provider,
      providerPath,
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
