# The resumo's finish: references and the chosen look

Research brief, 2026-10-26. The first round (design.md, receivers.md, stack.md) settled what the resumo carries and the standards it meets. The founder found the result "too simple", so this round looked only at visual craft:

- Exemplars: 12 dense, public-sector or operational PDFs, downloaded, measured with `pdftohtml -xml` and looked at page by page.
- Typst: what the pinned Typst 0.15.1 can do, proved with prototypes validated in veraPDF 1.30.3 (PDF/A-2a and PDF/UA-1).

## Exemplars worth borrowing from

| Document | What we took |
|---|---|
| [NAO Annual Report 2024-25](https://www.nao.org.uk/wp-content/uploads/2025/06/nao-annual-report-and-accounts-2024-25.pdf) | The section strip across the head of every page: one segment per section, the current one marked and named. Big figures under a rule. |
| [Apple Platform Security guide](https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf) | The asymmetric page: an empty-looking left column that carries labels, the content beside it. Calm tables with hairlines only. |
| [IPCC AR6 SYR, Summary for Policymakers](https://www.ipcc.ch/report/ar6/syr/downloads/report/IPCC_AR6_SYR_SPM.pdf) | The finding box: a pale ground, a bold lead sentence, then the detail. Used for "O que pedimos". |
| [Apple Environmental Progress Report 2025](https://www.apple.com/environment/pdf/Apple_Environmental_Progress_Report_2025.pdf) | Tables without zebra or boxes, a heavier rule under the header. Tight tracking on large titles. |
| [FBSP Anuário Brasileiro de Segurança Pública 2025](https://forumseguranca.org.br/wp-content/uploads/2025/09/anuario-2025.pdf) | The accent kept for the one focal element (one bar of many). |
| [NYC Mayor's Management Report 2023](https://www.nyc.gov/assets/operations/downloads/pdf/mmr2023/2023_mmr.pdf) | Pictograms as wayfinding beside each body or category. Its finish otherwise is not worth copying. |
| [Swiss FSO Statistical Yearbook](https://dam-api.bfs.admin.ch/hub/api/dam/assets/7866720/master) | Section numbers set large; letter-spaced caps in the page furniture. |

Rejected as models:
- SP Ouvidoria's quarterly report: PowerPoint exports with shadows and 3D bars. It is useful to know what that audience already reads, and a precise resumo will look clearly better beside it.
- TfL, DfT, IBGE: default spreadsheet charts.
- Banco Central and TCU PDFs: blocked to download.

## Two directions, one chosen

Two comps were built from the same sample data and shown to the founder:
- **A, "Produto"**: grey cards and a thumb index on the page edge, in the manner of Apple's reports.
- **B, "Dossiê"**: an editorial, asymmetric page.

**The founder chose B.** It is denser (two or three records a page, which matters on a 200-report day), and each record reads like a case file: the rail holds everything the Ouvidoria copies into a protocol.

## What the template does now (apps/digest/pdf/resumo.typ)

- **Grid:**
  - A4 with 18 mm side margins and a 174 mm block.
  - A 40 mm label rail and a 6 mm gap leave 128 mm of content.
  - The rail carries labels in tracked caps (6.5 pt, +0.09 em) and short facts.
- **Head of every page:**
  - Wordmark, resumo number and date, then the section strip: one segment per body.
  - On a body's pages the current segment is ink and named "5/6 · Obras e Reconstrução". On page 1 and the map page every segment is neutral.
  - The strip is an artifact: the heading says the same thing in words.
- **Cover:**
  - The ofício's facts (number, date, addressee, copy, subject) in the rail.
  - The headline at 28 pt, then four figures under rules: reports, bodies, bairros, with photos. The first figure is in accent, since it is the ask.
  - The body table: name and number range, a share bar (the busiest in accent, an artifact; the count is text), count and pages.
  - "O que pedimos" as a finding box.
- **City map:** at full width, with the key underneath (number → category, code, bairro) while it is numbered (60 reports or fewer).
- **Body opener:**
  - The section's number set large in the rail ("05 de 6 órgãos"), the name at 24 pt.
  - The body's map (from four reports), then its index with code, title, category, bairro and page.
- **Record:**
  - An ink band: the number at 15 pt, the code in Geist Mono with a slashed zero (`ss09`), the category's pictogram and name, bairro, time.
  - The rail: address, reference, nearest street, place, coordinates, confirmations, a photos note, then the QR code, the public link and the OpenStreetMap link.
  - The content: the title (level 2, bookmarked) and the resident's words.
  - Then the street map (76 mm) beside up to four photos in a 2 × 2 grid. With no map, the photos go four across.
- **Maps, print palette:**
  - Buildings, street casings and water are a step darker than on screen, so they survive a laser printer.
  - Airfields and runways are drawn (Canoas has an air base inside the city).
  - The place has an accent disc and a dashed ring as wide as half the scale bar: a resident's tap, not a survey.
  - A street map with a missing tile is not drawn at all. Tile fetches retry three times, and a 404 counts as an empty tile, not a failure.
- **Pictograms:** the app's category symbols, copied into `apps/digest/src/pdf/pictograms.ts`. A test fails if they drift from `Icons.tsx`.
- **Sample** (`bun --filter @fala/digest amostra`): reports without their own fixture photos get grey placeholders that say "foto do morador · exemplo", never another report's photo.

## Measured

| Reports | Pages | Size | Time |
|---|---|---|---|
| 12 | 10 | 1.0 MB | 2 s |
| 80 | 41 | 3.5 MB | 3 s |

- veraPDF 1.30.3: PASS for PDF/UA-1 and PDF/A-2a on the 12-report sample.
- Not done: a printed proof on a real laser printer. Do it once before the first real resumo.
