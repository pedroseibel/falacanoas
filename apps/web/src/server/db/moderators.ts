import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { adminDatabaseUrl } from "./dev-env";
import * as schema from "./schema";

/**
 * `bun run moderator:add <apelido> [bairro…]` and `bun run moderator:remove <apelido>`: who moderates
 * is an operator's decision (the associação's, once it exists), recorded with who added them. With no
 * bairros, the person moderates every bairro.
 */
const [command, nick, ...bairros] = process.argv.slice(2);
if (!command || !nick || !["add", "remove"].includes(command))
  throw new Error("Uso: bun run moderator:add <apelido> [bairro…] | moderator:remove <apelido>");

const client = new Client({ connectionString: adminDatabaseUrl() });
await client.connect();
const db = drizzle(client, { schema, casing: "snake_case" });
const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.nick, nick));
if (!user) throw new Error(`Nenhuma conta com o apelido ${nick}.`);
if (command === "add") {
  await db
    .insert(schema.moderators)
    .values({
      accountId: user.id,
      neighborhoods: bairros.length ? bairros : null,
      addedBy: process.env.USER ?? "operador",
    })
    .onConflictDoUpdate({
      target: schema.moderators.accountId,
      set: { neighborhoods: bairros.length ? bairros : null },
    });
  console.log(`${nick} modera ${bairros.length ? bairros.join(", ") : "todos os bairros"}.`);
} else {
  await db.delete(schema.moderators).where(eq(schema.moderators.accountId, user.id));
  console.log(`${nick} não modera mais.`);
}
await client.end();
