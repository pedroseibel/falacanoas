import { canoas } from "@fala/instance-canoas";
import { openDataApp } from "./app";
import { loadConfig } from "./config";
import { pgStore } from "./store";

/** `bun run start`: the open-data API (BUILD 3.3), on the read-only fala_dados role. */
const config = loadConfig(canoas);
openDataApp(pgStore(config.databaseUrl), canoas).listen(config.port);
console.log(
  `dados abertos (${config.mode}${canoas.openDataLicence ? `, ${canoas.openDataLicence}` : ", licença a definir"}) em :${config.port}`,
);
