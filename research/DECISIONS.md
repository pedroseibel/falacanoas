# FalaCanoas: decision log

Captured from the product interview, started 2026-10-11. Each line is a decision the founder made. Options that were offered and not chosen are listed where they explain the choice. Research behind each topic lives in the sibling folders.

## Round 1: purpose and stance

- **Who runs it:** an independent civic project run by citizens and volunteers. No affiliation with the Prefeitura. Open source and non-partisan.
- **Relationship with the Prefeitura:** a public scoreboard, plus official replies from the Prefeitura in-app through a verified account. *Not chosen:* turning every pin into an official filing; a neighbour-only map with no government contact.
- **The landing page's first job:** collect early sign-ups. *Not chosen for now:* reporting on day one, recruiting contributors, pitching to press and funders.
- **First persona:** the engaged neighbour who already posts problems in bairro Facebook and WhatsApp groups.

## Round 2: identity

- **Public identity:** a pseudonym plus the person's bairro. Real identity is never shown.
- **Verification:** a phone code (WhatsApp/SMS) is enough to post. Stronger proof unlocks confirming others' pins, voting and the forum. CPF is optional and stored only as a keyed hash (see `identity/`).
- **Guests:** anyone can drop a pin without an account. Guest pins are held for moderation and don't count on the scoreboard until verified neighbours confirm them.
- **Scoreboard clock:** starts when FalaCanoas notifies the Prefeitura, not when the pin is posted.

## Round 3: scope and media

- **Categories:** the core zeladoria list, about 10 types, each mapped to one responsible secretaria.
- **Off the map:** crime and violence; complaints that name a person; private disputes between neighbours. Candidates and parties were not excluded here; see round 5.
- **Evidence:** at least one photo (up to 4) is required; a video of up to 30 s is optional. Guest pins always need a photo.
- **Faces and plates:** photos are published as-is.

## Round 4: the accountability loop

- **Safeguards for as-is photos:** anyone pictured can ask for a blur or a removal. Children's faces are blurred on request within 24 h. EXIF and GPS metadata are always stripped to protect the reporter.
- **Closing a pin:** the Prefeitura can reply "resolvido". The pin closes only when the reporter or two neighbours confirm, ideally with an "after" photo, or after 15 days without dispute.
- **Duplicates:** before posting, the app shows pins of the same type within about 50 m. "Eu também" adds weight, with an optional fresh photo.
- **The scoreboard ranks:** secretarias by median days from notification to confirmed fix; bairros by open problems; categories by fix rate. *Not chosen:* naming contractors.

## Round 5: forum, politics, moderation, notification

- **Forum:** threads under each pin, plus one board per bairro for issues bigger than a single pin.
- **Political content:** allowed and moderated for civility. *Not chosen:* the recommended "institutions yes, campaigns no". The risk is noted in `legal/`: under the electoral law (art. 9-E), propaganda flagged by electoral authorities must be removed "imediatamente".
- **Moderation:** an automatic pre-screen flags content (insults, personal names, CPF or phone numbers, children in photos) and bairro volunteer moderators decide.
- **Notification:** a daily digest from FalaCanoas, in its own name, to the Ouvidoria (e-mail and/or Fala.BR), with the CAC in copy. The send time starts the public clock. If a protocol number comes back, it is recorded and shown.

## Round 6: legal posture and sign-up

- **Photos (revised after the legal brief):** faces and licence plates are **blurred automatically** in public. The original is kept privately for moderation and court orders. Removal requests and EXIF/GPS stripping stay. This replaces the round 3/4 "as-is" choice.
- **Minimum age:** 18+. The ECA Digital law has been in force since 2026-03-17.
- **Entity:** stay informal. *Not chosen:* the recommendation to incorporate an associação before user content goes live. Risks recorded in `legal/`: the founders carry personal liability for content and data, and the STF thesis on Temas 987/533 expects a legal-entity representative. Revisit before the app opens to the public.
- **Landing-page sign-up:** bairro is required (one of the 18 official bairros). The person chooses WhatsApp or e-mail as their channel. An optional "posso ajudar com…" covers moderating, coding or spreading the word. This powers a per-bairro counter.

## Round 7: name and landing-page content

- **Name:** the display name is **"Fala, Canoas"**, with the comma (a vocative: "Speak up, Canoas"). The domain and handles use `falacanoas`. An independence line sits beside the name.
- **Polish bar:** modern SaaS sites such as Linear, Vercel, Resend and Supabase, in the founder's words. This sits alongside the gov-br concept's evidence discipline.
- **Hero (delegated to Claude):** a product-shot hero. The headline and the sign-up (bairro + channel) sit beside a crisp render of the real Canoas bairro map, with labelled example pins and one floating pin card showing the loop: photographed → Prefeitura notified 12 days ago → neighbours confirm. Further down, the same map becomes the live "quem já entrou, por bairro" map. To be revisited at the comp stage.
- **Numbers:** real Canoas data, footnoted, in the gov-br discipline. Scoreboard previews are labelled "exemplo".
- **Pronoun:** "você", standard pt-BR. *Not chosen:* the regional "tu".

## Round 8: visual identity

- **Theme:** light and dark are both designed from the start with tokens, and the page follows the system setting.
- **Direction:** "A régua" (the gauge) plus one signal colour. FalaCanoas measures time: tick marks, tabular numbers, "aberto há 43 dias" counters. The palette is neutral (ink, graphite, paper) with one orange, taken from the bus shelter, meaning "needs attention". The logo's ticks double as the scoreboard scale.
- **Type:** an open-licence grotesk (e.g. Geist or Inter) for everything, plus its mono for counters, dates, protocols and footnotes. Not Rawline.
- **Photography:** the UI and the map lead. A few credited Commons photos of Canoas appear inside pin cards and in one full-bleed moment.

## Round 9: build and launch

- **Stack:** static HTML/CSS/vanilla JS with no build step, like gov-br: an inline SVG map and a small amount of JS. The only server piece is the sign-up endpoint.
- **Sign-up data:** Supabase in the São Paulo region (Postgres, row-level security). It becomes the app's database later, with PostGIS.
- **Who is behind it:** a named founder plus volunteers ("Feito por [nome] e voluntários de Canoas"). The founder is the LGPD controller named in the privacy notice. Volunteers may stay pseudonymous.
- **Launch:** each bairro opens when a threshold of neighbours has joined. The hero map shows progress per bairro.

## Round 10: openness and money

- **Code licence:** AGPL-3.0, the same as FixMyStreet, Decidim and Consul.
- **Open data:** a public export and API of pins and status timelines under CC BY 4.0 or ODbL (to be picked at app build). It contains no reporter data; locations are fuzzed and photos blurred.
- **Funding:** the founder funds it; no donations while the project is informal. The page carries a public pledge: "Não aceitamos dinheiro de governos, partidos ou candidatos."
- **Analytics:** none. The sign-up counter is the only metric. No cookies, no banner.

## Round 11: the product the page describes

- **Bairro threshold:** scaled to population, about 1 sign-up per 300 residents (Censo 2022), with a floor of 25. The page always shows "faltam X vizinhos".
- **Platform:** an installable web app (PWA) with camera and GPS that runs on cheap Android phones. Native apps maybe later.
- **WhatsApp:** at launch, every pin and bairro page gets a rich share card for spreading into groups. A reporting bot comes later.
- **Floods:** chronic drainage only: "alaga toda chuva", clogged bocas de lobo, pump problems, with history per spot. FalaCanoas is explicitly **not** an emergency channel: "Em emergência: Defesa Civil 199 / Bombeiros 193". No live flood pins, no alert styling.

## Round 12: confirmation, the Prefeitura, domain, next step

- **Confirming a sign-up:**
  - WhatsApp: a button opens a chat with the project's number, pre-filled with a code. Sending it proves the number and records opt-in, at no cost to the project.
  - E-mail: a confirmation link.
  - Only confirmed sign-ups count toward a bairro's threshold.
- **The Prefeitura:** no advance contact. FalaCanoas approaches the Ouvidoria only after real traction (on the order of 1,000 confirmed sign-ups). Until then the page uses the future tense: "a Prefeitura será convidada a responder". It must not say the Prefeitura was already invited.
- **Domain:** `falacanoas.com.br` is primary; .org and .app redirect to it. **The founder must register them; none were registered as of 2026-10-12.**
- **Next step:** write PRODUCT.md, then shape and build the landing page.

## Round 13: visual world (decision page, 2026-10-12)

- **Story confirmed:** a neighbour arrives from WhatsApp, sees the real bairro map, understands that problems are counted in days, trusts the independence, then picks a bairro, confirms and shares.
- **Feels wrong if:** it looks like the Prefeitura, or it feels like an alarm.
- **World:** "claim and proof, monochrome" (software-marketing canon). *Not chosen:* "A régua read like a meter" (the roll); the civic-app standard.
- **Low-population bairros:** Industrial (32 residents), Brigadeira (437) and Ilha das Garças (0) open with the first bairro whose queue fills. This was Claude's assumption, to confirm.

## Round 14: CARTO (2026-10-12)

- **CARTO is used only in the app, later.** The landing page keeps the inline SVG map, with no basemap and no third party.
- **In the app:** MapLibre with CARTO Positron/Dark Matter (no labels) under the bairro layers, and OpenFreeMap as the fallback.
- **Needs:** a free key (e-mail sign-up at carto.com/basemaps/apikey, locked to the domain), plus the attribution "© OpenStreetMap contributors, © CARTO".

## Round 15: the app, and ideas folded in from the earlier concept (2026-10-12)

The app draft covers both phone and desktop at equal weight: map + pin detail, report flow, Placar, bairro page with its board, and Você. The structure is a map with a card rail, chosen on the decision page. Tiles come from OpenFreeMap until a CARTO key exists.

**Decided now:**
- **Time scale:** chronic problems, plus recent updates. Days open stays the core. Pins also show "atualizado há N min" and the community status. Accidents, fires and a crisis mode stay out for now.
- **Identity:** a pseudonym by default, or **Anônimo** per pin. The account still sits behind it, with a warning, and anonymous pins show no reputation hints. This replaces round 2's "pseudonym + bairro only".
- **Questões públicas:** included in the draft. A second kind of item, tied to a place, a bairro or the whole city ("UBS sem pediatra às terças"), with "Isso também me afeta" and "Tenho informação". This extends round 3's scope.
- **Pin colour:** monochrome only. Category is shown by glyph, never by colour.

**Adopted from the earlier concept** (compatible with earlier rounds, no decision needed):
- Each pin is a living timeline. Updates from others enter immediately, and the author can endorse them but can't block them. Nothing is silently rewritten.
- Structured actions instead of likes: Confirmo, Continua acontecendo, Adicionar atualização, Acompanhar.
- Two status lines: the community's and the Prefeitura's. Disagreement between them is shown as information.
- "Adicionar foto atual": a pin's photos form a timeline.
- Duplicate check: "Já existe algo parecido a 35 m → Confirmar e adicionar sua foto".
- Rail sort modes: Perto · Sem solução há mais tempo · Mais confirmados · Recentes.
- Following places: home, route, bairro, a single pin.
- Every pin gets a stable public link with a share preview. Reading never needs an account.
- Principle: "O Fala não decide quem está certo. Ele preserva o que aconteceu."
- Architecture later: Fala Core plus municipal instances (multi-municipality), and an event-sourced history.

## Round 16: building the app (2026-10-12)

- **Stack:** TanStack Start (v1), on Cloudflare (Workers), with Supabase in São Paulo for data.
- **Repo:** a monorepo with `packages/core` (Fala Core), `instances/canoas` and `apps/web`, plus `apps/landing` (the static page and the prototype). The code goes to a private GitHub repo now and goes public later.
- **Charts:** built with the dataviz skill.
- **Icons:** the prototype's hand-drawn glyphs are rejected. Redesign later, following a signage norm (traffic signs, public-information pictograms: candidates are CONTRAN, ISO 7001, AIGA/DOT, NBR 9050). Icons live in one swappable module until then.

## Round 17: one app (2026-10-12)

- **The landing page is part of the web app.** It is the `/` route of `apps/web`, ported to the app's components and tokens (shadcn on Base UI, Tailwind, the same lint rules). Its maps are drawn from the instance's bairro boundaries, not a pasted SVG.
- **URLs:** `/` landing (`?b=` opens a bairro, `?canal=email` picks the channel); `/mapa` map; `/o/$id` item; `/placar`; `/bairro/$slug`; `/voce`.
- **The queue sign-up** goes through a server function validated by `QueueSignupSchema` (core). Until the database exists nothing is stored, and the confirmation says so.
- **Retired:** `apps/landing` (static page) and `apps/landing/app` (clickable prototype). Both remain in git history.
- **Auth: Better Auth** (decided 2026-10-12, over Supabase Auth). Accounts live in our own Postgres, so other cities only need Postgres. Sign-in is a code sent to a Brazilian mobile (WhatsApp first; the sender is ours to plug in). Guests get an anonymous session that upgrades when they verify a phone. Ids are UUIDs, ready for row-level security.
- **Realtime with Better Auth:** phone alerts are sent by the backend (WhatsApp, web push) and don't depend on auth. Live map updates use public Supabase Realtime channels. A private live channel per person, if needed, runs on a Cloudflare Durable Object that checks the session cookie (Supabase only accepts tokens from its listed auth providers).
- **Before launch:** encrypt the phone at rest with a keyed hash for lookup (Better Auth's phone plugin stores it in plain text); connect a WhatsApp/SMS sender; keep Better Auth pinned (1.7.0 to 1.7.2 broke upgrades).

## Round 18: identity and traceability (2026-10-12)

Settled in a `/grill-me` session (questions Q1-Q32, plus Q13b and Q26). **The product decisions on identity are closed. The technical and legal conditions for launching with user content are not met yet** (see "Launch conditions" at the end of this round).

**Principles**
- **Four separate things:**
  - authentication: phone, passkeys;
  - civil identity: optional; the CPF only serves uniqueness;
  - public identity: apelido or "Anônimo em público";
  - whether a report is true: evidence and independent confirmation, never who posted it.
- **Traceability, not identification:** "A plataforma manterá os dados mínimos tecnicamente disponíveis para colaborar com a identificação de autores mediante requisição legalmente válida, sem garantir que a identificação individual seja sempre possível."
  - A phone number identifies a line, not whoever uses the account.
  - An IP can be shared: a home, a public network, CGNAT.
  - Logs let connections be correlated. They don't prove who someone is.
- **Guests are technically traceable within the limits of the logs, not identified.** A declared bairro is not a proven residence.
- **A CPF alone never makes anyone "verified".** A typed or stored CPF proves nothing; only a proof of ownership does.

**Tiers.** This replaces round 2's "stronger proof unlocks confirming others' pins, voting and the forum".
- **Visitante:**
  - reads everything;
  - may drop a guest pin (round 2 kept): photo required, held for moderation, out of the scoreboard until two independent confirmations;
  - no separate unauthenticated channel for sensitive reports: the guest pin covers that case.
- **Nível 1:**
  - the phone code (WhatsApp/SMS) stays the credential; no e-mail;
  - report, confirm, comment and close.
- **Nível 2, optional civil identity:**
  - never gates the core loop; it only adds weight or higher limits where uniqueness matters;
  - **not in the MVP:** the data model reserves room for it, but no flow is built until there is a RIPD, the associação, and a concrete abuse case that justifies it.
- **Institucional (later).** Three invariants fixed now:
  - it never sees authors' identity;
  - it never edits community items; it only adds official events;
  - it belongs to a person tied to the body and is revoked when they leave.

  The proof mechanism is decided when the Prefeitura engages.

**Sign-in and the phone**
- **Passkeys:** optional, offered after the first phone sign-in (Better Auth `passkey` plugin). The phone stays required as the registration link and for recovery.
- **Sending a code:**
  - Cloudflare Turnstile, validated server-side with Siteverify before any message goes out;
  - limits per number, per IP and per time window;
  - Brazilian mobiles only.
- **Changing number:**
  - needs recent re-authentication (a passkey or another factor already on the account) plus a code to the new number;
  - the change revokes risky sessions, is logged, and notifies the previous channels without exposing more than needed;
  - no manual recovery by support based on easily obtained personal data. Without access, the person creates a new account.
- **Recycled numbers:**
  - The rule: after 180 days without signing in, a phone code no longer reopens the old account. It creates a new one, and the old account reopens only with a passkey registered earlier. 180 days is at or above ANATEL's minimum 6-month quarantine (Ato 12.712/2024, Anexo I, item 22.1).
  - The phone is unlinked from the old account atomically. Nothing moves to the new account: no history, followed places, preferences or private items.
  - Accepted cost: someone away for 180 days without a passkey can lose the old account. The interface encourages a passkey before that.
  - Residual risk: a number that changes hands while an old session is still active.

**Civil identity (nível 2), when it comes**
- **Purpose:** uniqueness and anti-manipulation only, after proof of ownership. Accountability rests on the phone and the access logs.
- **Proof path A, first, as a pilot:**
  - The Fala generates a declaration (`userId`, a one-time nonce, an expiry, the declared CPF), and the citizen signs it with gov.br (prata/ouro).
  - The pilot validates the PAdES signature, the gov.br chain (its own PKI, not ICP-Brasil), revocation, the integrity of the signed revision, the `userId`, the nonce and the expiry.
  - A goes on to automation only if the certificate carries the full CPF and it matches the declared CPF. Third-party code reads it from SubjectAltName OID 2.16.76.1.3.1; this is [não verificado] until tested on a real signed PDF. Otherwise A is dropped for uniqueness.
  - A visual check on VALIDAR, which masks the CPF, never substitutes for this proof.
  - Legal basis for accepting the signature: MP 2.200-2, art. 10 §2, with acceptance in the terms of use.
  - Reading the birth date from the certificate for age assurance stays a research hypothesis.
- **Path B:** a KYC vendor (document and selfie; biometrics). Only a contingency, after the RIPD.
- **Path C:** Serpro Consulta CPF or Datavalid. Out as standalone proof; it may come back later as an auxiliary tool.
- **Storage:**
  - The raw CPF is never persisted as account data.
  - The vault keeps `cpf_hmac` (HMAC-SHA256, a per-instance key outside the database), the key version, method, provider, date and validity.
- **Key rotation:**
  - Every record keeps its key version.
  - Old keys stay protected, and only while needed for lookups and migration.
  - Migration means presenting and verifying the CPF again.
  - Old keys are destroyed only after migration finishes or the records expire.
  - Signed documents and temporary files are deleted after verification under the retention policy. Logs, queues and backups must not keep copies.
  - Nível 2 leaves the pilot only with this procedure documented.
- **The same CPF on another account:**
  - a new valid proof moves nível 2 from X to Y in one transaction, so two accounts never hold the same verified identity;
  - both accounts are notified without revealing the other;
  - their contributions stay separate;
  - repeated transfers go to review.
- **Governance lock:** no CPF, selfie or biometric enters before a RIPD done with counsel. This is an internal rule, independent of any specific legal duty.

**Confirmations and the scoreboard**
- **Independent confirmation:**
  - comes from an account other than the author's;
  - its phone was verified at least 72 hours earlier, counted from `phoneVerifiedAt`, not from when the account or session was created;
  - one per account per item.

  Detecting coordinated behaviour comes later.
- **Nível 1 items** enter the 18h digest at once, but count in the Placar statistics only after one independent confirmation.
- **The clock (round 5 kept):**
  - "Dias em aberto" counts from `enviadoEm`.
  - A separate legal-deadline mark (Lei 13.460, 30 days) uses `protocoladoEm` as its working reference when a protocol exists.
  - A protocol is evidence of receipt, not the act that creates the duty. Other formal proof of receipt is kept as well.

**The vault and access**
- **What lives there:** identity data sit in a separate vault: the phone (an encrypted value plus a lookup HMAC), the future `cpf_hmac`, and the access logs. Keys stay outside the database.
- **Who can access it:**
  - Disclosure to third parties follows the legal grounds; Marco Civil records need a court order.
  - Authorized internal processing runs with minimal permissions: authentication, recovery, security, data-subject rights, legal duties.
  - Moderators and institutions never access identity.
  - Any exceptional human access needs a justification, an authorization and an audit trail.
- **The boundary:**
  - The vault runs as its own Worker (a service binding with its own secrets).
  - An auth gateway receives the phone at sign-in. So the app Worker holds no keys at rest and never receives the number.
  - Its RPC operations are narrow and rate-limited, and they answer the same for existing and missing accounts (no account enumeration).
  - This limits the damage of a compromised app Worker; it doesn't remove it.
  - The implementation must not rely on swapping `user.phoneNumber` for a token and assuming Better Auth's phone plugin keeps working unchanged.
- **Moderating "Anônimo em público" items:**
  - each item gets a random opaque identifier: never a global author id, and no reverse lookup;
  - the authorized service computes a recidivism signal, shown in limited form;
  - moderation actions apply through that service.
- **Access evidence** (Marco Civil art. 15; Decreto 8.771 art. 15-A):
  - Recorded on each sign-in, publication, confirmation, comment and guest pin. Never on reads; no full Logpush.
  - Fields: `eventId` (the key), action type, account or guest pin, client IP and port, IP version, the Cloudflare edge destination IP and port, transport, `cf-ray`, and the UTC time to the millisecond.
  - `cf-ray` is only for correlation, since Ray IDs can repeat.
  - The port comes from a Transform Rule copying `cf.edge.client_port` into a request header, along with `cf.edge.server_ip`, `cf.edge.server_port` and `cf.edge.client_tcp`.
- **Retention:**
  - 6 months (Marco Civil art. 15), then automatic deletion.
  - A valid preservation request (art. 15 §2, which refers to art. 13 §§3-4) suspends deletion selectively, with its grounds, scope, start and end documented.
  - That suspension lapses if the authority doesn't seek a court order within 60 days, or if the order is refused. It never becomes indefinite on an administrative request.

**Public identity**
- **The label:** the choice reads "Anônimo em público", with the note that the Fala still links the item to the account. The item still shows "por Anônimo".
- **Not "anonymous":** the service is not marketed as anonymous. CP art. 339 concerns denunciação caluniosa and has specific elements; it does not reach every pseudonymous report.
- **Location:** the user places the point. Device GPS only moves the map and is never published. Occurrences get no extra fuzzing; questões públicas already allow bairro and city reach.
- **Closing an account:** "O encerramento da conta preserva, como regra, o histórico público de ocorrências e contribuições, desvinculado da identidade do autor. Dados cadastrais são eliminados, ressalvadas obrigações legais, determinações de preservação e retenções justificadas de segurança. Solicitações de remoção, ocultação ou anonimização de conteúdo são avaliadas conforme a LGPD, direitos de terceiros e a finalidade documental da plataforma." The anti-fraud HMACs of a suspended account are kept only with a documented purpose, basis and period, never indefinitely.
- **Apelidos:**
  - one that ever signed a public contribution is never reused;
  - one that never published is released after 90 days;
  - a reservation table of normalized names blocks misleading variants. It isn't linked to civil identity and has a documented retention purpose.

**Governance and law**
- **Accounts per instance:** each municipality has its own accounts and its own controller. A shared identity exists only if the Fala itself runs several instances, and then as a separate service that a community instance can ignore.
- **Entity (this reverses round 6's "stay informal"):**
  - Form an associação before opening publishing to the public and before any civil verification, with its governance and duties reviewed by counsel.
  - The waitlist can run before that; LGPD already applies to it.
  - Decreto 8.771 art. 16-A (added by Decreto 12.975/2026) requires a legal-entity representative.
- **Age:**
  - `/bem-vindo` gets two separate confirmations: "Declaro que tenho 18 anos ou mais" and "Confirmo que li o aviso de privacidade". It records the notice version and the time; no birth date.
  - Having read the notice is not consent to optional processing; those need their own specific choices.
  - The checkbox implements the declaration. It does not satisfy age assurance under the ECA Digital; a legal opinion on that is a launch condition.
- **Elections:** in every relevant campaign period, 2026 included:
  - content classified as electoral propaganda can't be published as "Anônimo em público";
  - moderation removes it or asks for it to be republished in a lawful form, and its decisions can be contested;
  - a report about a public service is not propaganda just because it hurts an administration;
  - a pseudonym is not assumed legally sufficient until counsel reviews it (Lei 9.504 art. 57-D);
  - there is no separate product mode.
- **Data-subject rights:**

  | Who asks | How |
  |---|---|
  | Active account | Authenticated session, with re-authentication when needed |
  | Guest who posted | Public channel, with proportionate proof of legitimacy |
  | Person in a photo | Identify the content; assess removal or hiding |
  | Former user without access | Public channel and exceptional verification fit to the request |
  | Third party with no shown relation | No disclosure of another person's data |

  - By default, no identity documents are asked for, though proportionate alternatives aren't ruled out.
  - The general LGPD deadlines apply (including the 15 days of art. 19 for the complete access declaration) until eligibility for Res. CD/ANPD 2/2022 is confirmed.

**Build list.** Documentation only; nothing has been implemented.
- **Now (no database needed):**
  - the two confirmations in `/bem-vindo`, with the notice version and time;
  - Turnstile with Siteverify, plus limits on code sending;
  - a `phoneVerifiedAt` timestamp;
  - `enviadoEm` and `protocoladoEm` in the item model, plus the legal-deadline mark;
  - the "Anônimo em público" label;
  - the apelido reservation;
  - passkey registration, with a nudge before 180 days.
- **With the database:**
  - the vault Worker and the auth gateway;
  - `AccessEvidence` and the Transform Rule;
  - 6-month deletion with preservation holds;
  - the per-item opaque moderation id;
  - the 180-day dormancy rule;
  - account closing;
  - the data-subject channel;
  - room reserved for nível 2 (no flow).

**Launch conditions.** The launch with user content is blocked until all of these hold:
1. The associação exists.
2. The capture test passes on the real domain (`falacanoas.com.br`, which isn't registered yet). It must show:
   - correct capture over HTTP/1.1, HTTP/2 and HTTP/3;
   - forged headers overwritten;
   - each record's link to its action intact;
   - that IP, ports, destination, transport and time together tell the experiment's controlled connections apart. This does not prove who users are.

   If capture fails, the fallback is Logpush `http_requests` (available on every plan since 2026-09-30), joined on `cf-ray` plus time and other attributes, never on `cf-ray` alone.
3. Counsel's opinion on age assurance under the ECA Digital.
4. The privacy notice reviewed.
5. The vault in place.

Before any nível 2: the RIPD, the path A pilot on a real signed PDF, and the documented key-rotation procedure.

## Round 19: abuse safeguards (2026-10-13)

The founder asked what stops abuse: an obscene photo, a neighbour named or photographed. The review found that nothing looked at photos before they went public, and that nobody could take down a published pin, photo or update. Decided ("build it"):

- **Every photo gets a first look.** A photo shows only after a moderator approves it; until then the pin shows "em análise". The pin's text still goes out at once under round 5's pre-screen. This narrows round 15's "updates from others enter immediately" for photos only. The 18h digest waits until a pin's photos have been looked at, so the Ouvidoria never gets, in the Fala's name, a photo nobody saw.
- **"Denunciar" on pins, photos and updates**, by anyone. Visitors pass Turnstile; a neighbour at nível 1 reports once per case. The reasons are nudity or sexual content, a child, exposing a person, offence, not a city problem, and other. Reports on the same thing form one case.
- **Hide first:** a nível-1 neighbour's report of nudity or of a child takes a photo down until a moderator looks. Once a moderator looked at a report on a photo and kept it, reports no longer take it down by themselves.
- **Takedown:** moderators remove a pin, a photo or an update directly, with a reason that goes into the history ("nothing disappears silently"). Whoever posted it can contest, and someone other than whoever decided judges the contest. A removed photo or update counts against whoever sent it, never against the pin's author.
- **Serving:** a photo is public only once approved on a published pin; moderators see the rest; everyone else gets a 404. Public copies are cached for an hour, so a takedown reaches browsers. Removed photos are kept privately (round 6) and never served.
- **Moderator care:** images reported for nudity or a child are blurred until the moderator chooses to look.

**Open (founder and counsel):**
- an image-screening vendor (nudity, faces, plates, text in images): one choice that also unblocks 2.11;
- CSAM hash matching, and a written procedure for CSAM and intimate imagery with counsel (preserve and report, never just delete; the Marco Civil art. 21 timing);
- how long removed photos are kept;
- photo screening as a launch condition.

**Next, no input needed:** sanctions (mute, suspend) and lower limits for new accounts; a wider pre-screen (neighbours, house numbers, plates) and apelido checks; the rule shown at posting time.

## Research findings that constrain design (2026-10-12)

- **Maps:** the landing page uses an inline SVG of the 18 bairros (`maps/data/web/canoas-bairros.svg`, about 4 KB gzipped) and a `<select>`, with no map library. For the eventual app: MapLibre (v6 is about 439 KB gzipped, ESM-only, and fails from `file://`; v5.24 UMD works). CARTO has required an API key since 2026-09-29; it is free up to 5M tiles/month non-commercial, and access is revocable. OpenFreeMap needs no key. Flood-extent layer: UFRGS, CC BY, 48.3% of the municipality.
- **Name:** the risk is looking official (Fala.BR is the Ouvidoria's platform; the Prefeitura used a "Fala, PREFEITO!" section). An independence line must sit beside the name. Domains were unregistered as of 2026-10-12.
- **Avoid:** the brasão, the green/red/yellow flag palette, "Progresso", gov.br blue, Rawline, the words Ouvidoria/Protocolo/Canal oficial, and alert styling (a false evacuation alert went out in Mathias Velho on 2024-05-26).
- **Photos:** use Wikimedia Commons only. Agência Brasil is no longer CC BY. 15 photos are in `brand/photos/` with `CREDITS.md`. There is no Canoas pothole photo yet.

## Defaults the research implies (no decision needed unless challenged)

- **Identification on court order:** to stay compatible with CF art. 5º IV, the platform must be able to identify a poster when a court orders it. The phone is therefore stored **encrypted, not just hashed**, and IP/port logs are kept for 6 months. CPF stays a keyed hash (HMAC-SHA256). See `legal/` and `identity/`. *Round 18 rewords this: the platform keeps the minimum data to help identify an author under a legally valid request, without promising identification is always possible.*
- **Under the STF ruling on Temas 987/533 (final thesis 17 June 2026):** a public notice channel, published rules and an annual transparency report.
- **The scoreboard names only bodies (secretarias), never individuals.**

## Open questions to verify

- Does an e-mail or Fala.BR digest sent by an association get a protocol number? Pilot it with the Controladoria/Ouvidoria.
- The garbage-collection contractor's name ([não verificado] in `canoas/`).
