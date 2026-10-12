import { defineConfig } from "drizzle-kit";
import { adminDatabaseUrl } from "../web/src/server/db/dev-env";

/** Migrations run with the admin connection (kept in apps/web/.dev.vars); the vault connects with its own role. */
const adminUrl = () => adminDatabaseUrl("../web/.dev.vars");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  schemaFilter: ["fala_cofre"],
  casing: "snake_case",
  // Its own history table, apart from the app's.
  migrations: { schema: "drizzle", table: "cofre_migrations" },
  dbCredentials: { url: adminUrl() },
  strict: true,
  verbose: true,
});
