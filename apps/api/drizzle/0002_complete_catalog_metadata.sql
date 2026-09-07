ALTER TABLE "sprites" ALTER COLUMN "drop_chance_percent" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_variant" text DEFAULT 'Base' NOT NULL;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "season" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_season_id" integer;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_local_path" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_image" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "source_summon_cost" text;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "image_approval" jsonb;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "description_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sprites" ADD COLUMN "drop_chances" jsonb DEFAULT '[]'::jsonb NOT NULL;