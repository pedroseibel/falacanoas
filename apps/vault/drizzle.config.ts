import { defineConfig } from "drizzle-kit";
import { adminDatabaseUrl } from "@fala/dev-vars";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  schemaFilter: ["fala_cofre"],
  casing: "snake_case",
  // Its own history table, apart from the app's.
  migrations: { schema: "drizzle", table: "cofre_migrations" },
  // The admin connection (kept in apps/web/.dev.vars); the vault itself connects with its own role.
  dbCredentials: { url: adminDatabaseUrl() },
  strict: true,
  verbose: true,
});
