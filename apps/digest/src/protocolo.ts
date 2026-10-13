import { canoas } from "@fala/instance-canoas";
import { loadConfig } from "./config";
import { recordProtocol } from "./store";

/**
 * `bun run protocolo <código> <número> [AAAA-MM-DD]`: the protocol the Ouvidoria answered with, for
 * a report already sent. Its page then shows the number and the legal deadline from that date.
 */
const [id, number, date] = process.argv.slice(2);
if (!id || !number) {
  console.error("Uso: bun run protocolo <código> <número> [AAAA-MM-DD]");
  process.exit(1);
}
const at = date ? new Date(`${date}T12:00:00-03:00`) : new Date();
if (Number.isNaN(at.getTime())) {
  console.error("Data inválida. Use AAAA-MM-DD.");
  process.exit(1);
}
const ok = await recordProtocol(loadConfig().databaseUrl, canoas.branding.name, {
  id: id.toUpperCase(),
  number,
  at,
});
console.log(
  ok ? `Protocolo ${number} registrado em ${id.toUpperCase()}.` : `${id} não existe ou ainda não foi enviado.`,
);
if (!ok) process.exitCode = 1;
