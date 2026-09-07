ALTER TABLE "collection_entries" DROP CONSTRAINT "collection_entries_help_requires_owned_check";--> statement-breakpoint
DROP INDEX "collection_entries_sprite_help_idx";--> statement-breakpoint
CREATE INDEX "collection_entries_sprite_owned_idx" ON "collection_entries" USING btree ("sprite_id","owned");--> statement-breakpoint
ALTER TABLE "collection_entries" DROP COLUMN "can_help";