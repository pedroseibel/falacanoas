# Build plan

Every decision in `research/DECISIONS.md` (rounds 1-18) that is not built yet, in build order. A loop works through it: each iteration takes the next unblocked item, builds it with tests, verifies it (in the browser for UI, to the polish bar), commits, pushes and ticks it here.

**Legend:**
- `[x]` done
- `[~]` in progress
- `[ ]` to do
- ⛔ blocked, with what unblocks it

Blocked items are built behind an interface with a development fallback where that is possible, and stay marked until the founder supplies what they need.

## Already built (before this plan)

- Landing page and bairro waitlist (rounds 7-13, 17). The sign-up is validated but not stored.
- App:
  - map, rail, item page, Placar, Bairro and Você (rounds 15-16);
  - report flow with photos, duplicate check and questão pública (rounds 3, 4, 15);
  - sign-in pages with Better Auth (rounds 17-18).
- Round 18 items that need no database: declarations, Turnstile and limits, passkeys, the 72 h rule, the apelido rules, "Anônimo em público", and the legal deadline.

## 1. Database foundation (Supabase, São Paulo; Drizzle + drizzle-kit)

The Supabase project `kxawlhmxvghzsynhyvsh` is confirmed in sa-east-1. Every access is server-side; the browser never talks to Supabase.

- [x] **1.1 Connection.** Done 2026-10-12: `db()` in `src/server/db/client.ts`, with `bun run db:generate` and `bun run db:migrate`; the Hyperdrive binding comes at deploy (4.5).
  - Drizzle on node-postgres, with a client per request: Workers can't share sockets between requests.
  - Development uses `DATABASE_URL` (the Supabase pooler); production uses a Hyperdrive binding.
  - Migrations live in `apps/web/drizzle/`, managed with drizzle-kit.
- [x] **1.2 Locked down by default.** Verified: `anon` and `authenticated` have no rights in `fala`, and the Data API answers "Invalid schema: fala". App tables live in a schema that the Data API doesn't expose, with RLS on and no anon or authenticated grants.
- [ ] **1.3 Better Auth on Postgres:**
  - Drizzle adapter, with its tables in the app schema;
  - rate-limit storage in the database;
  - the passkey table.
- [ ] **1.4 The vault** (round 18, Q5 and Q29):
  - a separate schema and database role;
  - the phone stored as AES-GCM ciphertext plus a keyed HMAC, with keys in the environment, versioned;
  - narrow operations only (look up an account by phone, send a code, record evidence);
  - the phone plugin keeps working through an adapter layer, never by swapping in a token and hoping.
- [ ] **1.5 Items in the database:**
  - items, events, photos, confirmations, updates and follows;
  - the server functions read and write the database;
  - fixtures become seed data, still labelled "exemplo".
- [~] **1.6 Photos in Supabase Storage:** a private `fotos` bucket (created 2026-10-12: 3 MB, WebP and JPEG only). The server strips metadata and stores the photo; `/api/fotos/$key` streams it.
- [x] **1.7 Waitlist persisted** (rounds 6, 12, 17). Stored in `fala.queue_signups`. Confirmation waits on the WhatsApp and e-mail senders (3.1, 3.2), and the done screen says so.
  - sign-ups stored with an unconfirmed status;
  - per-bairro counts from confirmed sign-ups only;
  - the confirmation screen stops saying "nothing is stored".
- [ ] **1.8 Round 18 tables:**
  - apelido reservations (Q28);
  - `AccessEvidence` (Q21);
  - 6-month deletion with preservation holds (Q23);
  - room reserved for nível 2 (Q12).

## 2. Product loop

- [x] **2.1 Placar rule.** An occurrence counts in the statistics after one independent confirmation (Q18). A guest pin needs two (round 2).
- [ ] **2.2 Closing a pin** (round 4):
  - The Prefeitura may say "resolvido".
  - The pin closes when the reporter or two neighbours confirm (ideally with an "after" photo), or after 15 days without dispute.
  - "Ainda não" reopens it.
- [ ] **2.3 Structured actions, persisted** (round 15):
  - Confirmo, Continua acontecendo, Adicionar atualização, Acompanhar;
  - "Adicionar foto atual" (a photo timeline);
  - "Isso também me afeta" and "Tenho informação" for questões públicas.
- [ ] **2.4 Following** (round 15): home, a route, a bairro or a pin, managed in Você.
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
- [ ] **2.8 Account lifecycle** (Q20, Q25, Q26, Q32):
  - closing an account;
  - changing number with recent re-authentication;
  - 180-day dormancy;
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
  - Hyperdrive;
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
