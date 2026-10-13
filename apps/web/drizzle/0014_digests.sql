CREATE TABLE "fala"."digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"recipients" text[] NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"item_ids" text[] NOT NULL,
	"transport" text NOT NULL,
	"message_id" text
);
--> statement-breakpoint
ALTER TABLE "fala"."digests" ENABLE ROW LEVEL SECURITY;