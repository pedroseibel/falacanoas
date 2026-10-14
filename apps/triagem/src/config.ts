import type { ShieldConfig } from "./known";

/**
 * The service's settings. It answers only the app, which sends a shared token (TRIAGEM_TOKEN, the
 * same value in the app's environment). Production refuses to start without one; development may
 * run open on localhost. With ARACHNID_SHIELD_USERNAME and ARACHNID_SHIELD_PASSWORD (the account C3P
 * issues), each photo's fingerprints are checked against known abuse material; without them, nothing
 * is checked and the app keeps photos out of sight if it requires the check.
 */
export interface Config {
  mode: "development" | "production";
  token: string | null;
  port: number;
  /** 127.0.0.1 by default; a container sets 0.0.0.0 behind its own TLS proxy. */
  host: string;
  shield: ShieldConfig | null;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = env.TRIAGEM_MODE === "production" || env.NODE_ENV === "production" ? "production" : "development";
  const token = env.TRIAGEM_TOKEN?.trim() || null;
  if (mode === "production" && (!token || token.length < 32))
    throw new Error("Falta TRIAGEM_TOKEN (32 caracteres ou mais): sem ele, qualquer um usaria a triagem.");
  const username = env.ARACHNID_SHIELD_USERNAME?.trim();
  const password = env.ARACHNID_SHIELD_PASSWORD?.trim();
  return {
    mode,
    token,
    port: Number(env.PORT) || 3500,
    host: env.HOST || "127.0.0.1",
    shield:
      username && password
        ? { url: env.ARACHNID_SHIELD_URL?.trim() || "https://shield.projectarachnid.com", username, password }
        : null,
  };
}
