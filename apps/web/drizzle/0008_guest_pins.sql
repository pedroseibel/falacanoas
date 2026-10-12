CREATE TYPE "fala"."moderation_state" AS ENUM('published', 'pending', 'rejected');--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "moderation" "fala"."moderation_state" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "tracking_key_hash" text;