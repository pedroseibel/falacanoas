CREATE TYPE "fala"."application_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "fala"."moderator_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"neighborhoods" text[] NOT NULL,
	"note" text,
	"status" "fala"."application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decision_note" text
);
--> statement-breakpoint
ALTER TABLE "fala"."moderator_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."moderators" ADD COLUMN "guide_version" text;--> statement-breakpoint
ALTER TABLE "fala"."moderators" ADD COLUMN "guide_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."moderators" ADD COLUMN "alerted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."moderator_applications" ADD CONSTRAINT "moderator_applications_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "moderator_applications_account_id_index" ON "fala"."moderator_applications" USING btree ("account_id") WHERE "fala"."moderator_applications"."status" = 'pending';