import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The digest's settings, from the environment. In development the database falls back to the web
 * app's gitignored .dev.vars (the same `fala_app` connection) and the addresses to placeholders that
 * can't receive mail.
 */

const WEB_DEV_VARS = fileURLToPath(new URL("../../web/.dev.vars", import.meta.url));

function webDevVar(name: string): string {
  if (!existsSync(WEB_DEV_VARS)) return "";
  return (
    readFileSync(WEB_DEV_VARS, "utf8")
      .match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]
      ?.trim() ?? ""
  );
}

const list = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

export interface Config {
  mode: "development" | "production";
  databaseUrl: string;
  from: string;
  to: string[];
  cc: string[];
  /** Bearer token for POST /resumo; without one, the route is closed. */
  token: string;
  port: number;
  outboxDir: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = env.DIGEST_MODE === "production" || env.NODE_ENV === "production" ? "production" : "development";
  const dev = mode === "development";
  const config: Config = {
    mode,
    databaseUrl: env.DIGEST_DATABASE_URL || env.DATABASE_URL || (dev ? webDevVar("DATABASE_URL") : ""),
    from: env.DIGEST_FROM || (dev ? "Fala, Canoas <resumo@fala.invalid>" : ""),
    to: list(env.DIGEST_TO).length ? list(env.DIGEST_TO) : dev ? ["ouvidoria@prefeitura.invalid"] : [],
    cc: list(env.DIGEST_CC).length ? list(env.DIGEST_CC) : dev ? ["cac@prefeitura.invalid"] : [],
    token: env.DIGEST_TOKEN ?? "",
    port: Number(env.PORT) || 3200,
    outboxDir: env.DIGEST_OUTBOX || fileURLToPath(new URL("../outbox", import.meta.url)),
  };
  const missing = [
    !config.databaseUrl && "DIGEST_DATABASE_URL",
    !config.from && "DIGEST_FROM",
    !config.to.length && "DIGEST_TO",
  ].filter(Boolean);
  if (missing.length) throw new Error(`Faltam variáveis: ${missing.join(", ")}`);
  // One run at a time rests on a session advisory lock, which a transaction-mode pooler (Supavisor's
  // 6543) would hand to a different backend mid-run.
  if (new URL(config.databaseUrl).port === "6543")
    throw new Error("O resumo precisa de uma conexão de sessão (porta 5432), não do pooler de transação.");
  return config;
}
