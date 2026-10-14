import { buildApp } from "./app";
import { loadConfig } from "./config";
import { warmUp } from "./detectors";
import { shield } from "./known";
import { pdq } from "./pdq";
import { blur, screen } from "./screen";

/** `bun run dev` (or `start`): the screening service, on :3500 unless PORT says otherwise. */
const config = loadConfig();
await warmUp().catch((e: unknown) => {
  throw new Error(`Modelos ausentes: rode \`bun run models\` primeiro. (${e instanceof Error ? e.message : e})`);
});
buildApp(config, { screen, blur, fingerprint: pdq }, config.shield ? shield(config.shield) : null).listen({
  port: config.port,
  hostname: config.host,
});
console.log(
  `triagem em http://${config.host}:${config.port} (${config.mode}${config.token ? ", com token" : ", aberta"}${config.shield ? ", com Arachnid Shield" : ", sem verificação de material conhecido"})`,
);
