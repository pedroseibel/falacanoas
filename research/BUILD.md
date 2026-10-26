# Build plan

Every decision in `research/DECISIONS.md` (rounds 1-20) that is not built yet, in build order. A loop works through it: each iteration takes the next unblocked item, builds it with tests, verifies it (in the browser for UI, to the polish bar), commits, pushes and ticks it here.

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
- [x] **2.10 Emergency notice in the app** (round 11): at the foot of the report form, with tappable numbers. Since 2026-10-26 the numbers are instance config (`emergency`) and follow what the Prefeitura publishes (6.0).
- [ ] **2.11 Faces and plates blurred** (round 6). The original stays private, and the public copy is blurred. ⛔ Needs a choice of detection service.
- [ ] **2.12 Optional video, up to 30 s** (round 1). Not built on purpose: a clip catches far more bystanders than a photo, and round 6 requires faces and plates blurred in public, so video waits for 2.11's service to handle frames too. It also needs server-side remuxing to strip the container's metadata (MP4 can carry the recording's GPS position) and a size and length check before storage. ⛔ After 2.11.
- [x] **2.13 Ponto de referência and the address** (research/digest-pdf, founder input). Done 2026-10-13, verified in the browser from the form to the pin page.
  - an optional "Ponto de referência" under the map in the report form (80 characters; "use algo público, nunca a casa de alguém"), and the same question in the WhatsApp flow (PULAR skips it). It goes through the pre-screen with the text, shows on the page and in the moderator's card, and stays out of the open data (residents' words);
  - the street and number near the point, looked up once after the response (`src/server/address.ts`): one call to OpenStreetMap's Nominatim from the server, with only the point, never repeated and never from a job (its usage policy). A number only when the address found is within 40 m, the street within 150 m; otherwise nothing. GEOCODER_URL for a self-hosted Nominatim, GEOCODER=off to turn it off;
  - the page shows "Rua …, 123 (aproximado)" and the reference under the byline; the resumo's records carry both ("Endereço", "Referência"), the nearest street from the map data only when no address was found;
  - the privacy notice names Nominatim (version 2026-10-13.4).

## 3. Services (Elysia on Bun, outside `apps/web`)

- [x] **2.14 Reports that survive a dropped connection.** Done 2026-10-13, verified in the browser with the response lost after the server got the report (one pin, not two) and with the send failing outright (sent the moment the connection came back).
  - a member's report is kept on the phone (IndexedDB: the fields and the prepared photos) from the moment Publicar is pressed until the server answers (`features/report/outbox.ts`; rules in `outbox-model.ts`). A send that fails on the connection, or takes more than two minutes, leaves it there: the dialog says "Guardado neste celular", and a toast says what's waiting, with "Tentar agora";
  - while the app is open it goes on its own: at once when the connection comes back, when the app returns to the screen and on start; otherwise on a backing-off timer (10 s, then up to 15 minutes). One at a time, oldest first. A report the server refuses waits for the person ("Tentar de novo" or "Descartar");
  - every send carries a key the phone made (`items.client_key`): a retry after a lost response gets the same pin back, checked before the daily limits so it isn't refused by them, and a race between two sends ends with one pin;
  - guest pins can't wait (their robot check expires), so they fail as before. Joins and photo updates still need the connection at the moment. A service worker's Background Sync (sending after the app is closed, on Android) is the natural next step.
- [x] **3.1 Daily digest at 18h** (round 5). Done 2026-10-12 with a development outbox, verified against the dev database.
  - `apps/digest`, Elysia on Bun: a cron at the instance's digest hour and time zone (18h, São Paulo) takes the published, real occurrences not sent yet and sends one e-mail in the Fala's name, the CAC in copy (`buildDigest` in core). Entries are grouped by the body responsible: code, category, bairro, title, text, the point with an OpenStreetMap link, photo links, when it was registered, neighbour confirmations and the pin's page. Never who reported, never demo data or held pins;
  - only after the e-mail goes out, one transaction keeps the digest (`fala.digests`), sets `sent_at` (the public clock starts there) and adds "Enviado à Prefeitura no resumo diário" to each history. A failed send marks nothing, so the next run retries; a session advisory lock keeps runs from overlapping;
  - protocols: `bun --filter @fala/digest protocolo <código> <número> [data]` sets the number and date on a sent pin (never before the send) and adds it to the history; the page shows it with the legal deadline;
  - development writes each e-mail to `apps/digest/outbox/` as an `.eml` and doesn't schedule itself (`bun --filter @fala/digest agora` runs one), so a dev process never starts real reports' clocks. `POST /resumo` (bearer token) runs one by hand; `GET /saude` shows the schedule and the last run;
  - the PDF (2026-10-13, research/digest-pdf): the resumo laid out for the people who act on it, attached to the e-mail. A first page that says what is asked; the city map; one section per body, each starting on its own page so it can be forwarded as is, with its map, an index, and one record per report (street map, facts, QR code, approved photos). Typst (pinned, `bun --filter @fala/digest typst`), tagged PDF/A-2a and PDF/UA-1; maps drawn from cached OpenFreeMap vector tiles. Each resumo is numbered in its year, and `fala.digests` keeps the number and the PDF's SHA-256. A PDF that fails to build doesn't hold the reports back: the text goes alone. `bun --filter @fala/digest amostra [n]` builds one from the fictional data;
  - protocols read from the replies (2026-10-13, verified in development from a resumo to the pin page): `POST /respostas` (bearer `DIGEST_REPLIES_TOKEN`) takes a reply as raw e-mail; `bun --filter @fala/digest respostas ler <arquivo.eml>` hands one in by hand. The reply is tied to its resumo by In-Reply-To/References or the number in its subject, and only its own text is read: the quoted resumo (Gmail's "Em … escreveu:", Outlook's "De:/Enviado:", ">" lines) is cut, so its codes and the example protocol never count. Core's `protocol-reply.ts` finds NUPs, protocolos, memorandos and ofícios, and ties them to the resumo's codes on the same line or the next; one protocol and no codes covers the whole resumo, without replacing a protocol a report already has. What's clear is applied at once only from a Prefeitura address (the domains of `DIGEST_TO`/`DIGEST_CC`) that our receiving server authenticated (DMARC pass in the topmost Authentication-Results, from `DIGEST_AUTHSERV`) or that the operator handed in; a protocol is never dated after the reply arrived. Anything else, codes mentioned without a protocol, numbers it can't place, and every request for more information (a complementação suspends the deadline), waits in `fala.digest_replies` for `respostas`, `respostas aplicar <id> [CÓDIGO=PROTOCOLO…]` or `descartar`. The history names the body that answered, never a person;
  - ⛔ production: needs an e-mail sender and the Ouvidoria and CAC addresses (`DIGEST_FROM`, `DIGEST_TO`, `DIGEST_CC`). Until a sender exists, production refuses to send, and no clock starts. For replies, mail to the sender address must reach `/respostas`: Cloudflare Email Routing with a small Email Worker that posts `message.raw` (authserv `mx.cloudflare.net`), or the sender's own inbound webhook if it gives the raw message. The pilot e-mail (research/canoas) will show how the Ouvidoria and the CAC really answer; adjust the reading to it.
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
- [x] **3.4 Registering by WhatsApp** (round 9: "a reporting bot comes later"). Done 2026-10-13, verified in development from the first photo to the pin on the map, and joining it from a second account.
  - the same report as the form, one question at a time: "REGISTRAR" or a photo starts it; up to 4 photos, the place as a WhatsApp location, the type by number, a few words (a photo's caption counts), then SIM for the apelido or ANÔNIMO. A similar open problem within 50 m is offered first, and 1 adds the photos to it as a confirmation. CANCELAR ends it; a report left 30 minutes starts over. The rules are core's (`whatsapp-report.ts`);
  - members only (round 18, nível 1): a number the vault doesn't know, or a dormant link, is told to sign in once on the site with that phone and pick an apelido. The service asks the vault (`POST /api/identidade/whatsapp/conta`, bearer `WHATSAPP_VAULT_TOKEN`) for a two-minute assertion naming the account, under its own audience (`fala-whatsapp`), so it can never sign anyone in; then the app (`POST /api/whatsapp/registro`, bearer `WHATSAPP_APP_TOKEN`) acts for that account. The app never receives the number. Lookups are capped at 40 a day per number and 300 every 15 minutes in all, so a leaked token can't walk the phone book;
  - everything the form goes through still applies: daily limits, the pre-screen, sanctions, every photo pending moderation and the known-material check. Photos are re-encoded in the service (sharp: upright, 1600 px, JPEG, no metadata). Access evidence records the account and the time with `transport: "whatsapp"` and no address: the person's connection is WhatsApp's;
  - drafts live in the service's memory only, one message at a time per number (photos sent together arrive as simultaneous deliveries); a restart loses them. "CONFIRMAR XXXX" and "SAIR" keep working mid-report; CANCELAR there ends the report, not the queue sign-up;
  - the privacy notice gained a part on WhatsApp (version 2026-10-13.3);
  - development: `bun --filter @fala/whatsapp mensagem <número> --foto <arquivo> [legenda]` and `--local <lat,lng>`, sent to the running service (`bun --filter @fala/whatsapp dev`) so the conversation carries over; tokens default to fixed development values;
  - ⛔ production: the provider (3.2) with `media()` for photos, and the two tokens set in the vault, the app and the service. Without them the service only handles the queue, and its notes don't mention registering.

- [x] **3.5 Monthly report per body.** Done 2026-10-13, verified in development from test pins to the PDF served at /relatorios.
  - core's `monthly-report.ts`: per body, the month's reports sent to the Prefeitura, protocols received, fixes confirmed by neighbours (how many within the 30-day reference, median days from the resumo to the fix, from three), what was open on the month's last day and how much of it past the deadline, where (by bairro) and the five oldest. It counts as the Placar does (confirmed reports only), so the page and the PDF never disagree. Bodies in alphabetical order, not ranked;
  - apps/digest builds it on the 1st at 08h for the month that just ended (`0 8 1 * *`; `POST /mensal`; `bun --filter @fala/digest mensal [AAAA-MM]`), with Typst like the resumo (`pdf/mensal.typ`, tagged PDF/A-2a and PDF/UA-1): page 1 sets every body side by side and says how it's counted; then one page per body, to be forwarded as it is. A month is built once and kept (`fala.monthly_reports`: the figures, the PDF and its SHA-256); a month with nothing real sent has nothing to report. `bun --filter @fala/digest amostra-mensal` shows the layout with the fictional data, marked AMOSTRA;
  - /relatorios lists them, with the totals and each file's SHA-256, and `/api/relatorio/$mes` serves the PDF; the Placar links there.
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

## 5. Abuse safeguards (round 19)

- [x] **5.1 A first look at every photo.** Done 2026-10-13, verified end to end in the browser with a test author and a test moderator.
  - `item_photos.review` (pending, approved, removed) and who sent each photo; one first-look case per photo on a published pin; a held pin's photos are judged with it;
  - readers get approved photos only, and a count shown as "em análise" (the viewer's tile, or the panel when there's no photo yet);
  - the digest waits for a pin's photos to be looked at and links only approved ones; followers hear of a new photo when it's approved;
  - the queue groups a pin's new photos: approve all, or mark some to remove with one reason.
- [x] **5.2 "Denunciar"** on pins, photos and updates (`content_reports`, one open case per target). Visitors pass Turnstile (the vault accepts the `denuncia` action); neighbours at nível 1 send up to 30 a day. Hide first per core's `hidesAtOnce`. A Dialog on desktop, a Drawer on phones.
- [x] **5.3 Takedown and contests.** Moderators remove a pin, photo or update from the report dialog ("Remover agora") or decide a report in the queue. Each removal goes into the history with its reason; removed updates keep their place without their words. Whoever sent a removed photo or update sees why on the pin and can contest. Refusals count against that person, through the case's target. Images reported for nudity or a child are blurred for moderators until they choose to look.
- [x] **5.4 Photo serving.** `/api/fotos/$key` is public only for approved photos on published pins (an hour's cache and an ETag); moderators see the rest; everyone else gets a 404. Removed photos stay in the private bucket, unserved.
- [x] **5.5 Sanctions** (round 20). Done 2026-10-13, verified in the browser; the automatic mute was checked against the database in a rolled-back transaction.
  - removals weigh none, strike or grave;
  - automatic 30-day mutes; moderators mute from a case card, and a suspension waits for a second moderator;
  - the person sees it on Você and contests; the controller uses `bun --filter @fala/web sanction`;
  - new-account and daily limits (core's `postingLimits`).
- [x] **5.6 A wider pre-screen** (round 20). Done 2026-10-13.
  - "Expõe uma pessoa": a singular neighbour, someone tied to a house, number or car, and plates;
  - apelidos with insults or official-sounding words are refused;
  - the rule shows beside both text boxes.
- [~] **5.7 Automatic image screening** (round 20). Built and verified in development on 2026-10-13. ⛔ Needs a São Paulo host to run in production.
  - **The service**, `apps/triagem`: Elysia on Bun with ONNX Runtime and sharp, and a Dockerfile.
  - **The models**: NudeNet 320n, Ultra-Light RFB-640 for faces and YOLOv9-t-384 for plates, pinned by SHA-256. Faces and plates are also searched in four tiles of large photos.
  - **The app** screens each upload in the background and records the result (`photo_screens`). The queue puts likely nudity first, blurred, and tags "N rostos" and "N placas".
  - **Spot test** on public photos: 17 faces in a crowd, 6 at a busy crossing, plates on close-ups. A 15-pixel profile face was missed, which is why the human first look stays.
- [ ] **2.11 follow-up: switch the public copy to blurred.** The service's `/borrar` exists. Before turning it on, label 200–300 real Canoas photos and measure recall on faces, grey plates and Mercosul plates, with a bar of about 95%.
- [~] **5.8 Hash matching for known abuse material**, at upload, before any volunteer sees a photo (research/legal/hash-matching.md). Built 2026-10-13 and verified with a stand-in Shield and the dev database.
  - The screening service computes PDQ (`apps/triagem/src/pdq.ts`, within 0–2 bits of Meta's reference hashes) at 512 px and in eight orientations at full resolution, and asks Arachnid Shield's `/v1/pdq` with the fingerprints only. The worst class wins; a fingerprint with quality under 50 isn't sent.
  - The app stores each verdict and Shield's database version (`photo_screens`). With `HASH_MATCHING` required (production's default), a pending photo reaches no moderator and no photo route until it clears; a held pin waits for all its photos; publishing an unchecked photo is refused on the server. A retry runs every 10 minutes, and moderators see how many photos are waiting and for how long.
  - A `csam` match is escalated with no one having seen it (`source = hash_match`, the class and match type kept for the report); other matches wait for the controller (`escalation matches`, `escalation conferir`).
  - The escalation's purge now waits for the authority's validation (`escalation validated`), per Portaria MJSP 1.312/2026. The privacy notice says what leaves Brazil.
  - ⛔ Needs C3P's written answers and the registration (credentials into the service's environment), and counsel's confirmation.
- [x] **5.9 Moderation capacity.** Done 2026-10-13, verified in the browser from the request to the first look at the queue.
  - A public guide at `/moderacao` ("Como moderamos"): what to keep, what to remove asking for another photo, the weight of a removal, the note the person reads, child abuse material (never open again, copy or forward), intimate images, neutrality, privacy, and caring for oneself. Linked from the transparency report.
  - A moderator accepts the current guide on their first visit to `/moderar`, and again when it changes (`MODERATION_GUIDE_VERSION`). Deciding and judging contests are refused until then; escalating child abuse never is.
  - Members ask to moderate from Você (bairros and an optional note); the operator decides: `moderator applications`, `approve <apelido> [bairro…]`, `decline <apelido> <nota>`. `moderator volunteers` counts the confirmed waitlist sign-ups that offered to moderate, per bairro.
  - The ten-minute job pushes to a bairro's moderators when cases there have waited more than three hours, at most every six hours each. Photos still waiting for the known-material check don't count.
- [x] **5.9 Escalation of child abuse material** (round 20). Done 2026-10-13, verified end to end with test accounts.
  - one step from the queue or "Remover agora": removed, unviewable even to moderators, preserved, account suspended;
  - the controller's `bun --filter @fala/web escalation` covers list, reported, received, purge and contest.
- [x] **5.10 Retention** (round 20). Done 2026-10-13: the daily job deletes removed photos' bytes six months after removal, never under an open contest or an escalation.
- [x] **5.11 Transparency report** (round 20; the STF tese on art. 19). Done 2026-10-13: `/transparencia`, counted live by month for the last 12 months on Canoas's calendar. It covers photos looked at and removed, the median time to a first look, reports, removals, contests and those won, sanctions, escalations to the authorities, and data-subject requests. Only counts, never people or content. The privacy notice links to it and now covers the screening, sanctions and retention (version 2026-10-13).

## 6. Rain flooding (research/alagamentos)

- [x] **6.0 Emergency numbers.** Done 2026-10-26. The report form, the FAQ and the landing footer read `emergency` from the instance: Defesa Civil de Canoas 24 h, (51) 98255-0805 (phone and WhatsApp), Bombeiros 193, and alerts by SMS to 40199 with the CEP. "Defesa Civil 199" is gone: the Prefeitura's page lists 199 as the Polícia Civil. A test keeps it out until the SDCRC confirms it.
- [x] **6.1 Rain gauge archive.** Done 2026-10-26, verified against the live feed (five readings kept, none twice).
  - The instance's `rain`: Cemaden's five gauges in Canoas (7324–7328), named as in Cemaden's feed, placed from GeoCanoas's `Pluviometro` layer, with the feed and each station's page.
  - Core's `rain.ts` reads the feed: the last 10-minute value and the 1–96 h accumulations, times in UTC. Cemaden writes "-" for a window with no rain (never a numeric 0), read as 0 mm.
  - apps/digest reads it every 10 minutes (`2-59/10`) into `fala.rain_readings`, one row per gauge per time it measured, so a silent gauge adds nothing and a repeated run nothing twice. `/saude` shows the last run. Development schedules it only with `DIGEST_RAIN=1`; `bun --filter @fala/digest chuva` reads once.
  - ⛔ The archive only grows while the service runs: until apps/digest is deployed, run it somewhere with `DIGEST_RAIN=1`. Within 96 h a gap still has its totals; older is lost.
- [x] **6.2 Questions on "rua que alaga".** Done 2026-10-26, verified in the browser (desktop dialog and phone drawer) and on the record.
  - Three optional questions on the types the instance marks `asks: "flooding"` (Canoas: "Rua que alaga toda chuva"): what the person saw (bueiro entupido, valeta cheia, casa de bombas parada, rio alto, não sei), whether it's raining now, and how long the water stayed (under 1 h, 1–3 h, over 3 h, still there). Core's `flooding.ts`.
  - The form asks them as choice chips under "Sobre a água"; tapping an answer again clears it. WhatsApp asks them after the ponto de referência, one at a time, each skipped with PULAR (there, "não" answers the rain question), and reads them back before publishing.
  - Stored in `items.flooding` (jsonb), only when something was answered; the record shows them under "Sobre a água, segundo quem registrou". Drafts queued on a phone before this change still go through. Not in the open data (the `dados` views name their columns).
- [x] **6.3 The day's rain on each flooding record.** Done 2026-10-26, verified on a record against the live archive and in the resumo's sample (veraPDF: PDF/UA-1 and PDF/A-2a pass).
  - "Nesse dia, X mm em 24 h no pluviômetro Y, a Z km.", with its source under it: Cemaden, automatic gauge, the largest 24 h total measured that day and at what time, linking to the station's page. A dry day reads "nenhuma chuva em 24 h".
  - The gauge is the nearest (within 10 km) that measured anything on the record's local day; one that was silent is passed over for the next. Read with the record (`rain-day.ts`), never stored, so it follows the archive.
  - The resumo's record carries the resident's answers ("Segundo quem registrou: …") and this line, in the e-mail and the PDF. Records from before the archive (2026-10-26) have none.

## Founder inputs that unblock items

- **E-mail sender and Ouvidoria address:** 3.1.
- **WhatsApp provider and number:** 3.2.
- **Open-data licence:** 3.3 (CC BY 4.0 or ODbL; set `openDataLicence` in the instance).
- **Face and plate detection service:** 2.11, then 2.12 (video).
- **Registration with Arachnid Shield** (or PhotoDNA, or Google's Content Safety API): 5.8.
- **Where the screening service runs** (a São Paulo host: Fly `gru` or a Brazilian VPS), for 5.7 and 2.11.
- **For escalations:** a designated person and a backup; counsel's review of `research/legal/abuso-infantil-e-imagens-intimas.md`; and Nidus registration once the associação exists. These gate the launch.
- **CARTO key:** 4.4.
- **Workers Paid plan:** 2.9 (share cards need the CPU time; until then links fall back to the photo or og.png).
- **Domains and Turnstile keys:** 4.5.
- **Legal:** associação, privacy notice review, ECA Digital opinion. These gate the public launch, not the build.
- **Defesa Civil:** confirm with the SDCRC whether 199 reaches them (6.0).
