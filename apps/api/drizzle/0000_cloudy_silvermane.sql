CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('unreleased', 'released', 'retired');--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "blocks_not_self_check" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"user_id" text NOT NULL,
	"sprite_id" uuid NOT NULL,
	"owned" boolean DEFAULT true NOT NULL,
	"mastered" boolean DEFAULT false NOT NULL,
	"can_help" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_entries_user_id_sprite_id_pk" PRIMARY KEY("user_id","sprite_id"),
	CONSTRAINT "collection_entries_help_requires_owned_check" CHECK (not "collection_entries"."can_help" or "collection_entries"."owned"),
	CONSTRAINT "collection_entries_mastered_requires_owned_check" CHECK (not "collection_entries"."mastered" or "collection_entries"."owned")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_low_id" text NOT NULL,
	"user_high_id" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_canonical_pair_check" CHECK ("friendships"."user_low_id" < "friendships"."user_high_id"),
	CONSTRAINT "friendships_requester_is_member_check" CHECK ("friendships"."requested_by_id" in ("friendships"."user_low_id", "friendships"."user_high_id"))
);
--> statement-breakpoint
CREATE TABLE "sprites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" text NOT NULL,
	"slug" text NOT NULL,
	"base_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"rarity" text NOT NULL,
	"image_url" text,
	"release_status" "release_status" DEFAULT 'unreleased' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"description" text,
	"location" text,
	"summon_cost" integer,
	"drop_chance_percent" numeric(7, 4),
	"source_url" text NOT NULL,
	"source_verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sprites_summon_cost_nonnegative_check" CHECK ("sprites"."summon_cost" is null or "sprites"."summon_cost" >= 0),
	CONSTRAINT "sprites_drop_chance_range_check" CHECK ("sprites"."drop_chance_percent" is null or ("sprites"."drop_chance_percent" >= 0 and "sprites"."drop_chance_percent" <= 100))
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"handle" text NOT NULL,
	"fortnite_display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_handle_format_check" CHECK ("user"."handle" ~ '^[A-Za-z0-9_-]{3,24}$')
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_sprite_id_sprites_id_fk" FOREIGN KEY ("sprite_id") REFERENCES "public"."sprites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_low_id_user_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_high_id_user_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_blocked_id_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "collection_entries_sprite_help_idx" ON "collection_entries" USING btree ("sprite_id","owned","can_help");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_user_pair_unique" ON "friendships" USING btree ("user_low_id","user_high_id");--> statement-breakpoint
CREATE INDEX "friendships_user_low_status_idx" ON "friendships" USING btree ("user_low_id","status");--> statement-breakpoint
CREATE INDEX "friendships_user_high_status_idx" ON "friendships" USING btree ("user_high_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sprites_stable_key_unique" ON "sprites" USING btree ("stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sprites_slug_unique" ON "sprites" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sprites_catalog_order_idx" ON "sprites" USING btree ("release_status","display_order");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_handle_normalized_unique" ON "user" USING btree (lower("handle"));--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");