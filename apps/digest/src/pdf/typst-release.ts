import { fileURLToPath } from "node:url";

/**
 * The Typst compiler the resumo's PDF is built with: one static binary, pinned by version and by the
 * SHA-256 digests GitHub publishes for each release asset. `bun run typst` fetches it into bin/.
 * Upgrading means a new version and new digests here, and a look at the template: Typst changes
 * between minor versions.
 */
export const TYPST_VERSION = "0.15.1";

const RELEASE = `https://github.com/typst/typst/releases/download/v${TYPST_VERSION}`;

export const TYPST_ASSETS: Record<string, { file: string; sha256: string }> = {
  "linux-x64": {
    file: "typst-x86_64-unknown-linux-musl.tar.xz",
    sha256: "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c",
  },
  "linux-arm64": {
    file: "typst-aarch64-unknown-linux-musl.tar.xz",
    sha256: "5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee",
  },
  "darwin-x64": {
    file: "typst-x86_64-apple-darwin.tar.xz",
    sha256: "7f9fdd9584866245de9a79e0add8f9236fae6f40a8a45e2c4771ccc14db4e0fa",
  },
  "darwin-arm64": {
    file: "typst-aarch64-apple-darwin.tar.xz",
    sha256: "48f62ed034aa3a7978309579ac6ca00045e2ef0da73114e8af27cfd8e74dc05a",
  },
};

export const typstUrl = (file: string) => `${RELEASE}/${file}`;

/** Where the binary lives once fetched (gitignored). */
export const TYPST_BIN = fileURLToPath(new URL("../../bin/typst", import.meta.url));
