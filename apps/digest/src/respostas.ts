import { canoas } from "@fala/instance-canoas";
import { loadConfig } from "./config";
import { senderName, type StoredReading } from "./replies";
import { replyNow, senders } from "./service";
import { pgReplyStore } from "./store";

/**
 * Answers to the resumo that a person should read (BUILD 3.1; replies.ts):
 *
 *   bun run respostas                                  replies waiting, with what was read from each
 *   bun run respostas ler <arquivo.eml>                hand in a reply saved from the mailbox
 *   bun run respostas aplicar <id> [CÓDIGO=PROTOCOLO…] apply what was read, or these pairs instead
 *   bun run respostas descartar <id>                   nothing to apply (an auto-reply, say)
 *
 * A reply handed in by the operator counts as authenticated: they took it from the mailbox.
 */
const [command, ...args] = process.argv.slice(2);
const config = loadConfig();
const operator = process.env.USER ?? "operador";
const store = pgReplyStore(config.databaseUrl, canoas.branding.name, canoas.timezone);

function show(reading: StoredReading): string[] {
  return [
    ...reading.readings.map(
      (r) =>
        `  ${r.applied ? "✓" : "?"} ${r.codes === "all" ? "o resumo inteiro" : r.codes.join(", ")} → ${r.number} (${r.kind})`,
    ),
    ...(reading.unclear.length ? [`  números sem registro: ${reading.unclear.join(", ")}`] : []),
    ...(reading.loose.length ? [`  códigos citados sem protocolo: ${reading.loose.join(", ")}`] : []),
    ...(reading.asksMore ? ["  ⚠ pede mais informações (complementação suspende o prazo)"] : []),
  ];
}

try {
  if (!command) {
    const rows = await store.waiting();
    for (const r of rows) {
      console.log(
        `\n${r.id.slice(0, 8)}  ${r.received_at.toISOString().slice(0, 16).replace("T", " ")}  ${r.from_address}${r.trusted ? "" : "  (não confirmado)"}`,
      );
      console.log(`  ${r.subject || "(sem assunto)"}${r.digest_id ? "" : "  (sem resumo identificado)"}`);
      for (const line of show(r.reading)) console.log(line);
      console.log(
        r.body
          .slice(0, 800)
          .split("\n")
          .map((l) => `  │ ${l}`)
          .join("\n"),
      );
    }
    if (!rows.length) console.log("Nenhuma resposta esperando.");
  } else if (command === "ler") {
    const [path] = args;
    if (!path) throw new Error("Uso: bun run respostas ler <arquivo.eml>");
    const outcome = await replyNow(config, await Bun.file(path).bytes(), { operator: true });
    if (outcome.kind === "repeated") console.log("Essa resposta já tinha sido lida.");
    else {
      console.log(`${outcome.id.slice(0, 8)}: ${outcome.status === "applied" ? "aplicada" : "esperando revisão"}`);
      for (const line of show(outcome.reading)) console.log(line);
      if (outcome.applied.length) console.log(`  protocolo gravado em ${outcome.applied.join(", ")}`);
    }
  } else if (command === "aplicar" || command === "descartar") {
    const [prefix, ...pairs] = args;
    const row = prefix ? await store.find(prefix) : null;
    if (!row) throw new Error("Resposta não encontrada: use o começo do id que a lista mostra.");
    if (command === "descartar") {
      await store.decide(row.id, "dismissed", operator);
      console.log("Descartada.");
    } else {
      const given: StoredReading["readings"] = pairs.map((p) => {
        const [code = "", number = ""] = p.split("=");
        if (!code || !number) throw new Error(`Par inválido: ${p}. Use CÓDIGO=PROTOCOLO.`);
        return { codes: [code.toUpperCase()], number, kind: "protocolo", applied: false };
      });
      const todo = given.length ? given : row.reading.readings.filter((r) => !r.applied);
      if (!todo.length) throw new Error("Nada a aplicar: diga os pares CÓDIGO=PROTOCOLO.");
      const sent = row.item_ids ?? [];
      const by = senderName(row.from_address, senders(config));
      for (const r of todo) {
        const ids = r.codes === "all" ? sent : r.codes;
        // oxlint-disable-next-line no-await-in-loop
        const written = await store.protocol({
          ids,
          number: r.number,
          at: row.received_at,
          by,
          keep: r.codes === "all",
        });
        console.log(`${r.number}: ${written.length ? written.join(", ") : "nada mudou (não enviado, ou já tinha)"}`);
      }
      const reading: StoredReading = {
        ...row.reading,
        readings: [...row.reading.readings.filter((r) => given.length || r.applied), ...todo].map((r) => ({
          ...r,
          applied: true,
        })),
      };
      await store.decide(row.id, "applied", operator, reading);
    }
  } else
    throw new Error("Uso: bun run respostas [ler <arquivo.eml> | aplicar <id> [CÓDIGO=PROTOCOLO…] | descartar <id>]");
} finally {
  await store.close();
}
