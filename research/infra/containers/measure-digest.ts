/**
 * Measures the resumo's PDF (apps/digest, `bun run amostra`: 24 records of fictional data) under the
 * CPU and memory of Cloudflare Containers' instance types, locally with Docker. The repository is
 * mounted; the map-tile cache starts empty (a container that just woke has none) or warm (the
 * repository's cache), and the outbox is a scratch tmpfs. Reports wall time and peak memory.
 *
 *   bun research/infra/containers/measure-digest.ts
 */
import { $ } from "bun";

const REPO = new URL("../../../", import.meta.url).pathname;
const TYPES = [
  { name: "basic", cpus: 0.25, mem: "1g" },
  { name: "standard-1", cpus: 0.5, mem: "4g" },
  { name: "standard-2", cpus: 1, mem: "6g" },
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mib = (s: string) => {
  const m = /([\d.]+)\s*(KiB|MiB|GiB|B)/.exec(s);
  if (!m) return 0;
  const v = Number(m[1]);
  return m[2] === "GiB" ? v * 1024 : m[2] === "KiB" ? v / 1024 : m[2] === "B" ? v / 1048576 : v;
};
const uid = (await $`id -u`.text()).trim();
const gid = (await $`id -g`.text()).trim();

for (const cache of ["vazio", "quente"] as const)
  for (const t of TYPES) {
    const mounts = [
      "-v", `${REPO}:/repo`,
      "--mount", "type=tmpfs,destination=/repo/apps/digest/outbox,tmpfs-mode=1777",
      ...(cache === "vazio" ? ["--mount", "type=tmpfs,destination=/repo/apps/digest/cache,tmpfs-mode=1777"] : []),
    ];
    const t0 = performance.now();
    const id = (
      await $`docker run -d --cpus ${t.cpus} --memory ${t.mem} --user ${uid}:${gid} -e HOME=/tmp ${mounts} -w /repo/apps/digest oven/bun:1-debian bun scripts/amostra.ts`.text()
    ).trim();
    let peak = 0;
    let running = true;
    while (running) {
      const state = (await $`docker inspect -f {{.State.Running}} ${id}`.text()).trim();
      running = state === "true";
      if (running) peak = Math.max(peak, mib(await $`docker stats --no-stream --format {{.MemUsage}} ${id}`.text()));
      else break;
      await sleep(250);
    }
    const ms = performance.now() - t0;
    const code = (await $`docker inspect -f {{.State.ExitCode}} ${id}`.text()).trim();
    const log = (await $`docker logs ${id}`.text()).trim().split("\n").at(-1);
    await $`docker rm ${id}`.quiet();
    console.log(JSON.stringify({ cache, type: t.name, wallMs: Math.round(ms), peakMiB: Math.round(peak), exit: code, last: log }));
  }
