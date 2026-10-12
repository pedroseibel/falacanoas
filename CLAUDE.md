# CLAUDE.md

Fala Core and its first instance, **Fala, Canoas**: an independent, open-source (AGPL-3.0) civic map for Canoas, RS. Residents pin urban problems; a public clock counts the days until neighbours confirm the fix.

Read before changing anything:

- `PRODUCT.md` is the product truth.
- `DESIGN.md` is the visual system.
- `research/DECISIONS.md` holds every founder decision, by round.

## Commands (Bun, from the repo root)

```bash
bun install            # workspaces: apps/*, packages/*, instances/*
bun run dev            # apps/web on :3100 (TanStack Start + Vite + Cloudflare plugin)
bun run build          # production build of apps/web
bun run deploy         # build + wrangler deploy (Cloudflare Workers)
bun test               # all tests (bun test)
bun run lint           # oxlint + @shadcn/lint
bun run format         # prettier
bun run typecheck      # tsc (TypeScript 7, native) in every workspace
```

The landing page is the web app's `/` route; the app's map is `/mapa`. The static landing and the clickable prototype were retired once ported (they live in git history).

## Layout

- `packages/core` (`@fala/core`): domain only. Zod schemas and inferred types; the event-sourced item model; the two status axes (community vs public authority); geo and format helpers. No React, no I/O.
- `instances/canoas` (`@fala/instance-canoas`): the municipal instance, versioned as config (`defineMunicipality`): categories, agencies, bairros, geo, branding. `./fixtures` holds fictional demo data, validated with the core schemas.
- `apps/web` (`@fala/web`): TanStack Start on Cloudflare Workers. `/` is the landing page (`features/landing`: the bairro queue sign-up); the app lives under `/mapa`, `/o/$id`, `/placar`, `/bairro/$slug`, `/voce`.
- **Standalone backend services**, when one is needed (the WhatsApp webhook, the 18h digest job, the public open-data API): **Elysia** on Bun. Don't add them to `apps/web`.

## Hard rules (lint-enforced where possible)

- **No `useEffect`.** Use derived state, event handlers, TanStack Query or Store, keyed remounts, React 19 ref callbacks, or `useMountEffect` (`apps/web/src/hooks/use-mount-effect.ts`), the only file allowed to import `useEffect`.
- **No `as` type assertions** (`consistent-type-assertions: never`). Use type guards, `satisfies`, or Zod parsing. JSON imports are parsed with the core schemas, never cast.
- **Thin routes, feature-first UI.** `apps/web/src/routes/` only holds `createFileRoute`, loaders, `head`, search validation (Zod adapter) and small adapters that pass params and search as props. Product UI lives in `apps/web/src/features/<domain>/`. Feature modules must not call `createFileRoute`, `Route.use*`, `useParams` or `useSearch`.
- **All data access goes through server functions** (`apps/web/src/server/`). Fixtures today, Supabase (São Paulo) tomorrow, behind the same functions.
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
