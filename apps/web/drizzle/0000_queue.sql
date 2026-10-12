CREATE SCHEMA "fala";
--> statement-breakpoint
CREATE TYPE "fala"."signup_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TABLE "fala"."queue_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neighborhood" text NOT NULL,
	"channel" "fala"."signup_channel" NOT NULL,
	"contact" text NOT NULL,
	"help" text[] DEFAULT '{}'::text[] NOT NULL,
	"code" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_signups_contact_unique" UNIQUE("contact"),
	CONSTRAINT "queue_signups_code" CHECK ("fala"."queue_signups"."code" ~ '^[A-Z0-9]{4}$'),
	CONSTRAINT "queue_signups_help" CHECK ("fala"."queue_signups"."help" <@ array['moderar','codigo','divulgar']::text[])
);
--> statement-breakpoint
ALTER TABLE "fala"."queue_signups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "queue_signups_neighborhood_index" ON "fala"."queue_signups" USING btree ("neighborhood");