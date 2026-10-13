CREATE TABLE "fala_cofre"."phone_changes" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"ticket_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"sends" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"hint" text,
	CONSTRAINT "phone_changes_ticketHash_unique" UNIQUE("ticket_hash"),
	CONSTRAINT "phone_changes_sends" CHECK ("fala_cofre"."phone_changes"."sends" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."phone_changes" ENABLE ROW LEVEL SECURITY;