# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary users:** residents of Canoas, RS (347.657 people, Censo 2022; 18 official bairros) who see the same broken things every day: potholes, rubbish, dark streetlights, clogged drains, streets that flood with every rain, sidewalks you can't walk on.
- **First persona, the engaged neighbour:**
  - already photographs problems and posts them in bairro Facebook and WhatsApp groups, where they go nowhere;
  - mostly on a phone;
  - wants the problem to count somewhere and to see whether anyone acts.
  - Serving this person well serves everyone else.
- **Audience for the landing page:** the same neighbours, arriving from a link shared in their bairro group. They should leave having put their bairro on the map, and wanting to bring ten neighbours with them.

## Product Purpose

**Fala, Canoas** is an independent, open-source accountability map for Canoas.

**How it works:**

1. A resident pins a problem with a photo.
2. Once a day, FalaCanoas sends the new pins to the Prefeitura's Ouvidoria in its own name.
3. A public clock starts when they are sent.
4. The pin closes only when neighbours confirm the fix.
5. A public scoreboard shows where problems pile up, how long each secretaria takes and which categories get fixed.

**This deliverable:** the **landing page** only. It is a waitlist by bairro:

- each bairro opens when enough confirmed neighbours join (about 1 per 300 residents, minimum 25);
- the page always shows how many are still missing.

Success means sign-ups confirmed by WhatsApp or e-mail, spread across all 18 bairros, with engaged neighbours sharing the page into their groups.

## Positioning

- **What it is:** a tool residents use to watch the city's upkeep, together and in public, measured in days.
- **What it is not:** a Prefeitura channel (Colab is the counter-model: sold to and speaking for prefeituras). Nor a campaign, a complaint wall about people, or an emergency service.
- **Independence is stated as facts and refusals, not adjectives:**
  - "Não é um canal da Prefeitura."
  - "Não aceitamos dinheiro de governos, partidos ou candidatos."
  - The code is open (AGPL-3.0).
  - The data will be open.
  - A named founder is responsible.

## Operating Context

- The page arrives through links shared in WhatsApp and Facebook groups, so it is opened on phones first, often on weak connections. The share preview (OG card) matters as much as the hero.
- pt-BR only. Addresses people as "você".
- The waitlist runs before the app exists. Every claim about the app is in the future tense, and every example pin and scoreboard row is labelled "exemplo".
- The founder will approach the Ouvidoria only after real traction (on the order of 1.000 confirmed sign-ups). Until then the page says the Prefeitura **será** convidada a responder, never that it was.
- **Timing:** Brazil's 2026 general-election runoff is on 25 October 2026. The page stays strictly about services, never about candidates or administrations.

## Capabilities and Constraints

- **Stack:**
  - a static page (HTML, CSS, vanilla JS), no build step, served from `falacanoas.com.br`;
  - no map library on the landing page: the 18 bairros are an inline SVG (`research/maps/data/web/canoas-bairros.svg`, about 4 KB gzipped).
- **Sign-up:**
  - **Fields:** bairro (required, one of the 18), channel (WhatsApp or e-mail), optional "posso ajudar com…" (moderar, programar/design, divulgar no meu bairro).
  - **Storage:** Supabase in the São Paulo region, with row-level security.
  - **Confirmation:**
    - WhatsApp: a tap-to-confirm `wa.me` link pre-filled with a code;
    - e-mail: a confirmation link;
    - only confirmed sign-ups count toward the threshold.
  - **Age:** 18+.
  - **LGPD:** a short privacy notice names the founder as controller (LGPD art. 9) and states purpose, retention and how to delete.
- **Analytics:** none. No cookies, no consent banner. The sign-up counter is the only metric.
- **Performance budget:** the first screen must render fast on Fast 3G. The gov-br concept's critique flagged 3.47 MB eager loading and a 19.7 s LCP, and that must not happen here. Photos are lazy, sized and modern-format.
- **Non-partisan:** no politicians, parties, administrations or slogans in copy or images. The scoreboard names bodies (secretarias), never people.
- **Verified figures only:** every number is footnoted to `research/`. Estimates stay labelled. Example data stays labelled "exemplo".
- **Licences:** code AGPL-3.0. Photos come from Wikimedia Commons, with credits in `research/brand/photos/CREDITS.md`; Agência Brasil is no longer CC BY. The flood layer is UFRGS (Possantti et al., 2024), CC BY 4.0.

## Brand Commitments

- **Name:** display **"Fala, Canoas"** (with the comma: a vocative). `falacanoas` for the domain and handles. An independence line sits beside the name on first contact.
- **Visual world (chosen 2026-10-12): claim and proof, monochrome.**
  - Every claim sits beside the interface detail that proves it.
  - One neutral scale, light and dark.
  - The gauge survives as product truth: "dias em aberto" counters, tabular numbers, the scoreboard's tick ruler with its 30-day mark.
- **Polish bar:** modern SaaS, in the class of Linear, Vercel, Resend and Supabase:
  - product shots carry the page;
  - crisp hairlines and precise spacing;
  - restrained motion;
  - light and dark themes both designed, following the system setting.
- **Colour:**
  - neutral ink, graphite and paper;
  - **one signal colour, orange** (the bus-shelter orange), for "needs attention";
  - red, yellow and green only as small data marks, never as decoration.
- **Type:** Geist for everything, plus Geist Mono for counters, dates and footnotes (both OFL).
- **Photography:** the UI and map lead. A few credited Canoas photos appear as proof inside pin cards and in one full-bleed moment.
- **Avoid, because it reads as the Prefeitura or as alarm:**
  - the brasão, the green/red/yellow flag palette, "Progresso";
  - gov.br blue, Rawline;
  - the words Ouvidoria/Protocolo/Canal oficial as our own labels;
  - alert or siren styling. A false evacuation alert went out in Mathias Velho on 26/05/2024.
- **Voice:** a neighbour who checked the numbers: plain, factual, a little dry, warm at the edges. Short sentences, the most important point first.

## Evidence on Hand

- `research/DECISIONS.md`: every product decision from the founder interview (12 rounds).
- `research/canoas/`: population, bairros, complaint channels, Ouvidoria statistics, owners of each service, the 2024 flood, the press. Figures safe to cite:
  - 347.657 habitantes (IBGE, Censo 2022);
  - 18 bairros oficiais (Lei 4.736/2003);
  - Ouvidoria 2024: 2.772 manifestações (e-mail 1.470; Fala.BR 1.087; telefone 189; presencial 26);
  - flood period 06/05–06/12/2024: 1.783 manifestações, 53,7% answered within 30 days (Relatório Anual da Ouvidoria 2024);
  - legal reply deadline 30 + 30 days (Lei 13.460/2017, art. 16; Decreto Municipal 434/2019).
- `research/maps/`: web-ready GeoJSON and SVG of the boundary and 18 bairros, and the 2024 flood footprint (48,3% of the municipality, UFRGS CC BY 4.0). The bairro populations in GeoCanoas `POPULACAO_2022` are for relative size and thresholds only, never a footnoted figure.
- `research/legal/`, `research/identity/`: the legal frame (CF art. 5º IV, the STF ruling on Temas 987/533 of June 2026, LGPD, ECA Digital) and the identity model.
- `research/prior-art/`: FixMyStreet, Reclame Aqui, Colab and others; the evidence on responsiveness and participation inequality.
- `research/brand/`: the name check, symbols to avoid, tone references, and 15 credited Commons photos in `photos/`.
- **Absent, and must not be fabricated:**
  - any FalaCanoas usage data, testimonials or press;
  - any statement that the Prefeitura has agreed to anything;
  - a real Canoas pothole photo (none on Commons yet);
  - the garbage contractor's name.

## Product Principles

1. **Measure, don't shout.** Days open, the date it was sent, who confirmed it. Facts make the pressure.
2. **Institutions, never individuals.** Pins and the scoreboard point at public services and the bodies responsible, never at a person.
3. **Residents close the loop.** The Prefeitura may say "resolvido". Neighbours confirm it.
4. **Protect the reporter.** Pseudonym + bairro in public; metadata stripped; faces and plates blurred.
5. **Open by default.** AGPL code, open data, published rules, a named person accountable.
6. **Not an emergency channel.** Chronic drainage, yes; live floods, no. "Em emergência: Defesa Civil 199 / Bombeiros 193."

## Proposed launch categories (to confirm; owners per `research/canoas/`)

| Categoria                      | Responsável provável                                 |
| ------------------------------ | ---------------------------------------------------- |
| Buraco na rua                  | Sec. de Obras e Reconstrução                         |
| Rua que alaga toda chuva       | Sec. de Obras e Reconstrução (drenagem)              |
| Boca de lobo entupida          | Sec. de Obras e Reconstrução (drenagem)              |
| Lixo e descarte irregular      | Sec. de Serviços e Zeladoria Urbana                  |
| Entulho na calçada ou na rua   | Sec. de Serviços e Zeladoria Urbana                  |
| Poste apagado                  | Iluminação pública (IP Canoas, PPP)                  |
| Árvore: poda ou risco de queda | Sec. de Serviços e Zeladoria Urbana                  |
| Calçada quebrada ou bloqueada  | [verificar: owner of the lot + municipal inspection] |
| Esgoto a céu aberto            | [verificar: Corsan/Aegea vs. Prefeitura]             |
| Sinalização e semáforo         | Sec. de Mobilidade Urbana                            |

## Accessibility & Inclusion

- WCAG 2.2 AA as the floor in both themes, with visible focus and targets of 44 px or more.
- Every animation honours `prefers-reduced-motion`. Nothing loops without a pause control.
- The bairro picker works without the map: a native `<select>` is the primary control. The SVG map is an enhancement with an accessible name per bairro.
- Built for a phone on a weak connection: tiny first load, no web fonts blocking text, an OG card that works in WhatsApp.
- Participation inequality is real (see `research/prior-art/`). The page shows bairros with few sign-ups as an invitation ("seja o primeiro"), never as a failure.
