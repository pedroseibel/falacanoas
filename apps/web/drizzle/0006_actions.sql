CREATE TYPE "fala"."vote_kind" AS ENUM('still', 'resolved');--> statement-breakpoint
CREATE TABLE "fala"."item_follows" (
	"item_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_follows_item_id_account_id_pk" PRIMARY KEY("item_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "fala"."item_follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."item_votes" (
	"item_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "fala"."vote_kind" NOT NULL,
	"slot" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_votes_item_id_account_id_kind_slot_pk" PRIMARY KEY("item_id","account_id","kind","slot")
);
--> statement-breakpoint
ALTER TABLE "fala"."item_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "resolved_votes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "resolving_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD COLUMN "round" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fala"."item_follows" ADD CONSTRAINT "item_follows_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_follows" ADD CONSTRAINT "item_follows_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_votes" ADD CONSTRAINT "item_votes_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_votes" ADD CONSTRAINT "item_votes_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_follows_account_id_index" ON "fala"."item_follows" USING btree ("account_id");