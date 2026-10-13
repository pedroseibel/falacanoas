CREATE TYPE "fala"."request_kind" AS ENUM('access', 'copy', 'correction', 'content', 'deletion', 'objection', 'other');--> statement-breakpoint
CREATE TYPE "fala"."request_proof" AS ENUM('session', 'tracking_key');--> statement-breakpoint
CREATE TYPE "fala"."request_status" AS ENUM('open', 'answered');--> statement-breakpoint
CREATE TYPE "fala"."requester" AS ENUM('account', 'guest', 'in_content', 'former', 'other');--> statement-breakpoint
CREATE TABLE "fala"."data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol" text NOT NULL,
	"requester" "fala"."requester" NOT NULL,
	"kind" "fala"."request_kind" NOT NULL,
	"item_id" text,
	"proof" "fala"."request_proof",
	"text" text NOT NULL,
	"contact" text NOT NULL,
	"account_id" uuid,
	"status" "fala"."request_status" DEFAULT 'open' NOT NULL,
	"answered_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_requests_protocol_unique" UNIQUE("protocol")
);
--> statement-breakpoint
ALTER TABLE "fala"."data_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."data_requests" ADD CONSTRAINT "data_requests_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_requests_status_created_at_index" ON "fala"."data_requests" USING btree ("status","created_at");