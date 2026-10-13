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
  - [x] `AccessEvidence` (Q21), in the vault (`fala_cofre.access_evidence`): every sign-in (code or passkey), publication and confirmation; comments (2.6) and guest pins (2.5) record theirs. Only Cloudflare's headers are read; until the Transform Rule exists (4.5), the port, edge address and transport are null;
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
- [x] **2.4 Following** (round 15). Done 2026-10-12, verified in the browser.
  - a single pin ("Acompanhar"), in `fala.item_follows`;
  - a home (a point and a radius of 300 m, 500 m or 1 km), bairros and a route (two ends, a 400 m corridor along the line between them), in `fala.follows`; core's `covers` decides what each one holds;
  - Você lists them with how many problems are open in each, adds and removes them; notices go by web push (4.2), and by WhatsApp once 3.2 lands;
  - "Meus registros" now comes from the server by authorship, so "Anônimo em público" reports show to their owner.
- [x] **2.5 Guest pins** (round 2, Q4). Done 2026-10-12, verified in the browser.
  - "Registrar sem conta" on /entrar, below the phone sign-in, opens an anonymous session (limited per IP);
  - the guest form: occurrences only, photo required, a Turnstile check made by the vault (which holds the secret), up to 3 a day, shown as Anônimo;
  - held for moderation (`moderation = pending`): off the map and the lists, no actions, `noindex`, until 2.7 publishes it;
  - access evidence recorded (`guest_pin`);
  - a secret link `/o/ID?chave=…` (only its SHA-256 is stored) is the guest's way back; without it the pin answers 404;
  - published guest pins count in the Placar after two independent confirmations (2.1).
- [x] **2.6 Forum** (round 5): threads under each pin and one board per bairro, persisted and moderated. Done 2026-10-12, verified in the browser with a neighbour and a moderator.
  - `fala.threads`, `fala.posts`, `fala.post_reports`; the demo boards (55 topics, 23 replies) are seeded as `demo` and labelled "exemplo";
  - the bairro page: open a topic, pick one, reply; the pin's page: "Conversa", which starts with its first reply;
  - signed with the apelido, nível 1; the pre-screen refuses CPFs, phone numbers, insults and named people before anything is posted, with a sentence that says what to take out;
  - "Denunciar" on each reply (not your own), once per person; `/moderar` lists reported replies for the moderator's bairros, never their own, to hide or keep. Hidden replies stay in the database and leave every page;
  - access evidence recorded (`comment`).
- [x] **2.7 Moderation** (round 5, Q19, Q31). Done 2026-10-12, verified in the browser with an author and two moderators.
  - the pre-screen (core): CPFs (check digits), phone numbers, strong insults, a title before a name, and electoral wording during the instance's campaign window (Canoas 2026: 16 Aug to 25 Oct). Reports it flags wait for a moderator; updates are refused with a sentence that says what to take out; children in photos waits on 2.11's detection service;
  - every guest pin opens a case too;
  - `/moderar`, for moderators added with `bun run moderator:add <apelido> [bairro…]` (all bairros, or some): the item, its flags, a random handle per item and how many of the same author's posts were refused before, never who they are; moderators never see cases for their own posts;
  - the election rule: signed political content goes out; anonymous propaganda is held, and the moderator can ask for it to be republished signed;
  - every decision goes into the item's history; the author (by session, or a guest by the pin's link) can contest, and someone other than the deciding moderator judges the contest.
- [x] **2.8 Account lifecycle** (Q20, Q25, Q26, Q32). Done 2026-10-12.
  - [x] closing an account (2026-10-12, verified in the browser): in Você, after a code to the number already on the account, which the vault looks up by account (the app never sees it). Reports, confirmations and replies stay public, unlinked from the account; an apelido that signed anything stays reserved; profile, sessions, passkeys, follows and votes go. The vault unlinks the number and keeps it 6 months with the access evidence (`account_closed`), then the daily purge deletes it. The app's deletion commits only if the vault accepted the code;
  - [x] changing number with recent re-authentication (verified in the browser, with a second session that the change ended). In Você: re-authenticate with a code to the current number, a passkey, or a sign-in under 5 minutes old; the app then gets a ticket from the vault, and the browser takes it and the new number to `/api/identidade/troca/*`, so the app never sees it. The vault refuses the same number and a number with a live account (a dormant one gives way, as at sign-in), swaps the links in one transaction, records `phone_changed`, and tells the old number without naming the new one (once WhatsApp is connected, 3.2). The app updates the hint, restarts the 72-hour wait for confirmations (a new number, Q17), and ends every other session. No manual recovery: without the old number or a passkey, a new account;
  - [x] 180-day dormancy: in the vault, which opens a new account and unlinks the old one atomically; passkey sign-ins count;
  - [x] the data-subject request channel, including people without an account (2026-10-12, verified in the browser as a visitor, a guest and a member). `/privacidade/pedido`, linked from every item page ("Você aparece neste registro?") and from Você: who is asking, what they want, the pin, the request and an e-mail for the answer; a protocol (`PD-…`) and 15 days to answer (LGPD art. 19). No document asked for: a member's request carries the session, a guest's secret link proves the pin is theirs (only the match is stored, never the key), others get Turnstile through the vault. Members also get "Baixar meus dados" (a JSON of everything the account holds). The controller lists and closes requests with `bun run requests` / `requests answered <protocolo>`; answers go by e-mail. Left for the notice's next version (with the legal review): link the form beside the e-mail, and set how long requests are kept;
- [x] **2.9 Share previews** (rounds 11, 15): a generated share card for `/o/$id` and the bairro pages (photo, days, category), so links read well in WhatsApp. Done 2026-10-12, verified against the dev server and in rendered samples.
  - `apps/cards`, its own Worker behind the `CARDS` service binding: Satori 0.32 (the last without harfbuzz, which Workers can't compile) and resvg draw a 1200×630 PNG after og.png: the clock in orange, the title, category and bairro, the photo in the tray, or the bairro's outline with the pin's dot. WebP photos are decoded (jsquash) and cropped to the tray, since resvg reads only PNG and JPEG. Demo data carries "exemplo · dados fictícios". No database, no secrets; 1.3 MB gzipped;
  - the app describes the card (`/api/cartao/o/$id`, `/api/cartao/bairro/$slug`) and caches each PNG under its versioned link, so a card is drawn once per state; pins in moderation get none;
  - full Open Graph and Twitter tags with absolute links on both pages, the description saying "Exemplo, dados fictícios" for demo data;
  - ⛔ production: drawing takes about a second of CPU, beyond the free plan's 10 ms per request, so it needs Workers Paid (founder decision). Until then the link falls back to the pin's photo, or og.png.
- [x] **2.10 Emergency notice in the app** (round 11): "Em emergência: Defesa Civil 199 / Bombeiros 193". It now sits at the foot of the report form, with tappable numbers.
- [ ] **2.11 Faces and plates blurred** (round 6). The original stays private, and the public copy is blurred. ⛔ Needs a choice of detection service.
- [ ] **2.12 Optional video, up to 30 s** (round 1). Not built on purpose: a clip catches far more bystanders than a photo, and round 6 requires faces and plates blurred in public, so video waits for 2.11's service to handle frames too. It also needs server-side remuxing to strip the container's metadata (MP4 can carry the recording's GPS position) and a size and length check before storage. ⛔ After 2.11.

## 3. Services (Elysia on Bun, outside `apps/web`)

- [x] **3.1 Daily digest at 18h** (round 5). Done 2026-10-12 with a development outbox, verified against the dev database.
  - `apps/digest`, Elysia on Bun: a cron at the instance's digest hour and time zone (18h, São Paulo) takes the published, real occurrences not sent yet and sends one e-mail in the Fala's name, the CAC in copy (`buildDigest` in core). Entries are grouped by the body responsible: code, category, bairro, title, text, the point with an OpenStreetMap link, photo links, when it was registered, neighbour confirmations and the pin's page. Never who reported, never demo data or held pins;
  - only after the e-mail goes out, one transaction keeps the digest (`fala.digests`), sets `sent_at` (the public clock starts there) and adds "Enviado à Prefeitura no resumo diário" to each history. A failed send marks nothing, so the next run retries; a session advisory lock keeps runs from overlapping;
  - protocols: `bun --filter @fala/digest protocolo <código> <número> [data]` sets the number and date on a sent pin (never before the send) and adds it to the history; the page shows it with the legal deadline;
  - development writes each e-mail to `apps/digest/outbox/` as an `.eml` and doesn't schedule itself (`bun --filter @fala/digest agora` runs one), so a dev process never starts real reports' clocks. `POST /resumo` (bearer token) runs one by hand; `GET /saude` shows the schedule and the last run;
  - ⛔ production: needs an e-mail sender and the Ouvidoria and CAC addresses (`DIGEST_FROM`, `DIGEST_TO`, `DIGEST_CC`). Until a sender exists, production refuses to send, and no clock starts. Reading protocols from the replies (by hand for now) can follow the sender.
- [x] **3.2 WhatsApp sender and webhook** (rounds 11, 12, 17). Done 2026-10-12 with a development outbox, verified from the landing's sign-up to the confirmed count.
  - `apps/whatsapp`, Elysia on Bun, the project's number inbound: "CONFIRMAR XXXX" from the signed-up number confirms the place in the bairro's queue (the person writes first, so it costs the project nothing), and the reply says how many are missing; "SAIR" deletes the sign-up; anything else gets, once a day per number, a note on what the number does and the emergency numbers. The rules are core's (`whatsapp.ts`): a bare code counts only when it could be one, and numbers that arrive without the ninth digit (accounts from before it) still match;
  - the instance's number is config (`branding.whatsapp`): with it, the landing's done screen turns on "Confirmar no WhatsApp" (a `wa.me` link with the code written in);
  - a `+55` typed or pasted on the landing is no longer stored twice (`5555…`), and numbers with extra digits are refused;
  - sign-in codes don't pass through this service: the vault sends them itself (its `Outbox`), so the phone never leaves it. In development the sign-in page shows them, as before;
  - development: `bun --filter @fala/whatsapp mensagem <número> <texto>`, or `POST /dev/mensagem`, plays a message as if it came from WhatsApp; replies are appended to `apps/whatsapp/outbox/mensagens.txt`;
  - ⛔ production: needs a provider (Meta's Cloud API or a BSP on it) and the number. Then: the provider's webhook (signature and parsing, behind `Provider`; `/webhook` answers 501 until then), its sender for replies, and the vault's delivery for codes (an authentication template) and number-change notices. E-mail confirmation links wait on the e-mail sender (3.1).
- [x] **3.3 Open-data API** (round 10). Done 2026-10-12, verified against the dev database with test pins (no apelido, resident's text or exact point in any response).
  - `apps/dados`, Elysia on Bun: `/v1/registros` (JSON pages, filters by bairro, category, status and "changed since"), `.geojson`, `.csv`, `/v1/registros/{código}` with its timeline, and `/v1/historico.csv`; the index at `/` carries the licence, the data dictionary and what is left out. Open to any site (CORS), cached five minutes;
  - privacy in the database, not just the code: migration 0015 adds the `dados` views and the `fala_dados` role, which can read them and no table (checked: refused on `fala`, `fala_cofre` and writes). The views hold only published, real pins, with the point moved to the centre of its 0.001° cell (about 100 m, the same on every download), and timelines where only the project and public bodies are named or quoted. Titles and residents' text stay out (they can name other people); each record links to its page;
  - the days on the public clock, the category's and bairro's names and the responsible body are added from the instance (core `open-data.ts`); CSV fields that a spreadsheet would run as formulas are defused;
  - ⛔ the licence: CC BY 4.0 or ODbL (`openDataLicence` in the instance). Until it's picked, the index says the data can't be reused yet, and production refuses to start. Photos join once faces and plates are blurred (2.11).

## 4. Platform

- [x] **4.1 Installable PWA** (round 11): a manifest, icons, an offline shell, and camera and GPS on cheap Android phones. Done 2026-10-12, verified on a production build: the worker installs, caches the shell, and serves the offline page (in Geist) with the server down.
  - `manifest.webmanifest` (start at /mapa, standalone, shortcuts to Mapa, Placar and Você); icons drawn from the favicon's mark by `bun --filter @fala/cards icons` (any, maskable, Apple touch);
  - `public/sw.js`, registered in production builds only: pages from the network with `/offline` when there's none; the build's hashed assets, fonts and icons cached as they're used. No data, server functions, photos or other origins are cached;
  - the photo field already offers camera or gallery (`accept="image/*"`); locating retries with the network's position when a cheap phone's GPS times out.
- [x] **4.2 Web push** for followed items. Done 2026-10-12, verified end to end against a stand-in push service (it decrypted each message as a browser would and checked the VAPID signature), and the Você control in the browser.
  - triggers: a followed pin gets an update, a photo, or is closed by neighbours (confirmations and "continua acontecendo" stay quiet); a new pin is published inside a followed place (at once, or when moderation publishes it). Never to whoever did it;
  - RFC 8291 encryption and RFC 8292 VAPID on WebCrypto (`src/server/web-push.ts`, tested against the RFC's worked example): push services carry the message but can't read it. The wording is core's (`notices.ts`); one notice per pin (`tag` and `topic`), so a newer one replaces an older one;
  - sent after the response (`waitUntil`, through `src/server/background.ts`); dead subscriptions (404/410) are deleted; closing the account deletes them all; signing out stops this device's first;
  - Você → Acompanhando: "Avisos neste aparelho", on or off, or why not (unsupported, iPhone outside the installed app, blocked, not configured);
  - keys: `bun run push:keys` in development; production stores VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY as Worker secrets (4.5).
- [x] **4.3 Icons to a signage norm** (round 16). Done 2026-10-12, checked at every size the app uses (13 to 36 px), at 2× and in both themes.
  - the norm: public-information pictograms, ISO 7001's construction in the public-domain AIGA/DOT drawing style, with the CONTRAN subject where a traffic sign already shows it (the traffic light, the pedestrian, the road surface), never its warning plates. NBR 9050 covers accessibility symbols, which no category needs yet;
  - eleven category pictograms and the "Agora" clock, redrawn as solid single-ink silhouettes on a 24-unit grid: 2.5-unit limbs, gaps of at least 2. Each shows the object (a tire in the hole, a car in water, a drop over a grate, a tied bag, a brick pile, a street lamp, a tree, a pedestrian on broken pavement, a pipe pouring out, a traffic light, a speech balloon with "!");
  - the 28 unused prototype glyphs are gone from the sprite; interface icons stay lucide. DESIGN.md has the rules (Pictograms).
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
- **Open-data licence:** 3.3 (CC BY 4.0 or ODbL; set `openDataLicence` in the instance).
- **Face and plate detection service:** 2.11, then 2.12 (video).
- **CARTO key:** 4.4.
- **Workers Paid plan:** 2.9 (share cards need the CPU time; until then links fall back to the photo or og.png).
- **Domains and Turnstile keys:** 4.5.
- **Legal:** associação, privacy notice review, ECA Digital opinion. These gate the public launch, not the build.
