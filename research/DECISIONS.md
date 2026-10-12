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

## Research findings that constrain design (2026-10-12)

- **Maps:** the landing page uses an inline SVG of the 18 bairros (`maps/data/web/canoas-bairros.svg`, about 4 KB gzipped) and a `<select>`, with no map library. For the eventual app: MapLibre (v6 is about 439 KB gzipped, ESM-only, and fails from `file://`; v5.24 UMD works). CARTO has required an API key since 2026-09-29; it is free up to 5M tiles/month non-commercial, and access is revocable. OpenFreeMap needs no key. Flood-extent layer: UFRGS, CC BY, 48.3% of the municipality.
- **Name:** the risk is looking official (Fala.BR is the Ouvidoria's platform; the Prefeitura used a "Fala, PREFEITO!" section). An independence line must sit beside the name. Domains were unregistered as of 2026-10-12.
- **Avoid:** the brasão, the green/red/yellow flag palette, "Progresso", gov.br blue, Rawline, the words Ouvidoria/Protocolo/Canal oficial, and alert styling (a false evacuation alert went out in Mathias Velho on 2024-05-26).
- **Photos:** use Wikimedia Commons only. Agência Brasil is no longer CC BY. 15 photos are in `brand/photos/` with `CREDITS.md`. There is no Canoas pothole photo yet.

## Defaults the research implies (no decision needed unless challenged)

- **Identification on court order:** to stay compatible with CF art. 5º IV, the platform must be able to identify a poster when a court orders it. The phone is therefore stored **encrypted, not just hashed**, and IP/port logs are kept for 6 months. CPF stays a keyed hash (HMAC-SHA256). See `legal/` and `identity/`.
- **Under the STF ruling on Temas 987/533 (final thesis 17 June 2026):** a public notice channel, published rules and an annual transparency report.
- **The scoreboard names only bodies (secretarias), never individuals.**

## Open questions to verify

- Does an e-mail or Fala.BR digest sent by an association get a protocol number? Pilot it with the Controladoria/Ouvidoria.
- The garbage-collection contractor's name ([não verificado] in `canoas/`).
