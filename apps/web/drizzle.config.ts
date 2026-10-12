import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/** The connection string from the environment, or from the gitignored .dev.vars in development. */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    return (
      readFileSync(".dev.vars", "utf8")
        .match(/^DATABASE_URL=(.+)$/m)?.[1]
        ?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

/** Migrations for the app schema only: Supabase's own schemas (auth, storage, vault…) are never touched. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["fala"],
  casing: "snake_case",
  dbCredentials: { url: databaseUrl() },
  strict: true,
  verbose: true,
});
