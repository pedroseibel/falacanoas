import { canoas } from "@fala/instance-canoas";
import { and, arrayContains, asc, count, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { adminDatabaseUrl } from "./dev-env";
import * as schema from "./schema";

/**
 * Who moderates is an operator's decision (the associação's, once it exists), recorded with who decided.
 *
 *   bun run moderator:add <apelido> [bairro…]       moderates those bairros (none: every bairro)
 *   bun run moderator:remove <apelido>
 *   bun --filter @fala/web moderator applications   members who asked, from Você
 *   bun --filter @fala/web moderator approve <apelido> [bairro…]   (default: the bairros they asked for)
 *   bun --filter @fala/web moderator decline <apelido> <nota…>
 *   bun --filter @fala/web moderator volunteers     waitlist sign-ups that offered to moderate, per bairro
 *
 * A new moderator accepts the moderation guide on their first visit to /moderar.
 */
const USAGE =
  "Uso: moderator add <apelido> [bairro…] | remove <apelido> | applications | approve <apelido> [bairro…] | decline <apelido> <nota…> | volunteers";
const [command, nick, ...rest] = process.argv.slice(2);
if (!command || !["add", "remove", "applications", "approve", "decline", "volunteers"].includes(command))
  throw new Error(USAGE);

const client = new Client({ connectionString: adminDatabaseUrl() });
await client.connect();
const db = drizzle(client, { schema, casing: "snake_case" });
const operator = process.env.USER ?? "operador";
const name = (slug: string) => canoas.neighborhoods.find((n) => n.slug === slug)?.name ?? slug;

async function account(n: string | undefined) {
  if (!n) throw new Error(USAGE);
  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.nick, n));
  if (!user) throw new Error(`Nenhuma conta com o apelido ${n}.`);
  return user.id;
}

async function makeModerator(accountId: string, bairros: string[]) {
  const unknown = bairros.filter((b) => !canoas.neighborhoods.some((n) => n.slug === b));
  if (unknown.length) throw new Error(`Bairro desconhecido: ${unknown.join(", ")}`);
  await db
    .insert(schema.moderators)
    .values({ accountId, neighborhoods: bairros.length ? bairros : null, addedBy: operator })
    .onConflictDoUpdate({
      target: schema.moderators.accountId,
      set: { neighborhoods: bairros.length ? bairros : null },
    });
}

if (command === "add") {
  await makeModerator(await account(nick), rest);
  console.log(`${nick} modera ${rest.length ? rest.map(name).join(", ") : "todos os bairros"}.`);
} else if (command === "remove") {
  await db.delete(schema.moderators).where(eq(schema.moderators.accountId, await account(nick)));
  console.log(`${nick} não modera mais.`);
} else if (command === "applications") {
  const rows = await db
    .select({
      nick: schema.users.nick,
      home: schema.users.neighborhood,
      neighborhoods: schema.moderatorApplications.neighborhoods,
      note: schema.moderatorApplications.note,
      createdAt: schema.moderatorApplications.createdAt,
    })
    .from(schema.moderatorApplications)
    .innerJoin(schema.users, eq(schema.users.id, schema.moderatorApplications.accountId))
    .where(eq(schema.moderatorApplications.status, "pending"))
    .orderBy(asc(schema.moderatorApplications.createdAt));
  for (const r of rows)
    console.log(
      `${r.nick ?? "—"}  (mora em ${r.home ? name(r.home) : "?"}) quer moderar ${r.neighborhoods.map(name).join(", ")}  em ${r.createdAt.toISOString().slice(0, 10)}${r.note ? `\n    “${r.note}”` : ""}`,
    );
  if (!rows.length) console.log("Nenhum pedido esperando.");
} else if (command === "approve" || command === "decline") {
  const accountId = await account(nick);
  const [app] = await db
    .select()
    .from(schema.moderatorApplications)
    .where(
      and(eq(schema.moderatorApplications.accountId, accountId), eq(schema.moderatorApplications.status, "pending")),
    );
  if (!app) throw new Error(`${nick} não tem pedido esperando.`);
  if (command === "approve") {
    const bairros = rest.length ? rest : app.neighborhoods;
    await makeModerator(accountId, bairros);
    await db
      .update(schema.moderatorApplications)
      .set({ status: "approved", decidedAt: new Date(), decidedBy: operator })
      .where(eq(schema.moderatorApplications.id, app.id));
    console.log(`${nick} modera ${bairros.map(name).join(", ")}. Na primeira visita a /moderar, aceita o guia.`);
  } else {
    if (!rest.length) throw new Error(USAGE);
    await db
      .update(schema.moderatorApplications)
      .set({ status: "declined", decidedAt: new Date(), decidedBy: operator, decisionNote: rest.join(" ") })
      .where(eq(schema.moderatorApplications.id, app.id));
    console.log(`Pedido de ${nick} recusado. A pessoa vê em Você que não foi aceito desta vez.`);
  }
} else if (command === "volunteers") {
  // Counts only: the contacts are for confirming the sign-up, and reaching out waits on the senders.
  const rows = await db
    .select({ neighborhood: schema.queueSignups.neighborhood, n: count() })
    .from(schema.queueSignups)
    .where(and(arrayContains(schema.queueSignups.help, ["moderar"]), isNotNull(schema.queueSignups.confirmedAt)))
    .groupBy(schema.queueSignups.neighborhood);
  for (const r of rows.toSorted((a, b) => b.n - a.n)) console.log(`${name(r.neighborhood).padEnd(28)} ${r.n}`);
  if (!rows.length) console.log("Ninguém da fila confirmada se ofereceu para moderar ainda.");
}
await client.end();
