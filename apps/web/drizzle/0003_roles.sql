-- Database roles (DECISIONS round 18, Q29): the app and the identity vault each connect with their own
-- role, and neither can read the other's schema. Created without LOGIN here; `bun run db:roles` sets
-- their passwords from the connection strings, which never enter git.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fala_app') THEN
    CREATE ROLE fala_app NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fala_cofre') THEN
    CREATE ROLE fala_cofre NOLOGIN BYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint
-- RLS stays on with no policies, which keeps anon and authenticated out; these roles bypass it and
-- get only the grants below.
GRANT USAGE ON SCHEMA "fala" TO fala_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "fala" TO fala_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "fala" TO fala_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fala_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala" GRANT USAGE, SELECT ON SEQUENCES TO fala_app;--> statement-breakpoint
REVOKE ALL ON SCHEMA "fala" FROM fala_cofre;
