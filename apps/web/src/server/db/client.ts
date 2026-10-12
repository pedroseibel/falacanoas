import { getRequest } from "@tanstack/react-start/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const perRequest = new WeakMap<Request, Promise<Db>>();

function connectionString(): string {
  // Production reads a Hyperdrive binding here (BUILD.md 4.5); development uses the Supabase pooler.
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada: veja apps/web/.dev.vars.example.");
  return url;
}

async function connect(): Promise<Db> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  return drizzle(client, { schema, casing: "snake_case" });
}

/**
 * The database for the current request. Workers can't share a socket between requests, so each
 * request opens one connection, reused by everything that runs inside it; the runtime closes it when
 * the request ends. Call only inside server functions and server routes.
 */
export function db(): Promise<Db> {
  const request = getRequest();
  let pending = perRequest.get(request);
  if (!pending) {
    pending = connect();
    perRequest.set(request, pending);
  }
  return pending;
}
