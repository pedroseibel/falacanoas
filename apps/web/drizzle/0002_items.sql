CREATE TYPE "fala"."community_status" AS ENUM('reported', 'confirmed', 'ongoing', 'apparently_resolved', 'resolved');--> statement-breakpoint
CREATE TYPE "fala"."event_kind" AS ENUM('created', 'sent_to_authority', 'confirmed', 'update_added', 'photo_added', 'official_response', 'official_status_changed', 'community_resolved', 'reopened', 'merged', 'moderation');--> statement-breakpoint
CREATE TYPE "fala"."item_kind" AS ENUM('occurrence', 'public_issue');--> statement-breakpoint
CREATE TYPE "fala"."official_status" AS ENUM('acknowledged', 'under_review', 'scheduled', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "fala"."visibility" AS ENUM('pseudonymous', 'anonymous');--> statement-breakpoint
CREATE TABLE "fala"."item_authors" (
	"item_id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."item_authors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."item_confirmations" (
	"item_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_confirmations_item_id_account_id_pk" PRIMARY KEY("item_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "fala"."item_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."item_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "fala"."item_events_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "fala"."event_kind" NOT NULL,
	"actor" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."item_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."item_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text NOT NULL,
	"src" text NOT NULL,
	"storage_key" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text NOT NULL,
	"credit" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."items" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "fala"."item_kind" NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"neighborhood" text,
	"scope" jsonb NOT NULL,
	"lng" double precision,
	"lat" double precision,
	"visibility" "fala"."visibility" NOT NULL,
	"author_nick" text,
	"community" "fala"."community_status" DEFAULT 'reported' NOT NULL,
	"official_status" "fala"."official_status",
	"official_agency" text,
	"official_at" timestamp with time zone,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"updates" integer DEFAULT 0 NOT NULL,
	"disagreeing" integer,
	"guest" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"protocol_number" text,
	"protocol_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fala"."items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."item_authors" ADD CONSTRAINT "item_authors_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_confirmations" ADD CONSTRAINT "item_confirmations_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_events" ADD CONSTRAINT "item_events_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."item_photos" ADD CONSTRAINT "item_photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_events_item_id_at_seq_index" ON "fala"."item_events" USING btree ("item_id","at","seq");--> statement-breakpoint
CREATE INDEX "item_photos_item_id_position_index" ON "fala"."item_photos" USING btree ("item_id","position");--> statement-breakpoint
CREATE INDEX "items_category_community_index" ON "fala"."items" USING btree ("category","community");--> statement-breakpoint
CREATE INDEX "items_neighborhood_index" ON "fala"."items" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "items_updated_at_index" ON "fala"."items" USING btree ("updated_at");