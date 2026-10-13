import { loadConfig } from "./config";
import { digestNow } from "./service";

/** `bun run agora`: one digest now, then exit. In development the e-mail lands in outbox/. */
const config = loadConfig();
const result = await digestNow(config);
console.log(JSON.stringify({ mode: config.mode, ...result }, null, 2));
if (!result.ok) process.exitCode = 1;
