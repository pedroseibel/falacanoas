import { siteUrl } from "@fala/core";
import { fromDevVars, serviceMode, WEB_DEV_VARS } from "@fala/dev-vars";
import { fileURLToPath } from "node:url";
import { canoas } from "@fala/instance-canoas";

/**
 * The digest's settings, from the environment. In development the database falls back to the web
 * app's gitignored .dev.vars (the same `fala_app` connection) and the addresses to placeholders that
 * can't receive mail.
 */

const list = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

/**
 * Who the resumo is addressed to (DECISIONS round 5), named on the PDF's first page. The e-mail
 * addresses are DIGEST_TO and DIGEST_CC (research/canoas: transparenciaouvidoria@ and
 * atendimento.cidadao@canoas.rs.gov.br).
 */
export const ADDRESSEE = {
  to: "Ouvidoria do Município de Canoas",
  cc: ["Central de Atendimento ao Cidadão (CAC)"],
};

export interface Config {
  mode: "development" | "production";
  databaseUrl: string;
  from: string;
  to: string[];
  cc: string[];
  /** Bearer token for POST /resumo; without one, the route is closed. */
  token: string;
  port: number;
  /** The interface to listen on (DIGEST_HOST, e.g. 127.0.0.1 on a workstation); every one by default. */
  hostname: string | undefined;
  outboxDir: string;
  /** Where the photos in the resumo are fetched from (their addresses name the public site). */
  photoBase: string;
  cacheDir: string;
  /** Bearer token for POST /respostas (the inbound e-mail's relay); without one, the route is closed. */
  repliesToken: string;
  /**
   * The authserv-id our receiving mail server writes in Authentication-Results ("mx.cloudflare.net"
   * for Cloudflare Email Routing). Without it, no reply arriving by HTTP is applied on its own.
   */
  authserv: string | null;
  /**
   * Whether the rain archive runs every 10 minutes (BUILD 6.1). Always in production; in development
   * only with DIGEST_RAIN=1, since the archive is the same table either way.
   */
  rain: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = serviceMode(env, "DIGEST_MODE");
  const dev = mode === "development";
  const config: Config = {
    mode,
    databaseUrl: env.DIGEST_DATABASE_URL || env.DATABASE_URL || (dev ? fromDevVars(WEB_DEV_VARS, "DATABASE_URL") : ""),
    from: env.DIGEST_FROM || (dev ? "Fala, Canoas <resumo@fala.invalid>" : ""),
    to: list(env.DIGEST_TO).length ? list(env.DIGEST_TO) : dev ? ["ouvidoria@prefeitura.invalid"] : [],
    cc: list(env.DIGEST_CC).length ? list(env.DIGEST_CC) : dev ? ["cac@prefeitura.invalid"] : [],
    token: env.DIGEST_TOKEN ?? "",
    port: Number(env.PORT) || 3200,
    hostname: env.DIGEST_HOST || undefined,
    outboxDir: env.DIGEST_OUTBOX || fileURLToPath(new URL("../outbox", import.meta.url)),
    photoBase: env.DIGEST_PHOTO_BASE || (dev ? "http://127.0.0.1:3100" : siteUrl(canoas)),
    cacheDir: env.DIGEST_CACHE || fileURLToPath(new URL("../cache", import.meta.url)),
    repliesToken: env.DIGEST_REPLIES_TOKEN ?? "",
    authserv: env.DIGEST_AUTHSERV || null,
    rain: !dev || env.DIGEST_RAIN === "1",
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
