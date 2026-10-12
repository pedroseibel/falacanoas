CREATE TYPE "fala_cofre"."evidence_action" AS ENUM('sign_in', 'publication', 'confirmation', 'comment', 'guest_pin');--> statement-breakpoint
CREATE TABLE "fala_cofre"."access_evidence" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "fala_cofre"."evidence_action" NOT NULL,
	"account_id" uuid,
	"item_id" text,
	"client_ip" text,
	"client_port" integer,
	"ip_version" smallint,
	"edge_ip" text,
	"edge_port" integer,
	"transport" text,
	"cf_ray" text,
	"at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."access_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala_cofre"."preservation_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"grounds" text NOT NULL,
	"account_id" uuid,
	"item_id" text,
	"covers_from" timestamp with time zone,
	"covers_to" timestamp with time zone,
	"requested_at" timestamp with time zone NOT NULL,
	"court_order_sought_at" timestamp with time zone,
	"refused_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preservation_holds_scope" CHECK ("fala_cofre"."preservation_holds"."account_id" is not null or "fala_cofre"."preservation_holds"."item_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "fala_cofre"."preservation_holds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "access_evidence_at_index" ON "fala_cofre"."access_evidence" USING btree ("at");--> statement-breakpoint
CREATE INDEX "access_evidence_account_id_at_index" ON "fala_cofre"."access_evidence" USING btree ("account_id","at");--> statement-breakpoint
CREATE INDEX "access_evidence_item_id_index" ON "fala_cofre"."access_evidence" USING btree ("item_id");