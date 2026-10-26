import { loadConfig } from "./config";
import { rainNow } from "./service";

/** `bun run chuva`: one read of the rain gauges into the archive, then exit. */
const config = loadConfig();
const result = await rainNow(config);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
