CREATE TYPE "fala"."removal_weight" AS ENUM('none', 'strike', 'grave');--> statement-breakpoint
CREATE TYPE "fala"."sanction_kind" AS ENUM('mute', 'suspend');--> statement-breakpoint
CREATE TYPE "fala"."sanction_source" AS ENUM('auto', 'moderator', 'controller');--> statement-breakpoint
ALTER TYPE "fala"."case_reason" ADD VALUE 'muted';--> statement-breakpoint
CREATE TABLE "fala"."sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "fala"."sanction_kind" NOT NULL,
	"source" "fala"."sanction_source" NOT NULL,
	"reason" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" uuid,
	"lifted_at" timestamp with time zone,
	"lifted_by" uuid,
	"lift_note" text,
	"contest_text" text,
	"contested_at" timestamp with time zone,
	"contest_status" "fala"."contest_status",
	"contest_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."moderation_cases" ADD COLUMN "weight" "fala"."removal_weight" DEFAULT 'strike' NOT NULL;--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ADD CONSTRAINT "sanctions_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ADD CONSTRAINT "sanctions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ADD CONSTRAINT "sanctions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."sanctions" ADD CONSTRAINT "sanctions_lifted_by_users_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sanctions_account_id_index" ON "fala"."sanctions" USING btree ("account_id");