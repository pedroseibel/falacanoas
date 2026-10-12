-- Nobody but the server reaches the app schema. Supabase's Data API roles (anon, authenticated) get no
-- usage and no table rights, today or for tables created later; RLS is on as a second lock.
REVOKE ALL ON SCHEMA "fala" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "fala" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "fala" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "fala" FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala" REVOKE ALL ON TABLES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala" REVOKE ALL ON SEQUENCES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "fala" REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
