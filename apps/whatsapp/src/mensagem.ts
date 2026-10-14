import { resolve } from "node:path";
import { loadConfig } from "./config";
import { connect, devMedia } from "./service";
import type { Inbound } from "./conversation";

/**
 * `bun run mensagem <número> <texto…>`: one message as if it came from WhatsApp. Development only;
 * the reply lands in outbox/mensagens.txt.
 *
 *   bun run mensagem 5551999998888 CONFIRMAR XXXX
 *   bun run mensagem 5551999998888 --foto ./buraco.jpg [legenda…]
 *   bun run mensagem 5551999998888 --local -29.9177,-51.1839
 *
 * A report spans several messages, so with the service running (`bun run dev`) the message goes to
 * it, where the conversation is; otherwise it's handled here, and a report starts over each time.
 */
const [from = "", ...args] = process.argv.slice(2);
const config = loadConfig();
const number = from.replace(/\D/g, "");

function message(): Inbound | null {
  const [flag, value, ...rest] = args;
  if (flag === "--foto" && value)
    return { from: number, kind: "image", mediaId: devMedia(resolve(value)), caption: rest.join(" ") || undefined };
  if (flag === "--local" && value) {
    const [lat, lng] = value.split(",").map(Number);
    return lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)
      ? { from: number, kind: "location", lat, lng }
      : null;
  }
  return args.length ? { from: number, kind: "text", text: args.join(" ") } : null;
}

const msg = message();
if (config.mode !== "development" || !number || !msg) {
  console.error(
    "Uso, em desenvolvimento: bun run mensagem 5551999998888 CONFIRMAR XXXX | --foto <arquivo> [legenda] | --local <lat,lng>",
  );
  process.exit(1);
}

const body =
  msg.kind === "image"
    ? { from: number, foto: msg.mediaId.replace(/^arquivo:/, ""), text: msg.caption }
    : msg.kind === "location"
      ? { from: number, lat: msg.lat, lng: msg.lng }
      : { from: number, text: msg.text };
const running = await fetch(`http://localhost:${config.port}/dev/mensagem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
}).catch(() => null);

let result: unknown;
if (running?.ok) result = await running.json();
else {
  const { handle, close } = connect(config);
  result = await handle(msg);
  await close();
}
const shown = typeof result === "object" && result !== null ? result : {};
console.log(JSON.stringify("outcome" in shown ? shown.outcome : shown));
if ("reply" in shown && typeof shown.reply === "string") console.log(`\n${shown.reply}`);
