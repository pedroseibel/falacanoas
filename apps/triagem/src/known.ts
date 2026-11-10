import { PDQ_MIN_QUALITY, toBase64, type PdqHash } from "./pdq";

/**
 * Known child abuse material (BUILD 5.8; research/legal/hash-matching.md). Arachnid Shield, the
 * Canadian Centre for Child Protection's free API, is asked with PDQ fingerprints only (`/v1/pdq`):
 * the photo never leaves here, and neither does anything about who sent it. Never `/v1/media` (the
 * photo's bytes) and never `/v1/media/submit` (an upload of suspected material abroad): see the
 * research for why both are out.
 */

export type KnownClass = "no-known-match" | "csam" | "harmful-abusive-material" | "test";

export interface KnownVerdict {
  /**
   * Shield's class for the worst match among the photo's orientations; "unhashable" when the
   * fingerprint is too weak to compare (PDQ quality under 50: Meta advises not to match on it).
   */
  classification: KnownClass | "unhashable";
  matchType: "exact" | "near" | null;
  /** Shield's database version (its last update) at the check. */
  databaseVersion: string | null;
}

export interface ShieldConfig {
  url: string;
  username: string;
  password: string;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** Worst first: one orientation matching known material decides. */
const SEVERITY: KnownClass[] = ["csam", "harmful-abusive-material", "test", "no-known-match"];
const isClass = (v: unknown): v is KnownClass => typeof v === "string" && SEVERITY.some((c) => c === v);

/** Shield's answer, checked field by field: anything unexpected is an error, never a clean bill. */
export function readVerdict(body: unknown): { classification: KnownClass; matchType: "exact" | "near" | null } {
  if (typeof body !== "object" || body === null || !("scanned_hashes" in body))
    throw new Error("resposta sem scanned_hashes");
  const scanned = body.scanned_hashes;
  if (typeof scanned !== "object" || scanned === null) throw new Error("scanned_hashes inválido");
  let worst: { classification: KnownClass; matchType: "exact" | "near" | null } = {
    classification: "no-known-match",
    matchType: null,
  };
  const entries = Object.values(scanned);
  // Every hash sent comes back as a key (null when it has no match): an empty answer is no answer.
  if (!entries.length) throw new Error("scanned_hashes vazio");
  for (const entry of entries) {
    // The SDK documents null for a hash with no match.
    if (entry === null) continue;
    if (typeof entry !== "object" || !("classification" in entry) || !isClass(entry.classification))
      throw new Error("classificação desconhecida");
    const m = "match_type" in entry ? entry.match_type : null;
    const matchType = m === "exact" || m === "near" ? m : null;
    if (SEVERITY.indexOf(entry.classification) < SEVERITY.indexOf(worst.classification))
      worst = { classification: entry.classification, matchType };
  }
  return worst;
}

export function shield(config: ShieldConfig, fetcher: Fetcher = fetch) {
  const base = config.url.replace(/\/$/, "");
  const authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
  let version: { value: string | null; at: number } | null = null;

  /** Cached for an hour: it changes when C3P updates its list, not per photo. */
  async function databaseVersion(): Promise<string | null> {
    if (version && Date.now() - version.at < 3_600_000) return version.value;
    try {
      const res = await fetcher(`${base}/v1/version`, {
        headers: { authorization },
        signal: AbortSignal.timeout(5_000),
      });
      const body: unknown = res.ok ? await res.json() : null;
      const value =
        typeof body === "object" &&
        body !== null &&
        "last_updated_at" in body &&
        typeof body.last_updated_at === "string"
          ? body.last_updated_at
          : null;
      version = { value, at: Date.now() };
      return value;
    } catch {
      return version?.value ?? null;
    }
  }

  return {
    /** The verdict for a photo's fingerprints. Throws when Shield can't answer: the app keeps it waiting. */
    async check(hash: PdqHash, orientations: string[]): Promise<KnownVerdict> {
      if (hash.quality < PDQ_MIN_QUALITY)
        return { classification: "unhashable", matchType: null, databaseVersion: null };
      const hashes = [...new Set([hash.hex, ...orientations])].map(toBase64);
      const res = await fetcher(`${base}/v1/pdq`, {
        method: "POST",
        headers: { authorization, "content-type": "application/json" },
        body: JSON.stringify({ hashes }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Arachnid Shield respondeu ${res.status}`);
      const verdict = readVerdict(await res.json());
      return { ...verdict, databaseVersion: await databaseVersion() };
    },
  };
}

export type Shield = ReturnType<typeof shield>;
