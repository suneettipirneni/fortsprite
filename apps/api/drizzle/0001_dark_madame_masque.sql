ALTER TABLE "sprites" RENAME COLUMN "summon_cost" TO "sprite_dust_value";--> statement-breakpoint
ALTER TABLE "sprites" DROP CONSTRAINT "sprites_summon_cost_nonnegative_check";--> statement-breakpoint
ALTER TABLE "sprites" ALTER COLUMN "drop_chance_percent" SET DATA TYPE numeric(12, 6);--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "level_progression" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD CONSTRAINT "sprites_dust_value_nonnegative_check" CHECK ("sprites"."sprite_dust_value" is null or "sprites"."sprite_dust_value" >= 0);