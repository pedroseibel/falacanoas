import { readFileSync } from "node:fs";

/**
 * For tools that run outside the Worker (drizzle-kit, the seed): the connection string from the
 * environment, or from the gitignored .dev.vars in development.
 */
export function databaseUrl(): string {
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
