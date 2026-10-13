import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TYPST_ASSETS, TYPST_BIN, TYPST_VERSION, typstUrl } from "../src/pdf/typst-release";

/** `bun run typst`: fetches the pinned Typst binary into bin/, refusing one whose checksum doesn't match. */
const platform = `${process.platform}-${process.arch}`;
const asset = TYPST_ASSETS[platform];
if (!asset) throw new Error(`Sem Typst fixado para ${platform}: acrescente o digest em src/pdf/typst-release.ts.`);

const installed = existsSync(TYPST_BIN) ? new TextDecoder().decode(Bun.spawnSync([TYPST_BIN, "--version"]).stdout) : "";
if (installed.includes(TYPST_VERSION)) {
  console.log(`typst ${TYPST_VERSION}: já está aqui (${TYPST_BIN})`);
  process.exit(0);
}

const res = await fetch(typstUrl(asset.file), { redirect: "follow" });
if (!res.ok) throw new Error(`download falhou (${res.status})`);
const bytes = new Uint8Array(await res.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
  throw new Error("checksum não confere; nada foi instalado");

const work = mkdtempSync(join(tmpdir(), "typst-"));
try {
  const archive = join(work, asset.file);
  writeFileSync(archive, bytes);
  const tar = Bun.spawnSync(["tar", "-xJf", archive, "-C", work]);
  if (tar.exitCode !== 0) throw new Error(`tar falhou: ${new TextDecoder().decode(tar.stderr)}`);
  mkdirSync(dirname(TYPST_BIN), { recursive: true });
  copyFileSync(join(work, asset.file.replace(/\.tar\.xz$/, ""), "typst"), TYPST_BIN);
  chmodSync(TYPST_BIN, 0o755);
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(new TextDecoder().decode(Bun.spawnSync([TYPST_BIN, "--version"]).stdout).trim());
