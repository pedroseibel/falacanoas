CREATE TYPE "fala"."reply_status" AS ENUM('applied', 'review', 'dismissed');--> statement-breakpoint
CREATE TABLE "fala"."digest_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"message_id" text NOT NULL,
	"digest_id" uuid,
	"from_address" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"reading" jsonb NOT NULL,
	"trusted" boolean NOT NULL,
	"status" "fala"."reply_status" NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	CONSTRAINT "digest_replies_messageId_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "fala"."digest_replies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."digest_replies" ADD CONSTRAINT "digest_replies_digest_id_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "fala"."digests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "digest_replies_status_index" ON "fala"."digest_replies" USING btree ("status");