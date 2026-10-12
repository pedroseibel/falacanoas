CREATE SCHEMA "fala_cofre";
--> statement-breakpoint
CREATE TABLE "fala_cofre"."codes" (
	"phone_mac" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codes_attempts" CHECK ("fala_cofre"."codes"."attempts" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala_cofre"."hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala_cofre"."phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"phone_mac" text NOT NULL,
	"phone_sealed" text NOT NULL,
	"key_version" integer NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"last_sign_in_at" timestamp with time zone NOT NULL,
	"unlinked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."phones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "hits_key_at_index" ON "fala_cofre"."hits" USING btree ("key","at");--> statement-breakpoint
CREATE UNIQUE INDEX "phones_live_mac" ON "fala_cofre"."phones" USING btree ("phone_mac") WHERE "fala_cofre"."phones"."unlinked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "phones_live_account" ON "fala_cofre"."phones" USING btree ("account_id") WHERE "fala_cofre"."phones"."unlinked_at" is null;