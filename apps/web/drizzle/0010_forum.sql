CREATE TYPE "fala"."report_status" AS ENUM('open', 'hidden', 'kept');--> statement-breakpoint
CREATE TABLE "fala"."post_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid,
	"status" "fala"."report_status" DEFAULT 'open' NOT NULL,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."post_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"text" text NOT NULL,
	"author_nick" text NOT NULL,
	"account_id" uuid,
	"hidden" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fala"."threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neighborhood" text,
	"item_id" text,
	"title" text NOT NULL,
	"author_nick" text NOT NULL,
	"account_id" uuid,
	"hidden" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "threads_itemId_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "fala"."threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fala"."post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "fala"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."post_reports" ADD CONSTRAINT "post_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."post_reports" ADD CONSTRAINT "post_reports_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."posts" ADD CONSTRAINT "posts_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "fala"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."posts" ADD CONSTRAINT "posts_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."threads" ADD CONSTRAINT "threads_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "fala"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fala"."threads" ADD CONSTRAINT "threads_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "fala"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_reports_status_index" ON "fala"."post_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reports_once" ON "fala"."post_reports" USING btree ("post_id","reporter_id");--> statement-breakpoint
CREATE INDEX "posts_thread_id_created_at_index" ON "fala"."posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_neighborhood_last_post_at_index" ON "fala"."threads" USING btree ("neighborhood","last_post_at");