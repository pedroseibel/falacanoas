import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { adminDatabaseUrl } from "./dev-env";
import * as schema from "./schema";
import { seedRows } from "./seed-model";

/**
 * `bun run db:seed`: replaces the fictional demo items (demo = true) with the fixtures, dated against
 * the fixtures' own clock. Real reports are never touched; anything people added to a demo item
 * (confirmations, photos) goes with it.
 */
const url = adminDatabaseUrl();
if (!url) throw new Error("DATABASE_ADMIN_URL não configurada: veja apps/web/.dev.vars.example.");

const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema, casing: "snake_case" });
const now = new Date(fixtures.now);
const rows = fixtures.items.map((item) => seedRows(item, now, canoas));

await db.transaction(async (tx) => {
  await tx.delete(schema.items).where(eq(schema.items.demo, true));
  await tx.insert(schema.items).values(rows.map((r) => r.row));
  await tx.insert(schema.itemEvents).values(rows.flatMap((r) => r.events));
  const photos = rows.flatMap((r) => r.photos);
  if (photos.length) await tx.insert(schema.itemPhotos).values(photos);
});
console.log(`${rows.length} registros de exemplo semeados (relógio dos dados: ${fixtures.now}).`);
await client.end();
