-- Sessions stop recording IP and browser (the vault keeps the access evidence, round 18 Q21): clear
-- what earlier sessions stored, and the rate-limit rows (keyed by IP) older than a day.
UPDATE "fala"."sessions" SET "ip_address" = NULL, "user_agent" = NULL;--> statement-breakpoint
DELETE FROM "fala"."rate_limits" WHERE "last_request" < (extract(epoch from now()) * 1000)::bigint - 86400000;
