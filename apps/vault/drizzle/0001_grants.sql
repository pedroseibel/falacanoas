-- Only the vault's own role reaches fala_cofre (DECISIONS round 18, Q29): not the app's role, and not
-- the Data API's anon and authenticated. The role itself is created by apps/web's 0003_roles.
REVOKE ALL ON SCHEMA "fala_cofre" FROM PUBLIC, anon, authenticated, fala_app;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "fala_cofre" FROM PUBLIC, anon, authenticated, fala_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala_cofre" REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT USAGE ON SCHEMA "fala_cofre" TO fala_cofre;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "fala_cofre" TO fala_cofre;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala_cofre" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fala_cofre;
