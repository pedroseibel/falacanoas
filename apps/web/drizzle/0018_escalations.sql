CREATE TYPE "fala"."escalation_kind" AS ENUM('child_abuse');--> statement-breakpoint
CREATE TABLE "fala"."escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "fala"."escalation_kind" NOT NULL,
	"case_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"photo_id" uuid,
	"account_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_at" timestamp with time zone,
	"report_channel" text,
	"report_protocol" text,
	"receipt_at" timestamp with time zone,
	"purged_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "fala"."escalations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ADD COLUMN "purged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ADD COLUMN "escalation_id" uuid;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD CONSTRAINT "escalations_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "fala"."moderation_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD CONSTRAINT "escalations_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD CONSTRAINT "escalations_photo_id_item_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "fala"."item_photos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."escalations" ADD CONSTRAINT "escalations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "escalations_item_id_index" ON "fala"."escalations" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "escalations_photo_id_index" ON "fala"."escalations" USING btree ("photo_id");