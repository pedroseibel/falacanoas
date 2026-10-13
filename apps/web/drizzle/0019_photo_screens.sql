CREATE TABLE "fala"."photo_screens" (
	"storage_key" text PRIMARY KEY NOT NULL,
	"nudity" double precision NOT NULL,
	"faces" integer NOT NULL,
	"plates" integer NOT NULL,
	"screened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fala"."photo_screens" ENABLE ROW LEVEL SECURITY;