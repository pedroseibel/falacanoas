# The category pictograms: research and the redraw

2026-10-26. The founder found the first set (2026-10-12) unpolished and asked for more research. This brief covers two research passes and the redraw that followed. The redraw is now `apps/web/src/components/Icons.tsx`, and the digest's PDF keeps a copy, checked by a test.

## What was wrong with the first set

Measured with `tools/icon-lab.ts` (ink as a share of the 24-unit canvas):
- **Weight:** ink ran from 20.1% (poste) to 44.3% (questão), a spread of 2.2×. Seven of the eleven were outside a ±15% band around the median.
- **Pixel fit:** bars were 2.5 units and edges sat at .25 and .75. None of it landed on whole pixels at 16, 24 or 32 px, so every size was soft.
- **Readings:**
  - Buraco: a ring in a tray, read as a donut.
  - Calçada: a walker drawn in strokes.
  - Esgoto: read as an arrow.
- **Founder review (2026-10-26):** the front-view car and the elbow pipe were "jangled". Side views fixed both: a car is read by its profile and wheels, a pipe by its couplings, and water by drops rather than a jet.
  - Questão: an exclamation bubble, read as an alarm, against DESIGN.md's own No-Alarm Rule.
- **Sizes:** the app drew them at 13, 14, 18, 28 and 36 px, none crisp.

## What the research says

### Exemplars

The systems studied, with the licences that matter:
- **AIGA/DOT 50 symbols:** public domain. Measured from the Commons SVGs.
- **CONTRAN warning signs:** public domain on Commons. The subject only; never the yellow diamond.
- **ISO 22727:** the free preview. Only the rules may be followed, not ISO's drawings.
- **Product sets:** Material Symbols (Apache 2.0), Phosphor and Tabler (MIT), Fluent, Lucide.
- **Civic-reporting apps:** FixMyStreet has no category icons; its categories are text. The others weren't findable.

What they agree on:
- **Views:** solid silhouettes, front or side, or a section; never perspective.
- **Parts:** one subject and at most one qualifier, with as few components as possible (ISO 22727 6.5).
- **Reduction test:** a symbol must keep its character at a quarter of its size (ISO 22727 6.1.2 f), about 14 px for us.
- **No safety shapes:** ISO 7001 symbols deliberately avoid ISO 3864's colours and shapes so they can't be taken for warnings. That matches our rule.
- **Bins are a trap:** a bin reads as "delete" in product UI, so dumping is drawn as bags.

### Craft

Sources: Material's keylines, GitHub Primer, Lucide, Tabler, Volue and Fluent; see the briefs' URLs.
- **Same size by area:** different silhouettes look the same size when their area matches a keyline (circle Ø21, square 18, 21 × 15), not their width.
- **One bar width and a matching gap:** 2 to 3 units on a 24 grid, the gap at least the bar.
- **Angles:** 0°, 45° and 90°.
- **Pixel fit:** a 1.5-unit lattice is exactly 1 px at 16, 1.5 at 24, 2 at 32 and 3 at 48. Edges on it are crisp at those sizes and at no others. Pick the sizes; don't scale to fractional ones.

## The rules adopted (DESIGN.md "Pictograms")

- 24-unit grid, live area 1.5–22.5.
- Edges on the 1.5 lattice. Bars 3 units, with 1.5 only for a hairline between masses.
- Gaps and cut-outs at least 1.5, usually 3.
- At most three islands. Angles 0°, 45° and 90°.
- Even weight: max/min ink ≤ 1.4 across the set.
- `<Icon>` takes 16, 24, 32 or 48 px only, enforced by its type:
  - meta lines, chips and the command palette at 16;
  - the report form's tiles at 24;
  - list thumbnails and empty tiles at 32;
  - the empty photo area at 48.

## The set now

| Pictogram | Drawing | Ink |
|---|---|---|
| buraco | a wheel down in a hole in the road, in section (after CONTRAN A-19) | 26.7% |
| alaga | a car side on, water up to its wheels (the front view read as a boat or a bus stop) | 34.1% |
| bocalobo | a drain grate from above, water standing over it | 25.9% |
| lixo | two tied bags, a big and a small one, left out | 27.6% |
| entulho | a pile of bricks, three, two, one | 27.6% |
| poste | a street light, side on: pole, arm, lamp head | 26.7% |
| arvore | one canopy on a trunk that forks up into it, as a cut-out | 33.1% |
| calcada | the pavement in section, one slab heaved out of line | 25.8% |
| esgoto | a pipe with its couplings, dripping into a pool (a pouring stream always read as an arrow) | 31.7% |
| sinal | a traffic light with its visors | 30.4% |
| questao | a speech bubble with a question mark | 34.6% |

The spread is 1.34×, against 2.2× before. The before/after sheet, light and dark, at 96, 24, 16 and 14 px, is `antes-depois.png` (top rows before, bottom rows after).

## Tools

- `bun research/pictograms/tools/icon-lab.ts [fileA] [fileB] --out DIR --ref-exclude i-clock`:
  - per-icon ink, silhouette, bounding box, thin bars and narrow gaps, counters and islands at 24, 16, 14 and 13 px;
  - size ladders on light and dark, and an overlay on the keyline grid.
- `python3 -I research/pictograms/tools/sheet.py OUT.png A B…`: the compact before/after sheet.

## Open

- **Comprehension test:** ISO 9186-1 recommends testing with residents. A small panel in Canoas at 14 px would tell whether buraco, calçada and esgoto read without their labels. They never appear without their labels in the app.
- **Redraw on split:** if "Sinalização e semáforo" is split, signage would need its own drawing (a board on a pole), with no diamond and no ring.
