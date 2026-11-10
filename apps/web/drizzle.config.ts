import { defineConfig } from "drizzle-kit";
import { adminDatabaseUrl } from "@fala/dev-vars";

/** Migrations for the app schema only: Supabase's own schemas (auth, storage, vault…) are never touched. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["fala"],
  casing: "snake_case",
  dbCredentials: { url: adminDatabaseUrl() },
  strict: true,
  verbose: true,
});
