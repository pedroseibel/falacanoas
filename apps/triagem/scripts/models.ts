import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MODELS } from "../src/models";

/** `bun run models`: downloads each pinned model once and refuses any whose checksum doesn't match. */
const dir = fileURLToPath(new URL("../models/", import.meta.url));
mkdirSync(dir, { recursive: true });
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// One model at a time: each is checked before the next downloads, and a failure says which.
for (const [name, m] of Object.entries(MODELS)) {
  const path = `${dir}${m.file}`;
  if (existsSync(path) && sha(readFileSync(path)) === m.sha256) {
    console.log(`${name}: já está aqui (${m.file})`);
    continue;
  }
  // oxlint-disable-next-line no-await-in-loop
  const res = await fetch(m.url, { headers: "accept" in m ? { accept: m.accept } : {}, redirect: "follow" });
  if (!res.ok) throw new Error(`${name}: download falhou (${res.status})`);
  // oxlint-disable-next-line no-await-in-loop
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (sha(bytes) !== m.sha256) throw new Error(`${name}: checksum não confere; o arquivo não foi salvo`);
  writeFileSync(path, bytes);
  console.log(`${name}: ${m.file} (${(bytes.length / 1e6).toFixed(1)} MB) — ${m.what}`);
}
