# The resumo as a PDF

The daily resumo to the Ouvidoria (DECISIONS round 5) goes with a PDF attached, laid out for the people who act on it: Ouvidoria staff who protocol each report and forward it by memorando, the secretarias and subprefeituras that dispatch crews, and the crews themselves, on paper or a phone. It is also the record of what was sent and when. The e-mail's plain text still stands alone (e-MAG 3.8, GOV.UK): the PDF is the same resumo, laid out.

Three research briefs, 2026-10-13:

- [design.md](design.md): dense-document design (Tufte, Butterick, Schwabish, UK Analysis Function), briefing structure, print maps, the Manual de Redação's ofício, accessible and archival PDF (PDF/UA, CONARQ on PDF/A), exemplars.
- [receivers.md](receivers.md): what the receiving side needs. FixMyStreet's and Open311's fields, Fala.BR's limits, Lei 13.460 and the CGU portarias on identification and splitting, field crews, attachment sizes.
- [stack.md](stack.md): how to build it. Typst against Chromium, WeasyPrint and react-pdf; maps without a browser; QR codes; addresses; photos; fonts.

## What was built (apps/digest/src/pdf, apps/digest/pdf/resumo.typ)

- **Page 1 says what this is and what is asked** (BLUF; the TCU "Resumo"; the Manual's ofício):
  - an ofício-style heading: `RESUMO DIÁRIO Nº 0287/2026`, the date in words, the addressee, a short *Assunto*;
  - one sentence with the day's totals, then three figures (reports, bodies, bairros);
  - a table of bodies with each one's report numbers and pages;
  - how to send protocol numbers back, citing a real code;
  - the clock, privacy and independence notes.
- **Page 2 is the city:** a map of Canoas with every report, numbered as in the pages after it. Past 60 reports the numbers stop being legible, so they become dots and the numbers move to each body's map.
- **One section per body, each starting on a new page**, so it can be forwarded as is (CGU 116 art. 17; Canoas forwards per secretário):
  - a running head naming the body on every page, and "Página X de Y" in the foot;
  - a map of its reports, from four up;
  - an index table (number, code, type, bairro, time, confirmations, page) whose header repeats across pages;
  - then one record per report.
- **A record** repeats one layout, small multiples:
  - code, category, bairro and time on one line, then the title (a level-2 heading, so it's a bookmark) and the resident's words;
  - a 360 × 216 m street map, the pin in the one orange of the page, the nearest streets named on it;
  - the facts: coordinates, the nearest named street with its distance, place, confirmations, the public page, an OpenStreetMap link;
  - a QR code to the public page;
  - the approved photos as equal 40 × 30 mm tiles.
- **Numbers run on across bodies** ("item 37" holds up on a phone call or in a memorando). Inside a body, reports are ordered by bairro, then by time, so a crew's list reads by area.
- **Type and colour:**
  - Geist and Geist Mono (OFL, vendored in `apps/digest/fonts`);
  - tabular figures in columns and proportional ones for big numbers;
  - DESIGN.md's neutral scale, black on white, so it survives a black-and-white laser printer.
- **Standards:** tagged **PDF/A-2a and PDF/UA-1** (CONARQ OT 4 recommends A-2 when a PAdES signature may come; level "a" carries the tags).
  - Typst refuses to build a file that breaks either.
  - Maps, photos and QR codes carry alt text; the markers over a map are artifacts, since the map's alt text speaks for them.
  - The document's language is pt-BR, and bookmarks cover each body and each report.
- **Maps without a browser or a raster tile server** (the OSM tile policy forbids that use):
  - OpenFreeMap's vector tiles are cached on disk; the whole city is about 60 tiles and 1.5 MB, and a build never changes once fetched;
  - they are drawn as SVG, with the bairro and municipal-limit polygons from the instance;
  - names and numbers are set by Typst on top, so they stay text.
  - Attribution: "© colaboradores do OpenStreetMap (ODbL)" in every page's foot, and the full line under the city map.
- **Photos:** only approved ones, fetched from their public address (no Storage secret in `apps/digest`). They are re-encoded as JPEG at 480 px, about 300 dpi at 40 mm, which Typst embeds as is; heavy days drop to 400 px.
- **The record:** `fala.digests` keeps the resumo's number and the PDF's SHA-256, so a printed or forwarded copy can be checked against what was sent. The file name follows the Manual (5.2.l): `Resumo-diario-0287-2026-Fala-Canoas-2026-10-13.pdf`.
- **If the PDF fails to build,** the e-mail goes as text alone (the reports' clocks matter more), and the run reports the failure.

Measured with the fictional demo data (`bun --filter @fala/digest amostra [n]`):

| Reports | Pages | Size | Time |
| --- | --- | --- | --- |
| 24 | 16 | 1.6 MB | 3 s |
| 200 | 96 | 5.5 MB | 5 s |

The research's ceiling is about 8 MB per e-mail.

## Open

- **Founder:** OpenFreeMap's terms forbid automated collection "without permission". The use is cached, about 60 tiles a month, the same tiles the app's map loads, but ask in writing (info@openfreemap.org). The fallback is Planetiler on a Geofabrik extract.
- **Founder:** the sender's identification. The PDF says "Fala, Canoas"; Lei 13.460 and the CGU rules favour an identified sender, so add the controller's legal name once confirmed.
- **Founder:** one PDF with forwardable sections, or one file per body as well? The research found no ouvidoria preference. One file is the record; per-body files would save the Ouvidoria a "print pages 3–7". It's cheap to add.
- **Founder (product):** a "ponto de referência" field in the report form, and a street address looked up once at submission (Nominatim allows one call per report, cached; never in the cron). Until then a record gives the coordinates, the nearest named street read from the map data, and the map.
- **Subprefeituras:** each record could name the subprefeitura for its bairro. The mapping isn't verified (Brigadeira, Industrial and Ilha das Garças aren't in any subprefeitura's name; research/canoas), so it waits.
- **The Prefeitura's attachment limit:** unknown. Ask the Ouvidoria; Fala.BR takes 30 MB, Google Workspace (Canoas's mail) 25–50 MB.
- **Validation:** run veraPDF (PDF/A-2a, PDF/UA-1) in CI. Typst checks while building; an independent validator hasn't run yet.
