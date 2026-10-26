CREATE TABLE "fala"."rain_readings" (
	"gauge" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"last" numeric(6, 1),
	"acc1h" numeric(6, 1) NOT NULL,
	"acc3h" numeric(6, 1) NOT NULL,
	"acc6h" numeric(6, 1) NOT NULL,
	"acc12h" numeric(6, 1) NOT NULL,
	"acc24h" numeric(6, 1) NOT NULL,
	"acc48h" numeric(6, 1) NOT NULL,
	"acc72h" numeric(6, 1) NOT NULL,
	"acc96h" numeric(6, 1) NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rain_readings_gauge_observed_at_pk" PRIMARY KEY("gauge","observed_at")
);
--> statement-breakpoint
ALTER TABLE "fala"."rain_readings" ENABLE ROW LEVEL SECURITY;