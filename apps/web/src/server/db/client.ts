import { getRequest } from "@tanstack/react-start/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

function connectionString(): string {
  // Production reads a Hyperdrive binding here (BUILD.md 4.5); development uses the Supabase pooler.
  // Either way the role is fala_app: the fala schema, nothing of the vault's.
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada: veja apps/web/.dev.vars.example.");
  return url;
}

/** Opens a connection and returns at once: node-postgres queues queries until it's ready. */
function open(): Db {
  const client = new Client({ connectionString: connectionString() });
  // A failed connection rejects every queued query, which is where the error surfaces.
  client.connect().catch(() => undefined);
  return drizzle(client, { schema, casing: "snake_case" });
}

const perRequest = new WeakMap<Request, Db>();

function currentRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

/** Never queried: only answers property reads made while modules load (Better Auth reads the schema). */
const idle = drizzle(new Client(), { schema, casing: "snake_case" });

/**
 * The database. Workers can't share a socket between requests, so each request gets its own
 * connection, opened on first use and closed by the runtime when the request ends. This object stands
 * for "the current request's connection", so it can be handed to libraries at load time (Better Auth's
 * adapter) and used anywhere inside server functions and server routes.
 */
export const db: Db = new Proxy(idle, {
  get(_target, prop) {
    const request = currentRequest();
    let current = request ? perRequest.get(request) : idle;
    if (request && !current) {
      current = open();
      perRequest.set(request, current);
    }
    const target = current ?? idle;
    const value: unknown = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
