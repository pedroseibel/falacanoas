ALTER TABLE "fala"."escalations" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD COLUMN "source" text DEFAULT 'moderation' NOT NULL;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD COLUMN "match_class" text;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD COLUMN "match_type" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "pdq" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "pdq_quality" integer;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_match" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_db_version" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_review" text;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ADD COLUMN "known_review_note" text;