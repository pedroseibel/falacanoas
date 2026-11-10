import { DATA_REQUEST_DAYS, DAY_MS, localStamp, REQUEST_KIND_LABEL, REQUESTER_LABEL } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { adminDatabaseUrl } from "@fala/dev-vars";
import * as schema from "./schema";

/**
 * `bun run requests` lists the open requests from the data-subject channel, oldest first, with the
 * days left to answer (LGPD art. 19); `bun run requests answered <protocol> [note]` records that one
 * was answered. Answering is the controller's job (the founder now, the associação later), done by
 * e-mail to the contact given, not here.
 */
const [command = "list", protocol, ...rest] = process.argv.slice(2);
if (!["list", "answered"].includes(command) || (command === "answered" && !protocol))
  throw new Error("Uso: bun run requests | bun run requests answered <protocolo> [nota]");

const client = new Client({ connectionString: adminDatabaseUrl() });
await client.connect();
const db = drizzle(client, { schema, casing: "snake_case" });
const t = schema.dataRequests;

if (command === "answered") {
  const [row] = await db
    .update(t)
    .set({ status: "answered", answeredAt: new Date(), note: rest.join(" ") || null })
    .where(eq(t.protocol, protocol ?? ""))
    .returning({ protocol: t.protocol });
  console.log(row ? `${row.protocol} respondido.` : `Nenhum pedido ${protocol}.`);
} else {
  const open = await db.select().from(t).where(eq(t.status, "open")).orderBy(asc(t.createdAt));
  if (!open.length) console.log("Nenhum pedido aberto.");
  for (const r of open) {
    const left = DATA_REQUEST_DAYS - Math.floor((Date.now() - r.createdAt.getTime()) / DAY_MS);
    console.log(
      [
        `${r.protocol} · ${localStamp(r.createdAt, canoas.timezone)} · ${left >= 0 ? `${left} dias para responder` : `${-left} dias atrasado`}`,
        `  ${REQUESTER_LABEL[r.requester]} · ${REQUEST_KIND_LABEL[r.kind]}`,
        r.itemId ? `  Registro ${r.itemId}${r.proof === "tracking_key" ? " (link secreto confere)" : ""}` : null,
        r.proof === "session" ? `  Pela conta ${r.accountId ?? "(encerrada)"}` : null,
        `  Responder para: ${r.contact}`,
        `  ${r.text.replaceAll("\n", "\n  ")}`,
        "",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
  }
}
await client.end();
