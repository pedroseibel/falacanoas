import { existsSync, readFileSync } from "node:fs";

/**
 * For tools that run outside the Worker (drizzle-kit, the seed, db:roles): a variable from the
 * environment, or from a gitignored .dev.vars in development.
 */
export function devVar(name: string, file = ".dev.vars"): string {
  const env = process.env[name];
  if (env) return env;
  if (!existsSync(file)) return "";
  return (
    readFileSync(file, "utf8")
      .match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]
      ?.trim() ?? ""
  );
}

/**
 * The admin connection (the `postgres` role): migrations, seeding and db:roles, never the app. Before
 * db:roles has run, DATABASE_URL may still be that role, and then it serves.
 */
export function adminDatabaseUrl(file = ".dev.vars"): string {
  const admin = devVar("DATABASE_ADMIN_URL", file);
  if (admin) return admin;
  const app = devVar("DATABASE_URL", file);
  return app && new URL(app).username.startsWith("postgres") ? app : "";
}
