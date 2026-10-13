import { Client } from "pg";
import { adminDatabaseUrl, devVar } from "./dev-env";

/**
 * The controller's side of an escalation (DECISIONS round 20; research/legal/abuso-infantil.md). A
 * moderator escalated child abuse material: it is off the map, unviewable and preserved. The
 * controller reports it, records the protocol, records when the authority confirmed receipt, and only
 * then deletes the bytes. Metadata (case, account id, dates, protocol) stays. Never open the file.
 *
 *   bun --filter @fala/web escalation list
 *   bun --filter @fala/web escalation reported <código> <canal> <protocolo…>
 *   bun --filter @fala/web escalation received <código>
 *   bun --filter @fala/web escalation purge <código>
 *   bun --filter @fala/web escalation contest <código> lift|keep <nota…>
 */
const USAGE =
  "Uso: escalation list | reported <código> <canal> <protocolo> | received <código> | purge <código> | contest <código> lift|keep <nota>";
const [command, code, ...rest] = process.argv.slice(2);
if (!command || !["list", "reported", "received", "purge", "contest"].includes(command)) throw new Error(USAGE);

const client = new Client({ connectionString: adminDatabaseUrl() });
await client.connect();

interface Row {
  id: string;
  created_at: Date;
  item_id: string;
  photo_id: string | null;
  account_id: string | null;
  reported_at: Date | null;
  report_channel: string | null;
  report_protocol: string | null;
  receipt_at: Date | null;
  purged_at: Date | null;
  contest_text: string | null;
  contest_status: string | null;
}

async function find(c: string): Promise<Row> {
  const { rows } = await client.query<Row>(
    `select e.*, s.contest_text, s.contest_status
       from fala.escalations e left join fala.sanctions s on s.escalation_id = e.id
      where e.id::text like $1`,
    [`${c}%`],
  );
  if (rows.length !== 1)
    throw new Error(rows.length ? "Código ambíguo: use mais caracteres." : "Nenhuma escalada com esse código.");
  const [row] = rows;
  if (!row) throw new Error("Nenhuma escalada com esse código.");
  return row;
}

const day = (d: Date | null) => d?.toISOString().slice(0, 16).replace("T", " ") ?? "—";

if (command === "list") {
  const { rows } = await client.query<Row>(
    `select e.*, s.contest_text, s.contest_status
       from fala.escalations e left join fala.sanctions s on s.escalation_id = e.id
      order by e.created_at desc`,
  );
  for (const r of rows) {
    const state = r.purged_at
      ? `apagada ${day(r.purged_at)}`
      : r.receipt_at
        ? "recebida pela autoridade: pode apagar"
        : r.reported_at
          ? `denunciada (${r.report_channel} ${r.report_protocol}) em ${day(r.reported_at)}: aguardando confirmação`
          : "A DENUNCIAR";
    console.log(
      `${r.id.slice(0, 8)}  ${day(r.created_at)}  registro ${r.item_id}${r.photo_id ? " (foto)" : ""}  ${state}${r.contest_status === "open" ? `\n          contestação da suspensão: “${r.contest_text}”` : ""}`,
    );
  }
  if (!rows.length) console.log("Nenhuma escalada.");
} else if (!code) {
  throw new Error(USAGE);
} else if (command === "reported") {
  const [channel, ...protocol] = rest;
  if (!channel || !protocol.length) throw new Error(USAGE);
  const r = await find(code);
  await client.query(
    "update fala.escalations set reported_at = now(), report_channel = $2, report_protocol = $3 where id = $1",
    [r.id, channel, protocol.join(" ")],
  );
  console.log("Denúncia registrada. Guarde o comprovante fora do Fala, com acesso restrito.");
} else if (command === "received") {
  const r = await find(code);
  if (!r.reported_at) throw new Error("Registre a denúncia antes (reported).");
  await client.query("update fala.escalations set receipt_at = now() where id = $1", [r.id]);
  console.log("Recebimento registrado. O material pode ser apagado (purge); os metadados ficam.");
} else if (command === "purge") {
  const r = await find(code);
  if (!r.receipt_at) throw new Error("Só depois que a autoridade confirmar o recebimento (received).");
  const { rows } = await client.query<{ id: string; storage_key: string }>(
    `select id, storage_key from fala.item_photos
      where item_id = $1 and storage_key is not null and purged_at is null and ($2::uuid is null or id = $2::uuid)`,
    [r.item_id, r.photo_id],
  );
  const base = devVar("SUPABASE_URL");
  const key = devVar("SUPABASE_SECRET_KEY");
  if (rows.length) {
    if (!base || !key) throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY não configuradas.");
    const res = await fetch(`${base}/storage/v1/object/fotos`, {
      method: "DELETE",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ prefixes: rows.map((p) => p.storage_key) }),
    });
    if (!res.ok) throw new Error(`O Storage recusou apagar (${res.status}).`);
    await client.query("update fala.item_photos set purged_at = now() where id = any($1::uuid[])", [
      rows.map((p) => p.id),
    ]);
  }
  await client.query("update fala.escalations set purged_at = now() where id = $1", [r.id]);
  console.log(`Material apagado (${rows.length} ${rows.length === 1 ? "foto" : "fotos"}). Os metadados ficam.`);
} else if (command === "contest") {
  const [decision, ...note] = rest;
  if ((decision !== "lift" && decision !== "keep") || !note.length) throw new Error(USAGE);
  const r = await find(code);
  const res = await client.query(
    `update fala.sanctions
        set contest_status = $2, contest_note = $3,
            lifted_at = case when $2 = 'overturned' then now() else lifted_at end,
            lift_note = case when $2 = 'overturned' then $3 else lift_note end
      where escalation_id = $1 and contest_status = 'open'`,
    [r.id, decision === "lift" ? "overturned" : "upheld", note.join(" ")],
  );
  console.log(res.rowCount ? "Contestação decidida." : "Não há contestação aberta para essa escalada.");
}
await client.end();
