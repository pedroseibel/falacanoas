CREATE TYPE "fala"."photo_review" AS ENUM('pending', 'approved', 'removed');--> statement-breakpoint
CREATE TYPE "fala"."report_reason" AS ENUM('sexual', 'child', 'person', 'offense', 'spam', 'other');--> statement-breakpoint
ALTER TYPE "fala"."case_reason" ADD VALUE 'photo';--> statement-breakpoint
ALTER TYPE "fala"."case_reason" ADD VALUE 'report';--> statement-breakpoint
ALTER TYPE "fala"."case_reason" ADD VALUE 'takedown';--> statement-breakpoint
CREATE TABLE "fala"."content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"reason" "fala"."report_reason" NOT NULL,
	"note" text,
	"reporter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."content_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."item_events" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "fala"."item_events" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ADD COLUMN "review" "fala"."photo_review" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- Photos already up went up before this review existed (the demo's, and development data): they stay
-- up. Every photo sent from now on starts pending.
UPDATE "fala"."item_photos" SET "review" = 'approved';--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD COLUMN "photo_id" uuid;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "fala"."content_reports" ADD CONSTRAINT "content_reports_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "fala"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_reports_case_id_index" ON "fala"."content_reports" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_once" ON "fala"."content_reports" USING btree ("case_id","reporter_id");--> statement-breakpoint
ALTER TABLE "fala"."item_events" ADD CONSTRAINT "item_events_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ADD CONSTRAINT "item_photos_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD CONSTRAINT "moderation_cases_photo_id_item_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "fala"."item_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD CONSTRAINT "moderation_cases_event_id_item_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "fala"."item_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_photos_storage_key_index" ON "fala"."item_photos" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "moderation_cases_photo_id_index" ON "fala"."moderation_cases" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "moderation_cases_event_id_index" ON "fala"."moderation_cases" USING btree ("event_id");