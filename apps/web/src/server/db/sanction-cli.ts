import { Client } from "pg";
import { adminDatabaseUrl } from "./dev-env";

/**
 * The controller's sanctions (DECISIONS round 19): the only way to give a permanent one, and a way to
 * lift any. Volunteers never run this.
 *
 *   bun --filter @fala/web sanction list
 *   bun --filter @fala/web sanction mute|suspend <alvo> <dias|permanente> <motivo…>
 *   bun --filter @fala/web sanction lift <código da sanção> [nota…]
 *
 * <alvo> is an apelido, or a code moderators see: a pin's handle, a case's code, or a sanction's.
 */
const USAGE =
  "Uso: sanction list | sanction mute|suspend <alvo> <dias|permanente> <motivo…> | sanction lift <código> [nota…]";
const [command, target, span, ...rest] = process.argv.slice(2);
if (!command || !["list", "mute", "suspend", "lift"].includes(command)) throw new Error(USAGE);

const client = new Client({ connectionString: adminDatabaseUrl() });
await client.connect();
const one = async <T extends object>(sql: string, params: unknown[]) =>
  (await client.query<T>(sql, params)).rows[0] ?? null;

/** The account behind an apelido, a pin's moderation handle, a case code or a sanction code. */
async function accountOf(alvo: string): Promise<string | null> {
  const code = /^[0-9a-f]{4,36}$/.test(alvo) ? `${alvo}%` : null;
  const byNick = await one<{ id: string }>("select id from fala.users where nick = $1", [alvo]);
  if (byNick) return byNick.id;
  if (!code) return null;
  const byHandle = await one<{ id: string }>(
    `select a.account_id as id from fala.items i join fala.item_authors a on a.item_id = i.id
      where i.moderation_handle = $1`,
    [alvo],
  );
  if (byHandle) return byHandle.id;
  const byCase = await one<{ id: string }>(
    `select coalesce(p.account_id, e.account_id, a.account_id) as id
       from fala.moderation_cases mc
       left join fala.item_photos p on p.id = mc.photo_id
       left join fala.item_events e on e.id = mc.event_id
       left join fala.item_authors a on a.item_id = mc.item_id and mc.photo_id is null and mc.event_id is null
      where mc.id::text like $1`,
    [code],
  );
  if (byCase?.id) return byCase.id;
  const bySanction = await one<{ id: string }>("select account_id as id from fala.sanctions where id::text like $1", [
    code,
  ]);
  return bySanction?.id ?? null;
}

const who = process.env.USER ?? "controlador";
if (command === "list") {
  const { rows } = await client.query<{
    id: string;
    nick: string | null;
    kind: string;
    source: string;
    ends_at: Date | null;
    reason: string;
    contest_status: string | null;
  }>(
    `select s.id, u.nick, s.kind, s.source, s.ends_at, s.reason, s.contest_status
       from fala.sanctions s join fala.users u on u.id = s.account_id
      where s.lifted_at is null and (s.ends_at is null or s.ends_at > now())
      order by s.created_at desc`,
  );
  for (const r of rows)
    console.log(
      `${r.id.slice(0, 8)}  ${r.kind.padEnd(7)} ${(r.nick ?? "(sem apelido)").padEnd(24)} até ${r.ends_at?.toISOString().slice(0, 10) ?? "permanente"}  ${r.source}${r.contest_status ? ` · contestação ${r.contest_status}` : ""}  ${r.reason}`,
    );
  if (!rows.length) console.log("Nenhuma sanção em vigor.");
} else if (command === "lift") {
  if (!target) throw new Error(USAGE);
  const note = [span, ...rest].filter(Boolean).join(" ") || `Retirada pelo controlador (${who}).`;
  const r = await client.query(
    "update fala.sanctions set lifted_at = now(), lift_note = $2 where id::text like $1 and lifted_at is null",
    [`${target}%`, note],
  );
  console.log(r.rowCount ? "Sanção retirada." : "Nenhuma sanção em vigor com esse código.");
} else {
  const reason = rest.join(" ").trim();
  if (!target || !span || reason.length < 3) throw new Error(USAGE);
  const days = span === "permanente" ? null : Number(span);
  if (days !== null && !(Number.isInteger(days) && days > 0))
    throw new Error("Dias: um número inteiro, ou permanente.");
  const accountId = await accountOf(target);
  if (!accountId) throw new Error(`Nada encontrado para ${target}.`);
  await client.query(
    `insert into fala.sanctions (account_id, kind, source, reason, starts_at, ends_at, confirmed_at)
     values ($1, $2, 'controller', $3, now(), $4, now())`,
    [accountId, command, reason, days === null ? null : new Date(Date.now() + days * 86_400_000)],
  );
  console.log(
    `${command === "mute" ? "Silenciada" : "Suspensa"} ${days === null ? "permanentemente" : `por ${days} dias`}.`,
  );
}
await client.end();
