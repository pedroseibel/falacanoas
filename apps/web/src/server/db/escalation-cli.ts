import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { escalateKnownMatches } from "../known-material";
import { adminDatabaseUrl, devVar } from "@fala/dev-vars";
import * as schema from "./schema";

/**
 * The controller's side of an escalation (DECISIONS round 20; research/legal/abuso-infantil-e-imagens-
 * intimas.md; research/legal/hash-matching.md). Child abuse material was escalated, by a moderator or by
 * a known-material match nobody saw: it is off the map, unviewable and preserved. The controller reports
 * it, records the protocol, records when the authority confirmed receipt and when it validated the
 * report, and only then deletes the bytes (Portaria MJSP 1.312/2026, arts. 11 §1 and 23 §2). Metadata
 * (case, account id, dates, protocol) stays. Never open the file.
 *
 * A match that isn't plainly csam (C3P's "harmful-abusive-material", or "test") waits for the controller:
 * `matches` lists them, and `conferir` decides from the match record, never the image.
 *
 *   bun --filter @fala/web escalation list
 *   bun --filter @fala/web escalation reported <código> <canal> <protocolo…>
 *   bun --filter @fala/web escalation received <código>
 *   bun --filter @fala/web escalation validated <código>
 *   bun --filter @fala/web escalation purge <código>
 *   bun --filter @fala/web escalation contest <código> lift|keep <nota…>
 *   bun --filter @fala/web escalation matches
 *   bun --filter @fala/web escalation conferir <chave> escalar|liberar <nota…>
 */
const USAGE =
  "Uso: escalation list | reported <código> <canal> <protocolo> | received <código> | validated <código> | purge <código> | contest <código> lift|keep <nota> | matches | conferir <chave> escalar|liberar <nota>";
const COMMANDS = ["list", "reported", "received", "validated", "purge", "contest", "matches", "conferir"];
const [command, code, ...rest] = process.argv.slice(2);
if (!command || !COMMANDS.includes(command)) throw new Error(USAGE);

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
  validated_at: Date | null;
  purged_at: Date | null;
  source: string;
  match_class: string | null;
  match_type: string | null;
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
      : r.validated_at
        ? "validada pela autoridade: pode apagar"
        : r.receipt_at
          ? "recebida pela autoridade: aguardando validação"
          : r.reported_at
            ? `denunciada (${r.report_channel} ${r.report_protocol}) em ${day(r.reported_at)}: aguardando confirmação`
            : "A DENUNCIAR";
    // The report must say how it was found (Portaria 1.312, art. 10 I).
    const source =
      r.source === "hash_match"
        ? `  [correspondência por hash: ${r.match_class ?? "?"}${r.match_type ? `, ${r.match_type}` : ""}; sem revisão humana]`
        : "";
    console.log(
      `${r.id.slice(0, 8)}  ${day(r.created_at)}  registro ${r.item_id}${r.photo_id ? " (foto)" : ""}  ${state}${source}${r.contest_status === "open" ? `\n          contestação da suspensão: “${r.contest_text}”` : ""}`,
    );
  }
  if (!rows.length) console.log("Nenhuma escalada.");
} else if (command === "matches") {
  const { rows } = await client.query<{
    storage_key: string;
    known: string;
    known_match: string | null;
    known_db_version: string | null;
    known_checked_at: Date | null;
    item_id: string | null;
  }>(
    `select s.storage_key, s.known, s.known_match, s.known_db_version, s.known_checked_at, p.item_id
       from fala.photo_screens s left join fala.item_photos p on p.storage_key = s.storage_key
      where s.known in ('harmful-abusive-material', 'test') and s.known_review is null
      order by s.known_checked_at`,
  );
  for (const r of rows)
    console.log(
      `${r.storage_key.slice(0, 12)}  ${day(r.known_checked_at)}  registro ${r.item_id ?? "—"}  A CONFERIR: ${r.known}${r.known_match ? ` (${r.known_match})` : ""}, base de ${r.known_db_version ?? "?"}`,
    );
  if (!rows.length) console.log("Nenhuma correspondência a conferir.");
} else if (!code) {
  throw new Error(USAGE);
} else if (command === "conferir") {
  const [decision, ...note] = rest;
  if ((decision !== "escalar" && decision !== "liberar") || !note.length) throw new Error(USAGE);
  const { rows } = await client.query<{ storage_key: string }>(
    `select storage_key from fala.photo_screens
      where storage_key like $1 and known in ('harmful-abusive-material', 'test') and known_review is null`,
    [`${code}%`],
  );
  if (rows.length !== 1)
    throw new Error(
      rows.length ? "Chave ambígua: use mais caracteres." : "Nenhuma correspondência a conferir com essa chave.",
    );
  await client.query(
    "update fala.photo_screens set known_review = $2, known_reviewed_at = now(), known_review_note = $3 where storage_key = $1",
    [rows[0]?.storage_key, decision === "escalar" ? "escalated" : "released", note.join(" ")],
  );
  if (decision === "escalar") {
    const n = await escalateKnownMatches(drizzle(client, { schema, casing: "snake_case" }), new Date());
    console.log(`Encaminhada (${n}). Agora denuncie e registre com reported; ela aparece em list.`);
  } else console.log("Liberada: a foto volta para a moderação comum.");
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
  console.log("Recebimento registrado. Recebimento não é validação: apague só depois de validated.");
} else if (command === "validated") {
  const r = await find(code);
  if (!r.reported_at) throw new Error("Registre a denúncia antes (reported).");
  await client.query("update fala.escalations set validated_at = now() where id = $1", [r.id]);
  console.log(
    "Validação registrada. O material pode ser apagado (purge); os metadados e os registros de acesso ficam.",
  );
} else if (command === "purge") {
  const r = await find(code);
  // Portaria MJSP 1.312/2026: delete after the authority validates the report, not on receipt.
  if (!r.validated_at) throw new Error("Só depois que a autoridade validar a denúncia (validated).");
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
