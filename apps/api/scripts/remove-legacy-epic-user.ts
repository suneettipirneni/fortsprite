import { resolve } from "node:path"
import { config } from "dotenv"
import { Pool } from "pg"

config({
  path: [resolve(".env"), resolve("apps/api/.env"), resolve("../api/.env")],
  quiet: true,
})

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error("DATABASE_URL is required")

const execute = process.argv.includes("--execute")
const verifyEmpty = process.argv.includes("--verify-empty")
const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query("begin")
  const counts = await client.query<{
    users: string
    accounts: string
    epic_accounts: string
    passkeys: string
  }>(`
    select
      (select count(*) from "user")::text as users,
      (select count(*) from account)::text as accounts,
      (select count(*) from account where provider_id = 'epic-games')::text as epic_accounts,
      (select count(*) from passkey)::text as passkeys
  `)
  const summary = counts.rows[0]!
  const safe =
    summary.users === "1" &&
    summary.accounts === "1" &&
    summary.epic_accounts === "1" &&
    summary.passkeys === "0"
  const empty =
    summary.users === "0" &&
    summary.accounts === "0" &&
    summary.epic_accounts === "0" &&
    summary.passkeys === "0"
  console.log(
    JSON.stringify({
      mode: execute ? "execute" : "dry-run",
      users: Number(summary.users),
      accounts: Number(summary.accounts),
      legacyEpicAccounts: Number(summary.epic_accounts),
      passkeys: Number(summary.passkeys),
      exactLegacyShape: safe,
      empty,
    }),
  )
  if (verifyEmpty) {
    if (!empty)
      throw new Error("Legacy cleanup verification found remaining auth rows")
    await client.query("rollback")
    console.log("Verified that all user, account, Epic account, and passkey rows are empty.")
  } else {
    if (!safe)
      throw new Error(
        "Refusing cleanup because the database is not exactly one Epic-only user with no passkeys",
      )
    if (!execute) {
      await client.query("rollback")
      console.log("Dry run complete. Re-run with --execute to delete the user.")
    } else {
      const deleted = await client.query(`delete from "user" returning id`)
      if (deleted.rowCount !== 1)
        throw new Error("Legacy user deletion did not affect exactly one row")
      await client.query("commit")
      console.log("Deleted the sole legacy Epic-only FortSprite user.")
    }
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined)
  throw error
} finally {
  client.release()
  await pool.end()
}
