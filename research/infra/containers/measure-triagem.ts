/**
 * Measures the screening service (apps/triagem) under the CPU and memory of Cloudflare Containers'
 * instance types, locally with Docker: time to ready (Bun start and model load; not the image pull),
 * time per photo cold and warm, and peak memory. Photos: research/brand/photos, re-encoded as the app
 * does (WebP, longest edge 1600 px).
 *
 *   docker build -f apps/triagem/Dockerfile -t fala-triagem:medida .
 *   bun research/infra/containers/measure-triagem.ts
 */
import { $ } from "bun";
import { readdirSync } from "node:fs";
import sharp from "../../../apps/triagem/node_modules/sharp";

// basic gets three photos: at ¼ vCPU a full pass took over 15 minutes.
const TYPES = [
  { name: "basic", cpus: 0.25, mem: "1g", limit: 3 },
  { name: "standard-1", cpus: 0.5, mem: "4g", limit: 99 },
  { name: "standard-2", cpus: 1, mem: "6g", limit: 99 },
  { name: "standard-3", cpus: 2, mem: "8g", limit: 99 },
];
const IMAGE = "fala-triagem:medida";
/** THREADS=1 pins ONNX and sharp to the instance's vCPU count (TRIAGEM_THREADS); unset, the default. */
const PIN = process.env.THREADS === "1";
const TOKEN = crypto.randomUUID() + crypto.randomUUID();
const dir = new URL("../../brand/photos/", import.meta.url).pathname;
const photos = await Promise.all(
  readdirSync(dir)
    .filter((f) => f.endsWith(".jpg"))
    .toSorted()
    .map(async (f) => ({
      name: f,
      bytes: await sharp(`${dir}${f}`).rotate().resize(1600, 1600, { fit: "inside" }).webp({ quality: 82 }).toBuffer(),
    })),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const mib = (s: string) => {
  const m = /([\d.]+)\s*(KiB|MiB|GiB|B)/.exec(s);
  if (!m) return 0;
  const v = Number(m[1]);
  return m[2] === "GiB" ? v * 1024 : m[2] === "KiB" ? v / 1024 : m[2] === "B" ? v / 1048576 : v;
};

for (const [i, t] of TYPES.entries()) {
  const port = 35100 + i;
  const t0 = performance.now();
  const id = (
    await $`docker run -d --rm --cpus ${t.cpus} --memory ${t.mem} -e TRIAGEM_THREADS=${PIN ? Math.max(1, Math.ceil(t.cpus)) : ""} -e TRIAGEM_TOKEN=${TOKEN} -e HOST=0.0.0.0 -p 127.0.0.1:${port}:3500 ${IMAGE}`.text()
  ).trim();
  let ready = 0;
  while (!ready && performance.now() - t0 < 120_000) {
    const ok = await fetch(`http://127.0.0.1:${port}/saude`).then((r) => r.ok).catch(() => false);
    if (ok) ready = performance.now() - t0;
    else await sleep(100);
  }
  let peak = 0;
  let sampling = true;
  const sampler = (async () => {
    while (sampling) {
      peak = Math.max(peak, mib(await $`docker stats --no-stream --format {{.MemUsage}} ${id}`.text()));
      await sleep(250);
    }
  })();
  const pass = async () => {
    const out: number[] = [];
    for (const p of photos.slice(0, t.limit)) {
      const s = performance.now();
      const r = await fetch(`http://127.0.0.1:${port}/triagem`, {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "image/webp" },
        body: p.bytes,
      });
      if (!r.ok) throw new Error(`${t.name} ${p.name}: HTTP ${r.status} ${await r.text()}`);
      await r.arrayBuffer();
      out.push(performance.now() - s);
    }
    return out;
  };
  const first = await pass();
  const warm = await pass();
  sampling = false;
  await sampler;
  await $`docker stop ${id}`.quiet();
  console.log(
    JSON.stringify({
      type: t.name,
      threads: PIN ? Math.max(1, Math.ceil(t.cpus)) : "padrão",
      readyMs: Math.round(ready),
      firstPhotoMs: Math.round(first[0] ?? 0),
      medianColdPassMs: Math.round(median(first)),
      medianWarmMs: Math.round(median(warm)),
      maxWarmMs: Math.round(Math.max(...warm)),
      peakMiB: Math.round(peak),
      photos: Math.min(photos.length, t.limit),
    }),
  );
}
