import { loadConfig } from "./config";
import { connect } from "./service";

/**
 * `bun run mensagem <número> <texto…>`: one message as if it came from WhatsApp, without the HTTP
 * service. Development only; the reply lands in outbox/mensagens.txt.
 */
const [from, ...words] = process.argv.slice(2);
const config = loadConfig();
if (config.mode !== "development" || !from || !words.length) {
  console.error("Uso, em desenvolvimento: bun run mensagem 5551999998888 CONFIRMAR XXXX");
  process.exit(1);
}
const { handle, close } = connect(config);
const result = await handle({ from: from.replace(/\D/g, ""), text: words.join(" ") });
console.log(JSON.stringify(result.outcome));
if (result.reply) console.log(`\n${result.reply}`);
await close();
