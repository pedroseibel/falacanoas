CREATE TABLE "fala"."monthly_reports" (
	"month" text PRIMARY KEY NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"figures" jsonb NOT NULL,
	"pdf" "bytea" NOT NULL,
	"pdf_sha256" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."monthly_reports" ENABLE ROW LEVEL SECURITY;