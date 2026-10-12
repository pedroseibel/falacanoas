CREATE TYPE "fala"."case_reason" AS ENUM('guest_pin', 'prescreen');--> statement-breakpoint
CREATE TYPE "fala"."case_status" AS ENUM('open', 'published', 'rejected', 'republish');--> statement-breakpoint
CREATE TYPE "fala"."contest_status" AS ENUM('open', 'upheld', 'overturned');--> statement-breakpoint
CREATE TABLE "fala"."moderation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text NOT NULL,
	"reason" "fala"."case_reason" NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "fala"."case_status" DEFAULT 'open' NOT NULL,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"contest_text" text,
	"contested_at" timestamp with time zone,
	"contest_status" "fala"."contest_status",
	"contest_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."moderators" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"neighborhoods" text[],
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."moderators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "moderation_handle" text;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD CONSTRAINT "moderation_cases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD CONSTRAINT "moderation_cases_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."moderators" ADD CONSTRAINT "moderators_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_cases_status_index" ON "fala"."moderation_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_cases_item_id_index" ON "fala"."moderation_cases" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "fala"."items" ADD CONSTRAINT "items_moderationHandle_unique" UNIQUE("moderation_handle");