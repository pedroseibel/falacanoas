import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Development's settings for everything that runs outside the two Workers (the Bun services, the
 * migrations, the seed, the command-line tools): connection strings and tokens live in the Workers'
 * gitignored .dev.vars files, and are read from there. Node only: never import this from a Worker.
 */

export const WEB_DEV_VARS = fileURLToPath(new URL("../../../apps/web/.dev.vars", import.meta.url));
export const VAULT_DEV_VARS = fileURLToPath(new URL("../../../apps/vault/.dev.vars", import.meta.url));

/** A variable from a .dev.vars file; "" when the file or the variable isn't there. */
export function fromDevVars(file: string, name: string): string {
  if (!existsSync(file)) return "";
  return (
    readFileSync(file, "utf8")
      .match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]
      ?.trim() ?? ""
  );
}

/** A variable from the environment, or else from a .dev.vars file (the web app's, unless another is named). */
export const devVar = (name: string, file = WEB_DEV_VARS): string => process.env[name] || fromDevVars(file, name);

/**
 * The admin connection (the `postgres` role): migrations, seeding and db:roles, never the app. Before
 * db:roles has run, DATABASE_URL may still be that role, and then it serves.
 */
export function adminDatabaseUrl(): string {
  const admin = devVar("DATABASE_ADMIN_URL");
  if (admin) return admin;
  const app = devVar("DATABASE_URL");
  return app && new URL(app).username.startsWith("postgres") ? app : "";
}

export const serviceMode = (
  env: Record<string, string | undefined>,
  modeVariable: string,
): "development" | "production" =>
  env[modeVariable] === "production" || env.NODE_ENV === "production" ? "production" : "development";
