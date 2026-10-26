---
name: "Fala, Canoas"
description: "Claim and proof, monochrome: an independent civic map shown as precise product UI in one neutral scale, with one esmerald for what needs attention."
colors:
  paper: "#FAFAFA"
  ground: "#EFEFF1"
  panel: "#FFFFFF"
  panel-2: "#F5F5F6"
  panel-3: "#EDEDEF"
  ink: "#0E0F10"
  ink-2: "#393B40"
  ink-3: "#5F626A"
  line: "rgb(14 15 16 / .085)"
  line-2: "rgb(14 15 16 / .16)"
  line-3: "rgb(14 15 16 / .34)"
  map-line: "rgb(14 15 16 / .30)"
  map-fill: "rgb(14 15 16 / .025)"
  esmerald: "#0A6F4C"
  esmerald-deep: "#075E3F"
  esmerald-text: "#096B48"
  esmerald-wash: "rgb(10 111 76 / .10)"
  on-esmerald: "#FFFFFF"
  error-text: "#AE3D0B"
  paper-dark: "#0A0A0B"
  ground-dark: "#16161A"
  panel-dark: "#121214"
  panel-2-dark: "#18181B"
  panel-3-dark: "#202024"
  ink-dark: "#F3F3F4"
  ink-2-dark: "#C6C7CB"
  ink-3-dark: "#979AA2"
  line-dark: "rgb(255 255 255 / .075)"
  line-2-dark: "rgb(255 255 255 / .14)"
  line-3-dark: "rgb(255 255 255 / .32)"
  map-line-dark: "rgb(255 255 255 / .30)"
  map-fill-dark: "rgb(255 255 255 / .02)"
  esmerald-dark: "#16A975"
  esmerald-hover-dark: "#19BA81"
  esmerald-text-dark: "#18B880"
  esmerald-wash-dark: "rgb(22 169 117 / .17)"
  on-esmerald-dark: "#0E0F10"
  error-text-dark: "#FF8B57"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.75rem, 1.75rem + 2.3vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.125rem, 1.35rem + 2.5vw, 3.375rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.375rem, 1.2rem + 0.6vw, 1.625rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.125rem, 1.02rem + 0.42vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  wordmark:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  counter:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: '"tnum" 1, "zero" 0'
  counter-hero:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "clamp(3.5rem, 2.4rem + 3vw, 4.75rem)"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "-0.05em"
    fontFeature: '"tnum" 1, "zero" 0'
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: '"tnum" 1, "zero" 0'
  chip:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0.02em"
rounded:
  bar: "2px"
  xs: "6px"
  sm: "9px"
  thumb: "10px"
  ctl: "11px"
  inset: "12px"
  panel: "18px"
  stage: "28px"
  pill: "999px"
spacing:
  hair: "3px"
  tight: "6px"
  sm: "10px"
  md: "14px"
  panel-inset: "18px"
  stack: "20px"
  gutter: "clamp(20px, 4.2vw, 44px)"
  grid-gap: "clamp(32px, 4vw, 64px)"
  pair-gap: "clamp(32px, 5vw, 88px)"
  section: "clamp(88px, 11vw, 152px)"
  wrap: "1240px"
components:
  button-primary:
    backgroundColor: "{colors.esmerald}"
    textColor: "{colors.on-esmerald}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.esmerald-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "0 20px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.panel-2}"
  button-ghost-sm:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "38px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "38px"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "0 14px"
    height: "48px"
  code-slot:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    height: "56px"
  channel-segment:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-3}"
    rounded: "13px"
    padding: "4px"
  channel-segment-selected:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "42px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-3}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  choice-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  choice-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  choice-chip-app:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  choice-chip-app-touch:
    padding: "0 14px"
    height: "36px"
  choice-chip-app-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  panel-bar:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-3}"
    typography: "{typography.meta}"
    padding: "0 14px 0 16px"
    height: "44px"
  stage:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.stage}"
    padding: "clamp(20px, 3.4vw, 44px)"
  days-counter:
    textColor: "{colors.esmerald-text}"
    typography: "{typography.counter}"
  bairro-row:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    padding: "11px 18px"
  bairro-row-selected:
    backgroundColor: "{colors.esmerald-wash}"
    textColor: "{colors.esmerald-text}"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
---

# Design System: Fala, Canoas

## Overview

**Creative North Star: "The Claim Beside Its Proof"**

Fala, Canoas looks like a well-made software product describing itself, not like a city portal or a protest flyer. Every sentence of copy sits next to a framed slice of interface that proves it: a pin card with its day counter, a daily digest, a scoreboard with a tick ruler, the real 18-bairro linework. The page is built from one neutral scale running from paper to ink, hairlines at low ink alpha, and framed product panels on soft radial grounds with faint grain. Light and dark are both designed and follow the system setting. Dark is a full inversion of the scale, not a tint.

Colour is information. A single esmerald marks the act (the primary button), the clock (days open) and the place (the selected bairro). Everything else is ink, graphite and paper. Numbers are set in Geist Mono with tabular figures because here numbers are measurements: days, dates, queue counts, footnotes. Motion is a slow, soft rise as each proof enters, and it settles completely. Under reduced motion the page shows the final state.

The density is product-marketing calm: generous section padding, tight internal panel rhythm (10–18px), and wide asymmetric claim/proof grids. The world explicitly rejects the look of an official portal (brasão, flag palette, gov blue) and alarm styling (sirens, red alerts).

**Key Characteristics:**

- One neutral scale, light and dark, with esmerald as the only hue in chrome (errors keep their own warm text tone).
- Framed product panels (18px) inside larger radial-ground stages (28px), with long soft shadows.
- 1px hairlines at 8–34% ink alpha do all the structural work.
- Geist for words, Geist Mono for measurements.
- Real geometry: the 18 bairros drawn as non-scaling 1px linework.
- Every mock product surface carries a mono "exemplo" chip.

## Colors

A cool-neutral grey scale with a faint blue cast, plus one deep esmerald (chosen by the founder on 2026-10-26, replacing the bus-shelter orange). It is dark enough to carry white labels and to read as text on paper.

### Primary

- **Esmerald** (esmerald; dark: esmerald-dark): the fill of the primary action, the selected bairro's map stroke and lit queue slots, hot map pins with their halo, the over-deadline segment of the scoreboard ruler, and the comma in the wordmark. It is a fill and a stroke colour only.
- **Esmerald Deep** (esmerald-deep): primary button hover in light. In dark the hover goes lighter (esmerald-hover-dark).
- **Esmerald Text** (esmerald-text; dark: esmerald-text-dark): every piece of accent _text_: the "dias em aberto" counters and the selected bairro's queue count.
- **Ember Text** (error-text; dark: error-text-dark): form error messages and error borders, and nothing else. It is the old orange's text tone, kept because green would read as success.
- **Esmerald Wash** (esmerald-wash; dark: esmerald-wash-dark): the tint behind a selected bairro, both its map polygon and its list row, and the highlighted digest row.

### Neutral

- **Paper** (paper / paper-dark): page background and selection text.
- **Ground** (ground / ground-dark): the outer tone of stage radial gradients; the floor product panels sit on.
- **Panel** (panel / panel-dark): framed product surfaces, fields, chips and the selected half of segmented controls.
- **Panel Recess** (panel-2): segmented-control tracks, panel footers, ghost hover, list-row hover, code blocks and quiet callouts.
- **Panel Well** (panel-3): empty tracks of bars, queue slots and photo placeholders.
- **Ink** (ink / ink-dark): headings, primary text, data fills (bars, ruler fill, lit slots, done markers), focus rings, the dark button and the tooltip.
- **Graphite** (ink-2): body copy under headings, ledes, secondary links, table cells.
- **Slate** (ink-3): meta text, captions, hints, chips, table headers, the ruler's 30-day reference.
- **Hairline / Hairline Strong / Hairline Firm** (line, line-2, line-3): dividers and panel borders; control and chip borders; hover borders, dashed placeholders and link underlines.
- **Map Line / Map Fill** (map-line, map-fill): bairro boundary stroke and polygon tint.

### Named Rules

**The Three Places Rule.** Esmerald marks the action, the clock and the selected place, plus the brand comma. Data visualisations may use it for exactly one "needs attention" category (the over-deadline ruler segment, the hot pin, the "em aberto e atrasadas" stack segment). If a new use is none of these, it is ink.

**The Accent-Text Rule.** Esmerald text uses Esmerald Text. In light it is close to the fill, which also passes as text on paper; in dark the fill and the text tones differ, so keep the token.

**The Label-On-Esmerald Rule.** The primary button's label is white on the deep esmerald in light, and ink on the lighter esmerald in dark (on-esmerald, on-esmerald-dark).

**The No-Alarm Rule.** Errors are not red, and never the accent. Error copy and error borders use Ember Text. The system has no red or yellow in chrome, and its only green is the esmerald accent.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui fallback)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (with a metric-adjusted local fallback, then ui-monospace)

**Character:** One sans grotesk set tight at display sizes and relaxed in running text, with its mono sibling for anything counted, dated or measured. The two read as one family at different levels of precision.

### Hierarchy

- **Display** (600, clamp 2.75–3.5rem, 1.0, −0.04em): the single H1, balanced to at most three lines.
- **Headline** (600, clamp 2.125–3.375rem, 1.02, −0.035em): section H2s, always paired with a graphite paragraph in a 7/5 head grid.
- **Title** (600, clamp 1.375–1.625rem, 1.15, −0.025em): claim headings beside proofs.
- **Lede** (400, clamp 1.125–1.3125rem, 1.5): hero lede in graphite, about 33ch.
- **Body** (400, 1.0625rem, 1.6): running copy, kept to 40–62ch.
- **Body small** (400, 0.9375rem): nav links, definition-list values, the fold fact.
- **Label** (600, 0.875rem, −0.005em): field labels and legends.
- **Meta** (400, 0.8125rem, 1.45): hints, captions, panel bar text, table rows inside mock panels.
- **Counter** (Geist Mono 500, 2.25rem, −0.04em) and **Counter hero** (Geist Mono 500, clamp 3.5–4.75rem, 0.9, −0.05em): "dias em aberto", always in Esmerald Text.
- **Data** (Geist Mono 400, 0.75rem, tabular): dates, queue counts, table numbers, footnote markers.
- **Chip** (Geist Mono 400, 0.6875rem, +0.02em): "exemplo", the "independente" tag, badges.

Weights in use are 400, 500 (table names, tabs, list names, counters) and 600 (headings, labels, buttons).

### Named Rules

**The Measurement Rule.** Geist Mono with tabular figures is for things that are measured: counts, days, dates, codes, footnote markers. Words stay in Geist. Mono is for standalone measurements; an identifier inside running text (the masked phone number in a sentence) stays Geist with tabular figures, because mono breaks the line's rhythm.

**The Sentence-Case Rule.** No uppercase, no letter-spaced labels and no eyebrow kickers above headings. Section heads are a headline and a paragraph. The only numbered markers are the four loop steps.

## Layout

A centred 1240px wrap with a fluid gutter (clamp 20–44px). The hero is a 6/6 grid whose right stage bleeds off the right viewport edge (right radius and border removed). Sections alternate claim and proof in asymmetric pairs (4/7, flipped 7/4, or 6/5) with large gaps (clamp 32–88px). Section heads use a 7/5 grid aligned to the baseline end. The bairro chooser is 7/5 with the map sticky at 92px on wide screens. Signup is 5/6 with the claim sticky.

Vertical rhythm: sections are padded clamp 88–152px and separated by a hairline; consecutive pairs sit clamp 72–128px apart. Inside panels the rhythm tightens to 6, 10, 14 and 18px steps, with 44px bars and 18px horizontal insets.

Breakpoints: at 1080px all grids collapse to one column and the hero stage re-anchors to the gutter. At 900px the nav hides and the header keeps the ghost CTA. At 700px the hero form stacks full width, the stage goes edge to edge with square corners, the mini scoreboard drops, and scoreboard tables reflow into two-line cards. At 420px the header tag hides.

## Elevation & Depth

Hybrid. Structure comes from hairlines and tonal steps (paper, ground, panel, recess, well). Lift is reserved for framed product panels and for the selected half of a segmented control. Stages add depth with a radial gradient (bright panel tone at 62% 18% falling to ground) and a fractal-noise grain at 5% (multiply) in light, 3.5% (screen) in dark. The header becomes 94% paper with a hairline only once the page scrolls.

### Shadow Vocabulary

- **Panel lift** (light: `0 1px 1px rgb(14 15 16 / .04), 0 10px 24px -8px rgb(14 15 16 / .10), 0 36px 72px -28px rgb(14 15 16 / .22)`; dark: `0 0 0 1px rgb(255 255 255 / .02), 0 2px 6px rgb(0 0 0 / .4), 0 32px 64px -24px rgb(0 0 0 / .8)`): every framed product panel.
- **Control lift** (light: `0 1px 1px rgb(14 15 16 / .05), 0 6px 16px -8px rgb(14 15 16 / .14)`; dark: `0 2px 6px rgb(0 0 0 / .45), 0 10px 24px -12px rgb(0 0 0 / .7)`): the selected segment in segmented controls.
- **Primary bevel** (`inset 0 1px 0 rgb(255 255 255 / .22), 0 1px 2px rgb(14 15 16 / .18)`): the esmerald button only.

### Named Rules

**The Long Soft Shadow Rule.** Shadows are long, low-alpha and negatively spread, so panels float above the ground rather than sitting in boxes. No hard offsets and no coloured glows.

## Shapes

The corners are soft and concentric. Stages are 28px, the panels inside them 18px, and controls 11px (9px at small size and inside segmented tracks, with 6px inner pills). Inline thumbnails use 10px and callouts 12px. Chips and tags are full pills. Data bars use 2–3px. Pins and step markers are circles. Borders are always 1px; dashed hairlines mean "not yet" (the after-photo placeholder, the preview notice). Map strokes do not scale with the SVG.

## Components

### Buttons

Quiet, exact, 48px tall.

- **Shape:** gently rounded (11px; small size 38px tall at 9px).
- **Primary:** Esmerald fill, white label at 600 (ink in dark), 0 20px padding, primary bevel. In the hero it grows to 52px; in the signup form it is full width at 54px; in the sign-in column it is full width at 52px. Carries a leading WhatsApp icon or a trailing arrow. The esmerald paints out to the border edge, under the transparent 1px border, so a full-width button lines up exactly with the fields above it.
- **Hover / Focus / Active:** hover moves to Esmerald Deep. Active nudges down 1px. Focus is a 2px ink outline at 3px offset. A loading state dims the label and shows a 16px spinner. Disabled sits at 55% opacity.
- **Ghost:** transparent with a Hairline Strong border and ink label. On hover it takes Panel Recess with Hairline Firm. It is used for the header CTA and the share actions, with a leading 17px stroke icon.
- **Ink:** ink fill with a paper label. It appears only inside mock product UI (the composer's "Enviar").

### Chips

- **Exemplo chip:** a mono 11px pill with Hairline Strong border, Slate text and panel fill. It sits at the right of every mock panel bar, or over a photo at 88% panel.
- **Choice chips (mock):** 12px Geist pills. Unselected is panel with graphite text; selected is inverted to ink fill with paper text.
- **Choice chips (app):** full pills, 24px tall with 12px Geist for a mouse, 36px with 14px text on touch or narrow screens. Unselected is paper with a Hairline Strong border and an ink label, Panel Recess on hover. Selected inverts to ink fill with a paper label. They are toggles (pressed state) under a field, for suggestions such as apelidos.
- **Badge:** a mono 11px tag at 6px radius for inline verification marks.

### Cards / Containers

- **Stage:** 28px radius with a hairline border, radial ground and grain. Inner padding is clamp 20–44px (14px on mobile).
- **Panel:** 18px radius, panel fill, hairline border, panel lift, clipped content.
- **Panel bar:** a 44px header row with a hairline below. It holds a bold ink title, meta text in Slate and the exemplo chip pushed right. Footers mirror it on Panel Recess.

### Inputs / Fields

- **Style:** 48px (52px in the hero), 11px radius, Hairline Strong border, panel fill, 1rem Geist, 14px inset. The native select carries a custom chevron at 14px from the right.
- **Focus:** the border turns ink with a 3px ring of ink at 14%.
- **Error:** the border and a 13px message turn Ember Text.
- **Code entry:** six separate 56px boxes that share the column's full width with 8px gaps, each 11px radius on panel fill with a Hairline Strong border, one Geist Mono digit at 1.5rem with tabular figures. The current box takes an ink border on all four sides and the 3px ring of ink at 14%. Errors turn the borders Shelter Orange Text.
- **Checkbox:** 20px at 6px radius with a Hairline Firm border. Checked is an ink fill with a paper tick.

### Segmented Channel Control

A Panel Recess track (4px padding, 13px radius, hairline border) holding two 42px options at 9px radius. The checked option lifts to panel fill with ink text and control lift. Unchecked options are Slate. Focus shows a 2px ink outline. A compact 12px variant appears in mock panel bars.

### Navigation

A sticky 68px header: the wordmark (Geist 600, esmerald comma), a mono "independente" pill tag, four 15px graphite links (ink on hover, no underline), and a small ghost CTA. Below 900px only the wordmark, tag and CTA remain.

### Maps

The 18 bairros are drawn as 1px non-scaling Map Line strokes over Map Fill. Hover tints a polygon to ink at 7%, and keyboard focus strokes it 2px ink. The selected bairro takes Esmerald Wash fill with a 1.6px esmerald stroke, and the selection syncs across every map on the page. Pins are ink dots ringed in panel. Done pins are hollow Slate rings. Hot pins are esmerald, with a single esmerald halo that pulses three times and then stops. An ink tooltip (9px radius, 7px 10px) names the bairro and its queue count.

### Pin Card

A panel with a 4:3 credited photo (exemplo chip overlaid), a 12px category line, a 16px/600 title, a Counter in Esmerald Text over a hairline with its unit in meta, and a mono-dated timeline in 12px.

### Scoreboard Ruler

A 22px track with 12 hairline ticks masked to the bottom 7px. An 8px ink fill with 2px radius marks the median days. A 1px Slate reference line marks 30 days, labelled in 10px mono. Fills past the deadline switch to esmerald at the cut. In tables, numbers are right-aligned mono and names are ink 500.

### Step Ruler

The sign-in stepper, a variant of the Scoreboard Ruler. It is 18px tall with 13 marks on twelfths, each a 1px box that ends exactly on its position (the first starts on it), so every mark, the line and the needle snap to one pixel grid. Every fourth mark is a 12px step mark in Hairline Firm; the others are 6px minor ticks in Hairline Strong, over a 1px Hairline Strong baseline. Progress is a 2px ink line that ends under a 2px by 18px ink needle resting on the middle tick of the current step, or on the last tick when done. Line and needle move together over 0.7s with the house easing and pick up where the previous page stopped; under reduced motion they jump. Below, three 13px labels sit flush with the step marks: past steps in graphite with a leading check, the current step in ink 500, later steps in Slate. It uses a 2px line and a needle instead of the Scoreboard Ruler's 8px rounded fill because a rounded fill cannot end cleanly on a tick.

### Bairro Queue List

Hairline-separated full-width rows (11px 18px) showing the bairro name (15px/500), a right-aligned mono queue count, and a 20-slot meter of 12px cells at 2px radius on Panel Well, filled with ink as neighbours join. Hover takes Panel Recess. The selected row gets Esmerald Wash, esmerald lit slots and an esmerald count.

### Not Found

An address that leads nowhere is drawn off the map. The 18 bairros sit in a panel, each a link, with a Ghost Pin past the city's south-east corner: a dashed ring in ink, whose halo breathes three times and stops, like the hot pin's but in ink. An ink tooltip beside it carries the address in mono. Above it, a title-size heading ("Esta página não está no mapa."), one plain line on why, and "Você quis dizer…" rows when the address looks like a pin's code or a bairro. Inside the app, a missing pin takes the detail panel: a dashed slot where its photo would be, holding the Ghost Pin and the code. A missing bairro lists the close matches, then every bairro as pills. Failures use the same voice ("Algo falhou do nosso lado.") with "Tentar de novo".

### Reports and Moderation

Reporting is quiet until needed. A Slate flag button sits beside each update and at the end of a photo's thumbnail strip; a text link ("Algo errado neste registro? Denunciar") closes the pin. The report form is a Dialog on desktop and a Drawer on phones: six reasons as bordered radio rows, an optional note, an ink submit. Moderators get a segmented control for "Remover agora", which turns the submit destructive and asks for a public reason, with one-tap reason chips. A photo waiting for review never shows as an image: a dashed tile in the strip, or a Panel Recess block with a scan-eye stroke and "Foto em análise". On /moderar, sections (Denúncias, Contestações, Registros em análise, Fotos novas) carry a mono count; images reported for nudity or a child, or rated likely nude by the automatic screening, sit under a heavy blur until the moderator chooses "Ver imagem". Under each photo, the screening's findings are secondary badges ("Nudez provável", "2 rostos", "1 placa"), or one Slate line when it saw nothing. The child abuse escalation is a quiet shield-icon button that opens a dashed explanation and a destructive "Remover e encaminhar"; it is never one tap.

### Pictograms

One pictogram per category, drawn to the public-information norm: ISO 7001's construction in the public-domain AIGA/DOT drawing style. Where a Brazilian traffic sign (CONTRAN) already shows the subject, the pictogram takes that subject (the traffic light, the pedestrian, the road surface), but never the sign's yellow diamond or red ring: nothing may read as an alert. Each is a solid single-ink silhouette on a 24-unit grid, inside 2 to 22. Limbs and bars are 2.5 units, and gaps and cut-outs are at least 2, so the set still reads at 13px. It shows the object, not a mood: a tire in the hole, a tied bag, a pipe pouring out, a car up to its doors in water. They take the text colour around them: Slate in tiles and meta lines, ink in filter chips. They live in `src/components/Icons.tsx` behind `<Icon name>`; all other interface icons are lucide strokes.

## Do's and Don'ts

### Do:

- **Do** frame every product claim with a panel inside a stage, and chip mock data "exemplo" in mono.
- **Do** set every count, day, date and footnote marker in Geist Mono with tabular figures.
- **Do** keep esmerald to the action, the clock, the selected place and the brand comma. Use Esmerald Text for any accent words or numbers.
- **Do** design both themes. Dark inverts the neutral scale and lightens the esmerald (esmerald-dark, esmerald-text-dark).
- **Do** use 1px hairlines for structure, and dashed hairlines for things that do not exist yet.
- **Do** use the house easing `cubic-bezier(.16,1,.3,1)`: 0.2s for state changes and a 1.1s rise with blur for entering proofs. Show the final state under reduced motion.

### Don't:

- **Don't** use red or yellow in chrome, or any green but the esmerald. Errors use Ember Text. Other hues may appear only as small data marks.
- **Don't** put ink on the light-theme esmerald, or white on the dark-theme one.
- **Don't** add eyebrow kickers, uppercase labels or numbered section markers; numbering belongs only to the four loop steps.
- **Don't** use the brasão, the flag palette, gov blue, Rawline or siren styling. Nothing may read as the Prefeitura or as an alert.
- **Don't** use hard offset shadows, coloured glows or thick borders. Lift is long and soft.
- **Don't** loop motion indefinitely. The pin halo pulses three times and stops.
