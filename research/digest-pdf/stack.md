# Fala, Canoas digest PDF: stack brief (2026-10-13)

Scope: a server-side PDF for `apps/digest` (Bun/TS cron, small Linux box, no Workers). "Measured" means run on the development machine (Bun 1.4.0, sharp 0.35.5, Chromium 152). "[não verificado]" means not confirmed. Typst's speed was measured afterwards, building the template (README).

## 1. PDF engines

| | Typst CLI 0.15.1 (2026-07-17) | WeasyPrint 70.0 (2026-09-08) | Chromium / Playwright 1.64 | @react-pdf 4.9.0, pdfmake 0.3.11, pdf-lib |
|---|---|---|---|---|
| Typography | Own Knuth-Plass-style line breaking; OpenType via `text.features` and `number-width: "tabular"` (tnum) | Pango/HarfBuzz; good | Good, but PDF is Skia, PDF 1.4 (measured) | Weak: react-pdf and pdfmake only have simple line breaking |
| Hyphenation pt | Yes. `hypher::Lang::from_iso` on `lang`, "Portuguese" among 48 bundled languages. Auto only when justified | Pyphen, `hyph_pt_BR.dic` exists | Needs a dictionary in the profile. Measured: a fresh headless profile did NOT hyphenate; copying `hyph-pt.hyb` into `hyphen-data` did | react-pdf: English default, needs a callback |
| Header/footer, "page X of Y" | `page(header/footer)`, `counter(page).final()`; running section title via `context`/`query` | `@page` margin boxes, `string-set`, running elements | Margin boxes since Chrome 131, `counter(pages)` works (measured); `string()` running titles NOT shipped | Manual |
| Bookmarks | Heading outline in PDF | `bookmark-level` | `outline: true` (Playwright since 1.42): works (measured) | react-pdf `bookmark`; pdfmake yes |
| Tagged / PDF/UA | Tagged by default since 0.14.0 (2025-10-24); `--pdf-standard ua-1`; alt text enforced | Experimental, "not guaranteed valid" | `tagged: true` yields a structure tree (measured), no PDF/UA claim | pdfkit has a manual PDF/UA recipe; react-pdf and pdfmake: no tagging seen [não verificado] |
| PDF/A | All of A-1 to A-4 since 0.14.0; 0.15.0 allows several standards at once (e.g. `a-2a,ua-1`) | Variants via `--pdf-variant` | None natively (PDF 1.4) | react-pdf 4.9.0 `conformance` (A-1/2/3 "b" only) |
| Footprint | One static musl binary: 17.5 MB (x64), 16.2 MB (arm64) as `.tar.xz`. No runtime deps | Python ≥3.10 + Pango/HarfBuzz/fontconfig | 417 MB installed (Arch package, measured) + sandbox/GPU flags | npm only; pdf-lib last released 2021-11-06 |
| Determinism | `--creation-timestamp` / `SOURCE_DATE_EPOCH`; 0.15 fixed a timezone leak | Fine | Timestamps and font fallback vary | n/a |

Typst details I confirmed:
- The CLI takes `--input k=v` (strings only), `--root`, `--font-path`, `--ignore-system-fonts`, `--pdf-standard` and `--creation-timestamp`. Pass the data as a `data.json` read with `json()`.
- `table.header` repeats across pages by default. A header row is required for accessibility metadata. The per-cell accessibility functions are experimental (`a11y-extras`).
- PDF/UA-1 is supported, UA-2 is not. UA-1 conflicts with PDF 2.0 and PDF/A-4, so use `a-2a,ua-1`. Typst can't check every UA rule: language, alt text and semantic structure are on us. Validate with veraPDF (1.30.3, 2026-10-09) in CI; I did not run it.
- JPEG is passed through to the PDF (DCT, with ICC and EXIF orientation); anything else (WebP, PNG) is decoded and re-encoded losslessly. This is in `typst-pdf/src/image.rs`. So convert photos to JPEG ourselves.
- Node bindings are not worth it. `@myriaddreamin/typst-ts-node-compiler` 0.7.0 tracks Typst 0.14.2. Its 0.8.0-rc3 (2026-06-29) targets 0.15.0-rc.1. The linux-x64 binary package is 52 MB unpacked. It is unofficial and lags. The npm `typst` package is stale (0.10.0-8).
- 0.15 had breaking changes (`pdf.embed` removed, `image.decode` and `json.decode` removed, `typst query` superseded by `typst eval`). Pin the version and the binary SHA-256.
- Typst packages download from packages.typst.org on first use. Vendor them or avoid them.

Verdict: Typst is the pick. It is the only option with real pt-BR hyphenation, PDF/UA-1 plus PDF/A together, bookmarks, running headers and a single-binary footprint. WeasyPrint is the runner-up if the team prefers HTML/CSS (note CVE-2026-49452 in 69.0 and CVE-2026-55073 in 70.0: untrusted images and the URL fetcher, relevant because we embed photos). Chromium is the worst fit: heavy, no PDF/A, flaky hyphenation, no running titles. react-pdf and pdfmake lack the accessibility and typography. pdf-lib is unmaintained.

## 2. Maps without a browser

- **MapLibre Native Node** (`@maplibre/maplibre-gl-native` 6.4.1, 2026-03-29, BSD-2; 6.5.0-pre.1 is out): prebuilds only for Ubuntu 24.04 amd64/arm64, macOS and Windows, on Node 22/24/26, fetched at install from GitHub Releases. It outputs a raw RGBA buffer, and the `request` callback must return gunzipped tiles. The source includes `nan.h` (V8-API addon), so it very likely won't load in Bun [não verificado; inference: Bun implements ~95% of Node-API, not the V8 C++ API]. MapLibre's Linux docs say headless rendering wants xvfb/Mesa; I don't know whether the Node binding needs it [não verificado]. It would need a Node sidecar with software GL, and it makes 300 dpi rasters, so 200 locator maps would be heavy. It is the only way to get the web app's exact Positron look.
- **OSM raster tiles / `staticmaps` (1.13.1, 2024-02-06, stale):** ruled out. The tile policy bans bulk downloading, pre-seeding and offline use, expects only the current viewport of an interactive map, and can block without notice (https://operations.osmfoundation.org/policies/tiles/).
- **OpenFreeMap** (https://github.com/hyperknot/openfreemap): vector only, and the README says it does not offer static images or raster tiles. It states "no limits on map views or requests", and "attribution is required" for printed media: OpenFreeMap + OpenMapTiles + OpenStreetMap credits. Its ToS (https://openfreemap.org/tos/) forbids automated data collection "without permission". That wording targets the site, but the safe move is to email info@openfreemap.org.
- **Own vector render (recommended). Measured prototype:**
  - The TileJSON at `https://tiles.openfreemap.org/planet` gives a versioned path (today `planet/20261011_080001_pt/{z}/{x}/{y}.pbf`), `maxzoom` 14. Layers: transportation, transportation_name, water, waterway, park, landuse, landcover, building, boundary, place, poi, housenumber. Tiles carry `cache-control: max-age=315360000`.
  - 56 z14 tiles cover the municipal limit (`limite.json`): 1.54 MB in total, about 25 s the first time (sequential), then cached on disk. Refresh monthly with a stable User-Agent.
  - Decoded with `@mapbox/vector-tile` 3.0.0 + `pbf` 5.1.2 (BSD-3, pure JS, both already in the repo's `node_modules` via maplibre-gl); ran on Bun. Overview SVG (roads by class, water, `bairros.json` outlines, limit): 483 KB (172 KB gzipped), 0.45 s CPU. It looks like Canoas, bairros readable.
  - A 400×260 m locator window around one point is a 7 KB SVG, 74 KB as a 1200 px PNG. Pixel size in the sample was 0.52 m per tile unit, so overzoom past z14 is fine. The tile had 182 named streets, which is enough for labeling one or two near the pin.
  - Caveat: building coverage is sparse (14 building features in that tile), so draw roads, water, parks and the pin, not footprints.
  - Keep text out of the SVG. Typst draws numbered markers, bairro names, street labels, scale bar and legend (same fonts, accessible). Embed each map as a `figure` with `alt`.
- **Overview density:** with ~200 pins, declutter in TS (greedy offsets with leader lines, or per-bairro cluster counts). The marker number must equal the ficha number. The summary table is the text equivalent for screen readers.
- **Attribution (ODbL):** OSMF guidelines (https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) want "© OpenStreetMap contributors" (or "Map data from OpenStreetMap") naming the ODbL, with openstreetmap.org/copyright printed on printed maps. One credit per document is enough when maps share it. Images under 100 features or 10,000 m² are exempt, but a 400×260 m window is about 104,000 m². Print once per map page or in the footer: "Mapas: OpenFreeMap, © OpenMapTiles, © colaboradores do OpenStreetMap, ODbL: openstreetmap.org/copyright". ODbL §4.3 asks only for a notice on a Produced Work (clause text partly [não verificado]).

## 3. QR and address

- **QR:** `uqr` 0.1.3 (MIT, zero dependencies, `renderSVG`) in TS, saved as SVG and embedded in Typst with alt text ("QR code para falacanoas…/o/ID"). Typst alternatives are `cades` 0.1.0 (2026-02-09, MIT, pure Typst curve) and `tiaoma` 0.3.0 (Zint WASM, 461 kB, claims 0.14/0.15 compatibility). Both are Typst Universe packages that need vendoring. Also print the short URL as text.
- **Address:** items have no address. `ScopeSchema` has only coordinates, plus an optional `place.label`.
  - Nominatim public: absolute max 1 req/s, an identifying User-Agent, results cached, no systematic or grid queries. Scheduled scripts are limited to 4 req/min (https://operations.osmfoundation.org/policies/nominatim/). 200 lookups would take about 50 minutes, so a cron geocoder violates the policy. `research/maps/README.md` already decided on one lookup per submission, from the backend with caching.
  - Photon (public, komoot): "be fair", throttling, no numbers, no SLA (https://photon.komoot.io/). Self-hosting Nominatim or Photon is heavy [sizes não verificado].
  - **Better offline option: IBGE CNEFE 2022.** Canoas is `…/Arquivos_CNEFE/CSV/Municipio/43_RS/4304606_CANOAS.zip` (3.5 MB zip, 28 MB CSV, 176,899 addresses, file dated 2024-05-17). Fields: street type, title and name, number, CEP, locality, latitude, longitude, geo-coordinate quality level. Street names are uppercase with no accents (e.g. "NOSSA SENHORA DAS GRACAS"). Use nearest point within about 50 m for the number and CEP, and take the accented street name from OSM's `transportation_name`. Label it "endereço aproximado". The files are public, but the reuse licence is [não verificado].
  - Accuracy of OSM addresses in informal areas of Canoas is [não verificado].

## 4. Photos and size

- Source photos are 1600 px WebP/JPEG ≤3 MB, EXIF already stripped (`packages/core/src/report.ts`, `media.ts`). `apps/digest` already gets `src` as `/api/fotos/<key>`, which is public once moderation approves the photo, and the digest only selects approved photos. So fetch `https://<domain>/api/fotos/<key>` over plain HTTPS: no Supabase secret in the digest. Restrict hosts (SSRF).
- **Measured** (12 real Canoas photos from `research/brand/photos`; 1600 px WebP q82 averaged 211 KB; then sharp 0.35.5 under Bun, mozjpeg, 4:2:0):

| width | ≈dpi at 40 mm / 60 mm | q68 | q75 | q82 | time |
|---|---|---|---|---|---|
| 354 px | 225 / 150 | 14 KB | 16 KB | 20 KB | ~60 ms |
| 531 px | 337 / 225 | 27 KB | 31 KB | 39 KB | ~90 ms |
| 709 px | 450 / 300 | 43 KB | 50 KB | 62 KB | ~110 ms |

  Plan: 1 photo at 80 mm uses 709 px, 2 photos use 531 px, 3 to 4 photos use ~400 px. Worst case is 200 reports × 4 photos = 800 photos: about 13 MB at 354 px q75, plus maps and QR (about 2 to 6 MB [estimate]). A typical day is far smaller.
- **Limits:**
  - Gmail: 25 MB per message (https://support.google.com/mail/answer/6584); the 50 MB receive figure is from secondary sources only.
  - Exchange Online: default 35 MB send / 36 MB receive, admin-settable 1 to 150 MB; Outlook mobile 33 MB (https://learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits).
  - Outlook.com ~20 MB [não verificado].
  - The Prefeitura's server limit is unknown [não verificado].
  - Base64 adds about 33 to 37%.
- **Policy:** target ≤8 MB per PDF (about 11 MB on the wire). Pick JPEG quality and width tiers to fit before compiling (the byte counts are known). If still over, split by órgão, one PDF per body, which also helps routing. Last resort: thumbnails only plus link and QR.
- Keep links and QR beside the thumbnails even when embedding, because the public photo URL can be taken down while the PDF is archived.

## 5. Fonts

- Geist v1.7.2 (2026-06-01) is OFL 1.1 (the OFL exempts documents made with the font from the licence). The repo has static TTF/OTF and variable TTF under `fonts/Geist/{ttf,otf,variable}` and `fonts/GeistMono/…` in https://github.com/vercel/geist-font. `apps/web/public/fonts/*.woff2` are Latin subsets; Typst docs list only TTF/OTF (WOFF2 not mentioned), so vendor the static TTFs (Regular, Medium, SemiBold, plus Mono Regular, ~126 to 149 KB each).
- Measured on v1.7.2 `Geist-Regular.ttf` and `GeistMono-Regular.ttf`:
  - Geist has `tnum`, `pnum`, `case`, `frac`, `sups`/`subs`, `locl`, `liga`, `ss01`–`ss11`, and GPOS `kern`.
  - Geist Mono has no `tnum`, `pnum` or `zero`; it's monospaced, so DESIGN.md's `"zero" 0` does nothing.
  - `fsType` is 0 (embedding allowed).
  - All pt-BR letters and punctuation (acentos, ç, «», “”, –, —, …, º, ª, °, €) are present.
  - There is no U+00AD or U+2011 glyph, so don't put soft or non-breaking hyphens in strings. Typst hyphenates with a plain hyphen.
  - Typst 0.15.0 supports variable fonts, but static files are safer. Use `--ignore-system-fonts --font-path fonts/`.
  - Typst subsets embedded fonts [não verificado in this pass].

## Recommended stack

- **Engine:** Typst 0.15.1 CLI, pinned by SHA-256, called with `Bun.spawn`. `apps/digest/pdf/ficha.typ` reads `data.json`. Flags: `--root <tmp> --ignore-system-fonts --font-path fonts --pdf-standard a-2a,ua-1 --creation-timestamp <sentAt>`. `lang: "pt"`, `region: "br"`, `number-width: "tabular"`; one heading level per órgão, one per ficha, so bookmarks follow; summary table with internal links; `block(breakable: false)` fichas; footer "Página X de Y"; running header with the órgão. A plain TS function builds the JSON (testable without Typst), and the template is checked in CI with veraPDF plus `pdftotext`.
- **Maps:** own SVG from cached OpenFreeMap z14 tiles (56 tiles, 1.5 MB) plus the repo's bairro and limit polygons. The pin, numbers, labels, scale bar and attribution are drawn in Typst. No MapLibre Native, no browser, no raster tiles.
- **QR:** `uqr` SVG.
- **Address:** store it at submission time (one Nominatim call per report, cached, from the web backend); until then, a local CNEFE nearest-address lookup plus the OSM street name, labelled approximate. No public geocoder in the cron.
- **Photos:** fetch the public `/api/fotos/` URL, sharp to JPEG (mozjpeg, q75, width by photo count, tiered to ≤8 MB), split by órgão if needed.
- **Footprint:** Typst binary ~17 MB, six Geist TTFs under 1 MB, tile cache ~1.5 MB, CNEFE slice a few MB. No Chromium, Python or GL. Compare Chromium at 417 MB.

## Main risks

1. PDF/UA-1 conformance needs discipline: alt text for every map, photo and QR, and table headers. Table cell accessibility is experimental. Typst's PDF/A-2a and UA-1 combination is untested here [não verificado].
2. Typst speed and memory for 200 fichas with 800 images and 200 SVGs are unmeasured [não verificado]. Benchmark before committing.
3. OpenFreeMap is free with no SLA, and its ToS wording on automated collection is ambiguous. Ask for written OK; fallback is Planetiler on a Geofabrik extract.
4. Typst churn: pin it, and expect template edits on upgrade.
5. Overview readability at 100+ markers, and sparse OSM buildings, so maps may look empty in peripheral bairros.
6. Address quality and the CNEFE reuse terms. A wrong "approximate address" in an official-facing document is a reputational risk.
7. Attachment ceilings at the Prefeitura are unknown. Ask the Ouvidoria.

Sources:
- https://typst.app/docs/changelog/0.14.0/
- https://typst.app/docs/changelog/0.15.0/
- https://typst.app/docs/reference/pdf/
- https://typst.app/docs/reference/model/table/
- https://github.com/typst/hypher
- https://github.com/typst/typst/blob/main/crates/typst-pdf/src/image.rs
- https://developer.chrome.com/blog/print-margins
- https://playwright.dev/docs/api/class-page#page-pdf
- https://doc.courtbouillon.org/weasyprint/stable/
- https://github.com/diegomura/react-pdf
- https://github.com/maplibre/maplibre-native/tree/main/platform/node
- https://github.com/hyperknot/openfreemap
- https://openfreemap.org/tos/
- https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
- https://opendatacommons.org/licenses/odbl/1-0/
- https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/
- https://github.com/vercel/geist-font/releases
- https://typst.app/universe/package/tiaoma
- https://typst.app/universe/package/cades
- https://github.com/unjs/uqr
- https://verapdf.org/
