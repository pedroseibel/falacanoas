# Cloudflare Containers for the screening and the resumo: local measurements

2026-10-26. The question: can the two services that can't run in a Worker (apps/triagem with ONNX
Runtime and sharp; apps/digest's PDF with Typst and sharp) run as Cloudflare Containers, so the whole
project stays on Cloudflare? These numbers are **local**: Docker on this workstation (AMD Ryzen 7 2700,
2018), with the CPU and memory of each Containers instance type
([limits](https://developers.cloudflare.com/containers/platform-details/limits/)). Cloudflare's CPUs
may be faster; the image pull on a cold start isn't measured here.

## The screening (apps/triagem)

15 street photos of Canoas (`research/brand/photos`, Wikimedia Commons), re-encoded as the app does
(WebP, longest edge 1600 px). Three models per photo, plus four tiles on large photos. No Arachnid
Shield account, so no network call. `bun research/infra/containers/measure-triagem.ts`.

| Instance | Per photo, ONNX default threads | **Per photo, `TRIAGEM_THREADS` = vCPUs** | Ready (Bun + models) | Peak memory |
|---|---|---|---|---|
| basic (¼ vCPU, 1 GiB) | ~109 s | **~12 s** | 2.2 s | 423 MiB |
| standard-1 (½ vCPU, 4 GiB) | ~40 s | **~5.7 s** | 1.1 s | 454 MiB |
| standard-2 (1 vCPU, 6 GiB) | ~11 s | **~2.8 s** | 0.9 s | 449 MiB |
| standard-3 (2 vCPU, 8 GiB) | ~5.3 s | **~1.5 s** | 0.9 s | 460 MiB |

- **The thread count is the finding.** By default ONNX opens a thread per core it sees (16 here), and
  under a CPU quota smaller than the host that throttles badly. `TRIAGEM_THREADS` pins ONNX and sharp
  to the instance's vCPU count: 4 to 9 times faster on the small instances.
- **Memory isn't the constraint:** about 450 MiB on every size, so even basic's 1 GiB holds.
- **The image is 912 MB** (Bun on Debian, onnxruntime-node's binaries; the models are 21 MB). It will
  weigh on a cold start's pull. Worth slimming before production.

## The resumo's PDF (apps/digest)

`bun run amostra` (24 records, fictional data, 6 bodies, maps and photos), in `oven/bun:1-debian` with
the repository mounted. `bun research/infra/containers/measure-digest.ts`.

| Instance | Map cache empty (101 tiles fetched) | Cache warm | Peak memory |
|---|---|---|---|
| basic (¼ vCPU, 1 GiB) | ~18 s | ~18 s | ~190 MiB |
| standard-1 (½ vCPU, 4 GiB) | ~10 s | ~10 s | ~180 MiB |
| standard-2 (1 vCPU, 6 GiB) | ~6 s | ~6 s | ~160 MiB |

Once a day, it fits any instance. A container that just woke has no tile cache; fetching the tiles
didn't change the time.

## What it would cost (estimate, from the
[pricing](https://developers.cloudflare.com/containers/pricing/))

The Workers Paid plan (US$ 5/month) includes 25 GiB-hours of memory, 375 vCPU-minutes and 200 GB-hours
of disk a month; memory and disk count while the container runs, CPU only while busy.

- **The screening on basic:** about 12 s a photo plus the time the container stays awake after it
  (30 s, say) is about 45 GiB-seconds; 25 GiB-hours is 90,000, so **about 2,000 photos a month fit in the
  plan**. CPU: 3 vCPU-seconds a photo against 22,500 included.
- **The screening on standard-1:** about 37 s awake at 4 GiB is about 150 GiB-seconds, **about 600 photos
  a month in the plan**, then about US$ 0.0004 a photo.
- **The resumo:** 10 to 20 s a day, a few GiB-hours a month.

So at launch's scale both fit in the US$ 5 plan. Cold starts and Cloudflare's own CPU speed are what a
real deployment still has to measure, along with where the `SAM` region actually runs.
