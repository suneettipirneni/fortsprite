import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { user } from "./auth-schema.ts"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}

export const releaseStatus = pgEnum("release_status", [
  "unreleased",
  "released",
  "retired",
])

export const friendshipStatus = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "declined",
])

export const sprites = pgTable(
  "sprites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableKey: text("stable_key").notNull(),
    slug: text("slug").notNull(),
    baseName: text("base_name").notNull(),
    variantName: text("variant_name").notNull(),
    sourceVariant: text("source_variant").default("Base").notNull(),
    season: text("season"),
    sourceSeasonId: integer("source_season_id"),
    rarity: text("rarity").notNull(),
    imageUrl: text("image_url"),
    sourceName: text("source_name"),
    sourceLocalPath: text("source_local_path"),
    sourceImage: text("source_image"),
    sourceSummonCost: text("source_summon_cost"),
    imageApproval: jsonb("image_approval").$type<{
      imagePath: string
      sourceUrl: string
      usageBasis: string
      approvedAt: string
    }>(),
    releaseStatus: releaseStatus("release_status")
      .default("unreleased")
      .notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    description: text("description"),
    descriptionLines: jsonb("description_lines")
      .$type<string[]>()
      .default([])
      .notNull(),
    dropChances: jsonb("drop_chances")
      .$type<{ source: string; percent: string }[]>()
      .default([])
      .notNull(),
    levelProgression: text("level_progression"),
    location: text("location"),
    spriteDustValue: integer("sprite_dust_value"),
    dropChancePercent: numeric("drop_chance_percent"),
    sourceUrl: text("source_url").notNull(),
    sourceVerifiedAt: timestamp("source_verified_at", {
      withTimezone: true,
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sprites_stable_key_unique").on(table.stableKey),
    uniqueIndex("sprites_slug_unique").on(table.slug),
    index("sprites_catalog_order_idx").on(
      table.releaseStatus,
      table.displayOrder,
    ),
    check(
      "sprites_dust_value_nonnegative_check",
      sql`${table.spriteDustValue} is null or ${table.spriteDustValue} >= 0`,
    ),
    check(
      "sprites_drop_chance_range_check",
      sql`${table.dropChancePercent} is null or (${table.dropChancePercent} >= 0 and ${table.dropChancePercent} <= 100)`,
    ),
  ],
)

export const collectionEntries = pgTable(
  "collection_entries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    spriteId: uuid("sprite_id")
      .notNull()
      .references(() => sprites.id, { onDelete: "restrict" }),
    owned: boolean("owned").default(true).notNull(),
    mastered: boolean("mastered").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.spriteId] }),
    index("collection_entries_sprite_owned_idx").on(
      table.spriteId,
      table.owned,
    ),
    check(
      "collection_entries_mastered_requires_owned_check",
      sql`not ${table.mastered} or ${table.owned}`,
    ),
  ],
)

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userLowId: text("user_low_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userHighId: text("user_high_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedById: text("requested_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: friendshipStatus("status").default("pending").notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("friendships_user_pair_unique").on(
      table.userLowId,
      table.userHighId,
    ),
    index("friendships_user_low_status_idx").on(table.userLowId, table.status),
    index("friendships_user_high_status_idx").on(
      table.userHighId,
      table.status,
    ),
    check(
      "friendships_canonical_pair_check",
      sql`${table.userLowId} collate "C" < ${table.userHighId} collate "C"`,
    ),
    check(
      "friendships_requester_is_member_check",
      sql`${table.requestedById} in (${table.userLowId}, ${table.userHighId})`,
    ),
  ],
)

export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("blocks_blocked_id_idx").on(table.blockedId),
    check(
      "blocks_not_self_check",
      sql`${table.blockerId} <> ${table.blockedId}`,
    ),
  ],
)
