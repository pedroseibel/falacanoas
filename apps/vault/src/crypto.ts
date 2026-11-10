import { base64url } from "@fala/core";
import { z } from "zod";

/**
 * The vault's keys and what it does with them. Keys live in the Worker's secrets, never in the
 * database, each under a version number (round 18, key rotation): a row records the version it was
 * written with, lookups try every version still held, and a row found under an old version is
 * rewritten under the current one.
 */

const VersionedKeysSchema = z.record(z.string().regex(/^\d+$/), z.string().min(43));

export interface VaultKeys {
  current: number;
  /** AES-256-GCM, by version. */
  seal: Map<number, CryptoKey>;
  /** HMAC-SHA256, by version: lookups and code hashes. */
  mac: Map<number, CryptoKey>;
}

const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));

async function importVersions(json: string, make: (raw: Uint8Array<ArrayBuffer>) => Promise<CryptoKey>) {
  const entries = Object.entries(VersionedKeysSchema.parse(JSON.parse(json)));
  const keys = await Promise.all(
    entries.map(async ([v, raw]): Promise<[number, CryptoKey]> => {
      const bytes = fromBase64(raw);
      if (bytes.length !== 32) throw new Error(`Chave ${v} do cofre não tem 32 bytes.`);
      return [Number(v), await make(bytes)];
    }),
  );
  return new Map(keys);
}

export async function importVaultKeys(env: {
  VAULT_KEY_VERSION: string;
  VAULT_SEAL_KEYS: string;
  VAULT_MAC_KEYS: string;
}): Promise<VaultKeys> {
  const current = Number(env.VAULT_KEY_VERSION);
  const seal = await importVersions(env.VAULT_SEAL_KEYS, (k) =>
    crypto.subtle.importKey("raw", k, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]),
  );
  const mac = await importVersions(env.VAULT_MAC_KEYS, (k) =>
    crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
  );
  if (!seal.has(current) || !mac.has(current)) throw new Error(`O cofre não tem a chave atual (${current}).`);
  return { current, seal, mac };
}

async function hmac(key: CryptoKey, text: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text))));
}

/** The lookup HMAC of a number under every key version held, current first. */
export async function phoneMacs(keys: VaultKeys, phone: string): Promise<{ version: number; mac: string }[]> {
  const versions = [keys.current, ...[...keys.mac.keys()].filter((v) => v !== keys.current)];
  return Promise.all(
    versions.map(async (version) => {
      const key = keys.mac.get(version);
      if (!key) throw new Error("chave ausente");
      return { version, mac: await hmac(key, `telefone:${phone}`) };
    }),
  );
}

/** AES-GCM under the current key: base64url of a fresh 12-byte iv followed by the ciphertext. */
export async function sealPhone(keys: VaultKeys, phone: string): Promise<string> {
  const key = keys.seal.get(keys.current);
  if (!key) throw new Error("chave ausente");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(phone)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return base64url(out);
}

export async function unsealPhone(keys: VaultKeys, version: number, sealed: string): Promise<string> {
  const key = keys.seal.get(version);
  if (!key) throw new Error(`O cofre não tem mais a chave ${version}.`);
  const bytes = fromBase64(sealed);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(plain);
}

/** A code is stored only as an HMAC bound to its phone, so a database copy can't be tried offline. */
export async function codeHash(keys: VaultKeys, phoneMac: string, code: string): Promise<string> {
  const key = keys.mac.get(keys.current);
  if (!key) throw new Error("chave ausente");
  return hmac(key, `codigo:${phoneMac}:${code}`);
}

/** A 6-digit code from the CSPRNG, without modulo bias. */
export function newCode(): string {
  const n = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(n);
    const v = n[0] ?? 0;
    if (v < 4_294_000_000) return String(v % 1_000_000).padStart(6, "0");
  }
}
