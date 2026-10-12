# Build plan

Every decision in `research/DECISIONS.md` (rounds 1-18) that is not built yet, in build order. A loop works through it: each iteration takes the next unblocked item, builds it with tests, verifies it (in the browser for UI, to the polish bar), commits, pushes and ticks it here.

**Legend:**
- `[x]` done
- `[~]` in progress
- `[ ]` to do
- ⛔ blocked, with what unblocks it

Blocked items are built behind an interface with a development fallback where that is possible, and stay marked until the founder supplies what they need.

## Already built (before this plan)

- Landing page and bairro waitlist (rounds 7-13, 17).
- App:
  - map, rail, item page, Placar, Bairro and Você (rounds 15-16);
  - report flow with photos, duplicate check and questão pública (rounds 3, 4, 15);
  - sign-in pages with Better Auth (rounds 17-18).
- Round 18 items that need no database: declarations, Turnstile and limits, passkeys, the 72 h rule, the apelido rules, "Anônimo em público", and the legal deadline.

## 1. Database foundation (Supabase, São Paulo; Drizzle + drizzle-kit)

The Supabase project `kxawlhmxvghzsynhyvsh` is confirmed in sa-east-1. Every access is server-side; the browser never talks to Supabase.

- [x] **1.1 Connection.** Done 2026-10-12: `db` in `src/server/db/client.ts`, with `bun run db:generate` and `bun run db:migrate`; the Hyperdrive binding comes at deploy (4.5).
  - Drizzle on node-postgres, with a client per request: Workers can't share sockets between requests.
  - Development uses `DATABASE_URL` (the Supabase pooler); production uses a Hyperdrive binding.
  - Migrations live in `apps/web/drizzle/`, managed with drizzle-kit.
- [x] **1.2 Locked down by default.** Verified: `anon` and `authenticated` have no rights in `fala`, and the Data API answers "Invalid schema: fala". App tables live in a schema that the Data API doesn't expose, with RLS on and no anon or authenticated grants.
- [x] **1.3 Better Auth on Postgres.** Done 2026-10-12. Sessions survive a server restart.
  - Drizzle adapter over `fala.users`, `sessions`, `accounts`, `verifications`, `passkeys` and `rate_limits`;
  - rate limits stored in the database, so every isolate shares them;
  - `db` stands for the current request's connection, so the adapter can be built once.
- [x] **1.4 The vault** (round 18, Q5 and Q29). Done 2026-10-12, verified end to end: no row in either schema holds a number.
  - `apps/vault`, its own Worker; the `fala_cofre` schema, reached only by the `fala_cofre` role. The app's `fala_app` role can't read it; anon and authenticated reach neither;
  - the phone as AES-256-GCM ciphertext plus an HMAC-SHA256 lookup, with versioned keys in the Worker's secrets. A link found under an old key is rewritten under the current one;
  - the gateway sends and checks codes (Turnstile, limits per number and per IP, 3 tries, 5 minutes) and answers the same for every number;
  - it hands the app an Ed25519-signed, single-use assertion naming the account. Better Auth's phone plugin is gone: a `/sign-in/vault` endpoint turns a valid assertion into a session;
  - the only RPC is "this account signed in" (passkeys count against dormancy);
  - in production a route must send `/api/identidade/*` to the vault (4.5); in development the app forwards it.
- [x] **1.5 Items in the database.** Done 2026-10-12, verified end to end in the browser (report, confirm with a photo, reload).
  - `fala.items` with `item_events` (append-only; updates are `update_added` events), `item_photos`, `item_confirmations`, and `item_authors`, kept apart so it can move into the vault (1.4); follows come with 2.4;
  - rows store instants; "43 dias", "há 38 min" and "hoje · 13:42" are computed when read, on the municipality's calendar;
  - confirmations are judged inside a row lock (one per account, never the author, the 72 h rule);
  - `bun run db:seed` loads the fixtures as rows marked `demo`, each labelled "exemplo" on cards and on the item page.
- [x] **1.6 Photos in Supabase Storage.** Done 2026-10-12: the private `fotos` bucket (3 MB, WebP and JPEG only, no public reads). The server strips metadata and stores the photo with the secret key; `/api/fotos/$key` streams it; photos of a report that fails to save are removed.
- [x] **1.7 Waitlist persisted** (rounds 6, 12, 17). Stored in `fala.queue_signups`. Confirmation waits on the WhatsApp and e-mail senders (3.1, 3.2), and the done screen says so.
  - sign-ups stored with an unconfirmed status;
  - per-bairro counts from confirmed sign-ups only;
  - the confirmation screen stops saying "nothing is stored".
- [x] **1.8 Round 18 tables.** Done 2026-10-12.
  - [x] apelido reservations (Q28): `fala.nick_reservations`, claimed under a row lock;
  - [x] `AccessEvidence` (Q21), in the vault (`fala_cofre.access_evidence`): every sign-in (code or passkey), publication and confirmation; comments and guest pins record theirs when 2.6 and 2.5 land. Only Cloudflare's headers are read; until the Transform Rule exists (4.5), the port, edge address and transport are null;
  - [x] 6-month deletion with preservation holds (Q23): a daily cron in the vault deletes older evidence and old unlinked phone links, sparing what an active hold covers. A hold lapses after 60 days without a court order. Holds are entered by the operator, with grounds and scope; there is no screen for them;
  - [x] room reserved for nível 2 (Q12): `identityVerified` on the account, no flow.

## 2. Product loop

- [x] **2.1 Placar rule.** An occurrence counts in the statistics after one independent confirmation (Q18). A guest pin needs two (round 2).
- [x] **2.2 Closing a pin** (round 4). Done 2026-10-12, verified in the browser with two accounts and the cron.
  - "Foi resolvido", with an optional photo of the after, from the action grid or the "Está resolvido?" box;
  - the reporter's word, or two neighbours in the same round, closes it; the first vote leaves it "parece resolvido";
  - after 15 days without dispute it closes on its own: a daily cron in the app Worker (`src/server.ts`), dated at the end of the quiet period;
  - "Ainda não" (or "Voltou a acontecer" on a closed pin) reopens it and starts a new round; against the Prefeitura's "resolvido" it counts as disagreement;
  - the Prefeitura's own "resolvido" waits for institutional accounts (later); demo data shows it.
- [x] **2.3 Structured actions, persisted** (round 15). Done 2026-10-12.
  - Confirmo (once, independent, never the author), Continua acontecendo (once a day), Adicionar atualização, Acompanhar;
  - "Adicionar foto atual" from the photo timeline;
  - "Isso também me afeta" and "Tenho informação" for questões públicas;
  - rules in core (`applyAction`), judged under a row lock; signed out, every action sends the person to sign in and back; access evidence recorded for each.
- [~] **2.4 Following** (round 15): home, a route, a bairro or a pin, managed in Você.
  - [x] a single pin ("Acompanhar"), stored in `fala.item_follows`;
  - [ ] home, route and bairro, and the list in Você;
  - notifications for followed items come with 4.2.
- [ ] **2.5 Guest pins** (round 2, Q4):
  - an anonymous session;
  - photo required;
  - held for moderation;
  - access evidence recorded;
  - a secret link to track the pin.
- [ ] **2.6 Forum** (round 5): threads under each pin and one board per bairro, persisted and moderated.
- [ ] **2.7 Moderation** (round 5, Q19, Q31):
  - an automatic pre-screen flags insults, personal names, CPF or phone numbers and children in photos;
  - a queue for volunteer moderators;
  - an opaque id per item;
  - the election-period rule;
  - contestation.
- [~] **2.8 Account lifecycle** (Q20, Q25, Q26, Q32):
  - closing an account;
  - changing number with recent re-authentication;
  - [x] 180-day dormancy: in the vault, which opens a new account and unlinks the old one atomically; passkey sign-ins count;
  - the data-subject request channel, including people without an account.
- [ ] **2.9 Share previews** (rounds 11, 15): a generated share card for `/o/$id` and the bairro pages (photo, days, category), so links read well in WhatsApp.
- [x] **2.10 Emergency notice in the app** (round 11): "Em emergência: Defesa Civil 199 / Bombeiros 193". It now sits at the foot of the report form, with tappable numbers.
- [ ] **2.11 Faces and plates blurred** (round 6). The original stays private, and the public copy is blurred. ⛔ Needs a choice of detection service.

## 3. Services (Elysia on Bun, outside `apps/web`)

- [ ] **3.1 Daily digest at 18h** (round 5):
  - builds the digest for the Ouvidoria;
  - sets `sentAt` (the clock starts there);
  - records protocols when they come back.

  ⛔ Needs an e-mail sender and the Ouvidoria address. A development outbox comes first.
- [ ] **3.2 WhatsApp sender and webhook** (rounds 11, 12, 17):
  - sign-in codes;
  - waitlist confirmation by `wa.me` link with a code.

  ⛔ Needs a provider and the project's number. Development outbox first.
- [ ] **3.3 Open-data API** (round 10):
  - pins and status timelines;
  - locations fuzzed and photos blurred;
  - no reporter data.

  ⛔ Licence to pick: CC BY 4.0 or ODbL.

## 4. Platform

- [ ] **4.1 Installable PWA** (round 11): a manifest, icons, an offline shell, and camera and GPS on cheap Android phones.
- [ ] **4.2 Web push** for followed items.
- [ ] **4.3 Icons to a signage norm** (round 16): CONTRAN, ISO 7001, AIGA/DOT or NBR 9050, kept behind `<Icon>`.
- [ ] **4.4 CARTO basemap** (round 14). ⛔ Needs the key.
- [ ] **4.5 Cloudflare deploy:**
  - Hyperdrive, one config per role (fala_app, fala_cofre);
  - the vault: its secrets (`wrangler secret put`), and a route sending `/api/identidade/*` on the domain to it;
  - the Transform Rule for the client port;
  - the blocking capture test (Q21, Q22).

  ⛔ Needs the domain `falacanoas.com.br` and the Turnstile keys.

## Founder inputs that unblock items

- **E-mail sender and Ouvidoria address:** 3.1.
- **WhatsApp provider and number:** 3.2.
- **Open-data licence:** 3.3.
- **Face and plate detection service:** 2.11.
- **CARTO key:** 4.4.
- **Domains and Turnstile keys:** 4.5.
- **Legal:** associação, privacy notice review, ECA Digital opinion. These gate the public launch, not the build.
