# CLAUDE.md

Fala Core and its first instance, **Fala, Canoas**: an independent, open-source (AGPL-3.0) civic map for Canoas, RS. Residents pin urban problems; a public clock counts the days until neighbours confirm the fix.

Read before changing anything:

- `PRODUCT.md` is the product truth.
- `DESIGN.md` is the visual system.
- `research/DECISIONS.md` holds every founder decision, by round.

## Commands (Bun, from the repo root)

```bash
bun install            # workspaces: apps/*, packages/*, instances/*
bun run dev            # apps/web on :3100 (TanStack Start + Vite + Cloudflare plugin), with apps/vault beside it
bun run build          # production build of apps/web
bun run deploy         # build + wrangler deploy (Cloudflare Workers)
bun test               # all tests (bun test)
bun run lint           # oxlint + @shadcn/lint
bun run format         # prettier
bun run typecheck      # tsc (TypeScript 7, native) in every workspace
bun run db:generate    # drizzle-kit: SQL migration from src/server/db/schema.ts (add --custom for hand-written SQL)
bun run db:migrate     # apply the app's and the vault's migrations (admin connection; Supabase, São Paulo)
bun run db:roles       # after migrating: the app, vault and open-data roles get their logins (writes .dev.vars in dev)
bun run db:seed        # replace the demo items (demo = true) with the fixtures; real reports are untouched
bun run vault:keys     # development: the vault's keys, and the app's copy of its public key, into .dev.vars
bun run push:keys      # development: the VAPID key pair web push signs with, into apps/web/.dev.vars
bun --filter @fala/web moderator:add <apelido> [bairro…]   # who moderates (all bairros, or some); moderator:remove
bun --filter @fala/web requests                             # open data-subject requests; `requests answered <protocolo> [nota]`
bun --filter @fala/digest agora                             # one daily digest now (development: the e-mail lands in apps/digest/outbox/)
bun --filter @fala/digest protocolo <código> <número> [data] # the protocol the Ouvidoria answered with, on a sent pin
bun --filter @fala/whatsapp mensagem <número> <texto…>     # development: a message as if sent to the project's WhatsApp
bun --filter @fala/dados dev                                # the open-data API on :3400 (read-only, role fala_dados)
```

First run: copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars` and fill `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `DATABASE_URL` (the `postgres` pooler string) and the Supabase keys. Then `bun run vault:keys`, `bun run push:keys`, `bun run db:migrate`, `bun run db:roles` and `bun run db:seed`.

The landing page is the web app's `/` route; the app's map is `/mapa`. The static landing and the clickable prototype were retired once ported (they live in git history).

## Layout

- `packages/core` (`@fala/core`): domain only. Zod schemas and inferred types; the event-sourced item model; the two status axes (community vs public authority); geo and format helpers. No React, no I/O.
- `instances/canoas` (`@fala/instance-canoas`): the municipal instance, versioned as config (`defineMunicipality`): categories, agencies, bairros, geo, branding. `./fixtures` holds fictional demo data, validated with the core schemas; `db:seed` loads its items as rows marked `demo`, which the UI labels "exemplo".
- `apps/web` (`@fala/web`): TanStack Start on Cloudflare Workers. `/` is the landing page (`features/landing`: the bairro queue sign-up); the app lives under `/mapa`, `/o/$id`, `/placar`, `/bairro/$slug`, `/voce`. Accounts: Better Auth on Postgres (`src/server/auth.ts`, mounted at `/api/auth/$`), signing in from the vault's assertions. In development, sign-in codes are not sent: the page shows them.
- `apps/vault` (`@fala/vault`): the identity vault (DECISIONS round 18, Q29), its own Cloudflare Worker with its own secrets and database role (`fala_cofre` schema). It owns the phone (AES-GCM ciphertext plus a lookup HMAC, versioned keys), sends and checks codes (Turnstile, limits, the 180-day rule) and answers with an Ed25519-signed assertion naming the account. In production a route sends `/api/identidade/*` straight to it, so the app never receives a number; the app reaches it otherwise only through the `VAULT` service binding. Never add phone handling to `apps/web`.
- `apps/cards` (`@fala/cards`): share cards (DECISIONS rounds 11 and 15), its own Worker behind the `CARDS` service binding. The app describes a card (`src/server/share-cards.ts`, `/api/cartao/*`); this Worker draws the 1200×630 PNG with Satori and resvg. No database, no secrets. `bun --filter @fala/cards preview` renders samples to /tmp. Satori stays at 0.32: later versions embed harfbuzz, which Workers can't compile.
- `apps/digest` (`@fala/digest`): the 18h digest to the Ouvidoria (DECISIONS round 5), Elysia on Bun with a cron. It reads and marks the app's tables over plain SQL (the app owns the schema); sending is what starts each report's public clock (`sent_at`). Development writes the e-mail to `outbox/` and never schedules itself; production refuses to send until a sender is configured.
- `apps/whatsapp` (`@fala/whatsapp`): the project's WhatsApp number, inbound (DECISIONS rounds 12 and 17), Elysia on Bun. "CONFIRMAR XXXX" confirms a queue sign-up, "SAIR" deletes it; the rules are core's `whatsapp.ts`. The number itself is instance config (`branding.whatsapp`). Sign-in codes never pass through it: the vault sends them. Development replies land in `outbox/`; production answers 501 until a provider is plugged in behind `Provider`.
- `apps/dados` (`@fala/dados`): the open-data API (DECISIONS round 10), Elysia on Bun: JSON pages, GeoJSON and CSV of the pins and their timelines, under the instance's `openDataLicence` (production won't start without one). It reads the `dados` views as `fala_dados`, never the tables; shaping and the data dictionary are core's `open-data.ts`. Photos stay out until faces and plates are blurred (2.11).
- **Standalone backend services**, when one is needed (the WhatsApp webhook, the 18h digest job, the public open-data API): **Elysia** on Bun. Don't add them to `apps/web`. (The vault is the exception: round 18 makes it a Worker behind a service binding.)

## Hard rules (lint-enforced where possible)

- **No `useEffect`.** Use derived state, event handlers, TanStack Query or Store, keyed remounts, React 19 ref callbacks, or `useMountEffect` (`apps/web/src/hooks/use-mount-effect.ts`), the only file allowed to import `useEffect`.
- **No `as` type assertions** (`consistent-type-assertions: never`). Use type guards, `satisfies`, or Zod parsing. JSON imports are parsed with the core schemas, never cast.
- **Thin routes, feature-first UI.** `apps/web/src/routes/` only holds `createFileRoute`, loaders, `head`, search validation (Zod adapter) and small adapters that pass params and search as props. Product UI lives in `apps/web/src/features/<domain>/`. Feature modules must not call `createFileRoute`, `Route.use*`, `useParams` or `useSearch`.
- **All data access goes through server functions** (`apps/web/src/server/`), on Supabase Postgres (São Paulo) with Drizzle (`src/server/db/`). App tables live in the `fala` schema, which the Data API doesn't expose; RLS on, no grants to `anon`/`authenticated`. The app connects as `fala_app`, which can't read the vault's `fala_cofre`; the open-data API connects as `fala_dados`, which reads only the `dados` views (published, real pins with fuzzed points; no authors or residents' words), so a new column stays private until a view adds it; migrations run with `DATABASE_ADMIN_URL`. The browser never talks to Supabase. Use `db` (`src/server/db/client.ts`): it stands for the current request's connection, opened on first use (Workers can't share sockets). A `src/server/` module that browser code imports (to call its server functions) must export only server functions and types: a plain exported helper that touches the database drags `pg` into the browser bundle ("Buffer is not defined"). Put such helpers in their own module (as `moderation-store.ts` beside `moderation.ts`). Rows store instants; readings like "43 dias" are computed when read (`src/server/items-model.ts`). Photos go to the private `fotos` bucket in Supabase Storage, server-side with the secret key, and are served by `/api/fotos/$key`: to everyone only once moderation approved them on a published pin (`item_photos.review`), to moderators otherwise. Every new photo starts pending; never insert one as approved outside the seed.
- **UI primitives:** shadcn/ui on **Base UI** (`components.json` style `base-nova`). Add components with `bunx --bun shadcn@latest add <name>`. Theme variables map onto the DESIGN.md tokens in `src/styles/globals.css`; don't introduce raw colors. Ink is `primary`. Orange is the `signal` variant, reserved for the main action, the clock and the selected place (the DESIGN.md Three Places Rule).
- **TanStack everywhere it fits:** Router/Start, Query (server state), Store (client state shared with imperative surfaces such as the map), Table (Placar and lists), Virtual (long rails), Form (report flow), Pacer (debounce), Charts (`@tanstack/charts` + `/react`).
- **Charts follow the dataviz skill.** Validate any palette with its validator before shipping. The neutral ordinal ramp and the meter colors are already validated (see `src/styles/app.css`). Big numbers use sans with proportional figures; mono and `tabular-nums` only for aligned columns.
- **Icons are temporary.** The category pictograms will be redrawn to a signage norm (traffic signs, public-information pictograms). Keep them behind `<Icon name>` in `src/components/Icons.tsx`. UI chrome uses lucide.
- **Data truth:** demo data is always labelled "exemplo / dados fictícios". Never invent figures on public surfaces; real numbers are footnoted to `research/`.
- pt-BR, "você", non-partisan. The scoreboard names bodies, never people.

## Testing

`bun test`. Put tests next to the code (`*.test.ts`). Domain logic in `packages/core` must be covered. Keep form parsing and derivations in plain functions so they're testable without the DOM.

## Commits

Conventional Commits (`feat(web): …`, `fix(core): …`). Imperative, scoped subjects.
