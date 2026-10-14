ALTER TABLE "fala"."items" ADD COLUMN "client_key" uuid;--> statement-breakpoint
ALTER TABLE "fala"."items" ADD CONSTRAINT "items_clientKey_unique" UNIQUE("client_key");