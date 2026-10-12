CREATE TABLE "fala"."follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"place" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."follows" ADD CONSTRAINT "follows_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_account_id_index" ON "fala"."follows" USING btree ("account_id");