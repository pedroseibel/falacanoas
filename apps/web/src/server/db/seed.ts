import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { adminDatabaseUrl } from "./dev-env";
import * as schema from "./schema";
import { parseAgo, seedRows } from "./seed-model";

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
  await tx.delete(schema.threads).where(eq(schema.threads.demo, true));
  await tx.delete(schema.items).where(eq(schema.items.demo, true));
  await tx.insert(schema.items).values(rows.map((r) => r.row));
  await tx.insert(schema.itemEvents).values(rows.flatMap((r) => r.events));
  const photos = rows.flatMap((r) => r.photos);
  if (photos.length) await tx.insert(schema.itemPhotos).values(photos);

  // Bairro boards: each fixture thread and its replies, dated against the fixtures' clock.
  const boards = Object.entries(fixtures.threads).flatMap(([neighborhood, list]) =>
    list.map((t) => ({ neighborhood, t })),
  );
  const created = await tx
    .insert(schema.threads)
    .values(
      boards.map(({ neighborhood, t }) => {
        const at = parseAgo(t.ago, now) ?? now;
        const last = t.replies.map((r) => parseAgo(r.ago, now) ?? at).reduce((a, b) => (b > a ? b : a), at);
        return { neighborhood, title: t.title, authorNick: t.by, demo: true, createdAt: at, lastPostAt: last };
      }),
    )
    .returning({ id: schema.threads.id });
  const postRows = boards.flatMap(({ t }, i) =>
    t.replies.map((r) => ({
      threadId: created[i]?.id ?? "",
      text: r.text,
      authorNick: r.by,
      demo: true,
      createdAt: parseAgo(r.ago, now) ?? now,
    })),
  );
  if (postRows.length) await tx.insert(schema.posts).values(postRows);
});
console.log(`${rows.length} registros de exemplo semeados (relógio dos dados: ${fixtures.now}).`);
await client.end();
