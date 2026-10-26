// The daily resumo to the Ouvidoria, laid out. Words, numbers and file paths come from data.json
// (apps/digest/src/pdf/template-data.ts); this file only decides where they go.
//
// Structure (DECISIONS round 5; the reasoning and sources are in research/digest-pdf): page 1 says
// what this is and what is asked; then the city map; then one section per body, each starting on
// its own page so it can be forwarded as is: its opener and index, then one record per report.
//
// The look ("Dossiê", research/digest-pdf/craft.md): an asymmetric page with a label rail on the left
// (Apple's Platform Security guide), a strip across the head with one segment per body, the current
// one named (the NAO's annual report), each record opening on an ink band, and DESIGN.md's neutral
// scale with the esmerald accent kept to what needs finding: the place, the busiest body, the ask.

#let d = json("data.json")
#let m = d.meta

// ---- Tokens: DESIGN.md's neutral scale, for paper ----------------------------------------------
#let ink = rgb("#0E0F10")
#let ink2 = rgb("#393B40")
#let ink3 = rgb("#5F626A")
#let rule = rgb("#C9CACE")
#let hair = rgb("#E2E3E6")
#let wash = rgb("#F4F4F5")
#let wash2 = rgb("#E6E6E9")
#let accent = rgb("#0A6F4C")

// ---- Grid: a 174 mm text block, a 40 mm label rail, a 6 mm gap, 128 mm of content ---------------
#let W = 174mm
#let rail = 40mm
#let gap = 6mm
#let C = W - rail - gap

#set document(title: m.title, author: m.sender, keywords: ("resumo diário", "Ouvidoria", "problemas urbanos"))
#set text(font: "Geist", size: 9pt, fill: ink, lang: "pt", region: "br")
#set par(leading: 0.58em, spacing: 0.9em)
#set table(stroke: none)
#show link: it => underline(stroke: 0.4pt + rule, offset: 2pt, evade: true, it)

#let tab(body) = text(number-width: "tabular", body)
// Geist Mono with the slashed zero (ss09): codes and coordinates read without doubt.
#let mono(body, size: 8pt, fill: ink) = text(font: "Geist Mono", size: size, fill: fill, features: ("ss09",), body)
// Tracked capitals for labels, never for sentences.
#let caps(body, fill: ink3, size: 6.5pt) = text(size: size, weight: 600, tracking: 0.09em, fill: fill, upper(body))

#let wordmark(size, fill: ink) = {
  let parts = m.sender.split(",")
  text(size: size, weight: 600, tracking: -0.015em, fill: fill)[#parts.at(0)#text(fill: accent)[,]#parts.slice(1).join(",")]
}

// The two-column page: a label on the rail, its content beside it.
#let row(label, content, below: 0pt) = block(width: W, below: below, grid(columns: (rail, C), column-gutter: gap, label, content))
#let meta(k, v) = stack(spacing: 1.7mm, caps(k), text(size: 8.3pt, v))

// A category's pictogram, set beside its name: decoration for a screen reader, since the name is read.
#let pictogram(file, size: 3.6mm, fill: ink) = if file != none {
  pdf.artifact(box(baseline: 18%, image(bytes(read(file).replace("currentColor", fill.to-hex())), width: size, height: size)))
}

// ---- Which body a page belongs to ---------------------------------------------------------------
// Each section leaves a marker; a page belongs to the last section that started on or before it.
#let n-bodies = d.sections.len()
#let section-at(pg) = {
  let starts = query(<orgao>).filter(s => s.location().page() <= pg)
  if starts.len() == 0 { none } else { (i: starts.len(), name: starts.last().value) }
}

// The strip across the head: one segment per body, the current one in ink and named under it, so a
// forwarded section still says which of how many it is. Decoration: the heading says it in words.
#let strip(pg) = pdf.artifact(block(width: W, height: 7mm, {
  let s = section-at(pg)
  let sep = 1.2mm
  let w = (W - (n-bodies - 1) * sep) / n-bodies
  for k in range(n-bodies) {
    let on = s != none and k + 1 == s.i
    place(top + left, dx: k * (w + sep), rect(width: w, height: if on { 1.8mm } else { 1.2mm }, fill: if on { ink } else { wash2 }))
  }
  if s != none {
    let label = text(size: 6.5pt, weight: 600, fill: ink, tab[#s.i/#n-bodies · #s.name])
    // Named under its own segment; from the middle on, aligned to the segment's right edge.
    let x = (s.i - 1) * (w + sep)
    if s.i <= calc.ceil(n-bodies / 2) { place(top + left, dx: x, dy: 3mm, label) } else { place(top + right, dx: -(W - x - w), dy: 3mm, label) }
  }
}))

#set page(
  paper: "a4",
  margin: (top: 30mm, bottom: 20mm, left: 18mm, right: 18mm),
  header-ascent: 28%,
  footer-descent: 40%,
  header: context {
    set text(size: 7pt, fill: ink3)
    grid(columns: (1fr, auto), align: bottom,
      [#wordmark(7.5pt)#h(8pt)Resumo diário nº #m.number · #m.day],
      if m.sample { text(fill: ink, weight: 600)[Amostra com dados fictícios] })
    v(2.4mm)
    strip(here().page())
  },
  footer: context {
    set text(size: 7pt, fill: ink3)
    grid(columns: (rail, 1fr), column-gutter: gap,
      text(weight: 600, fill: ink, tab[Página #counter(page).display() de #counter(page).final().first()]),
      [#m.host · registros públicos, com fotos e histórico · mapas © colaboradores do OpenStreetMap (ODbL)])
  },
  background: if m.sample {
    pdf.artifact(place(center + horizon, rotate(-35deg, text(size: 96pt, weight: 700, fill: ink.transparentize(95%), tracking: 0.05em, "AMOSTRA"))))
  },
)

#show heading.where(level: 1): it => block(above: 0pt, below: 0pt, text(size: 24pt, weight: 600, tracking: -0.028em, it.body))
#show heading.where(level: 2): it => block(above: 0pt, below: 0pt, text(size: 13pt, weight: 600, tracking: -0.014em, it.body))

// ---- Maps ---------------------------------------------------------------------------------------

#let scale-bar(s, width) = box(fill: white.transparentize(10%), inset: (x: 3pt, top: 2pt, bottom: 2.5pt), radius: 2pt, stack(spacing: 1.6pt,
  text(size: 6pt, fill: ink2, tab(s.label)),
  box(width: s.fraction * width, height: 2.6pt, stroke: (bottom: 0.8pt + ink2, left: 0.8pt + ink2, right: 0.8pt + ink2))))

// A street name on the map, centred on its anchor, along its street, with a white halo.
#let street-label(l, width, height) = context {
  let body(stroke) = text(size: 6.2pt, weight: 500, fill: if stroke == none { ink2 } else { white }, stroke: stroke, l.name)
  let s = measure(body(none))
  let at = (dx: l.x * width - s.width / 2, dy: l.y * height - s.height / 2)
  place(top + left, ..at, rotate(l.angle * 1deg, body(2pt + white)))
  place(top + left, ..at, rotate(l.angle * 1deg, body(none)))
}

#let disc(n, r: 2.2mm) = circle(radius: r, fill: ink, stroke: 0.8pt + white, inset: 0pt)[
  #set align(center + horizon)
  #text(size: if n >= 100 { 5.4pt } else { 6.4pt }, weight: 600, fill: white, tab(str(n)))]

// The numbered discs (or plain dots past the numbering limit), set over the map. The figure's alt
// text speaks for the whole map, so all of this is an artifact for screen readers.
#let marker-layer(map, width, height) = pdf.artifact(for mk in map.markers {
  if map.numbered {
    if mk.moved {
      place(top + left, line(start: (mk.x * width, mk.y * height), end: (mk.lx * width, mk.ly * height), stroke: 0.5pt + ink3))
      place(top + left, dx: mk.x * width - 0.6mm, dy: mk.y * height - 0.6mm, circle(radius: 0.6mm, fill: ink))
    }
    let r = if mk.n >= 100 { 2.5mm } else { 2.2mm }
    place(top + left, dx: mk.lx * width - r, dy: mk.ly * height - r, disc(mk.n, r: r))
  } else {
    place(top + left, dx: mk.x * width - 0.9mm, dy: mk.y * height - 0.9mm, circle(radius: 0.9mm, fill: ink, stroke: 0.5pt + white))
  }
})

#let area-map(map, width, alt) = {
  let height = width / map.aspect
  figure(alt: alt, box(width: width, height: height, clip: true, stroke: 0.5pt + rule, {
    image(map.svg, width: width, height: height, alt: alt)
    marker-layer(map, width, height)
    pdf.artifact(place(bottom + left, dx: 3mm, dy: -3mm, scale-bar(map.scale, width)))
  }))
}

// The streets around one report: the place in accent, inside a ring as wide as the scale bar's
// half (a resident's tap, not a survey), the nearest street names along their streets.
#let locator(e, width) = {
  let map = e.locator
  let height = width / map.aspect
  figure(alt: e.locatorAlt, box(width: width, height: height, clip: true, stroke: 0.5pt + rule, {
    image(map.svg, width: width, height: height, alt: e.locatorAlt)
    pdf.artifact({
      for l in map.labels { street-label(l, width, height) }
      let ring = map.scale.fraction * width / 2
      place(top + left, dx: width / 2 - ring, dy: height / 2 - ring, circle(radius: ring, fill: accent.transparentize(88%), stroke: (paint: accent, thickness: 0.6pt, dash: "dashed")))
      place(top + left, dx: width / 2 - 2.1mm, dy: height / 2 - 2.1mm, circle(radius: 2.1mm, fill: accent, stroke: 1.3pt + white))
      place(bottom + left, dx: 2.5mm, dy: -2.5mm, scale-bar(map.scale, width))
    })
  }))
}

#let photo(p, w, h) = box(width: w, height: h, clip: true, stroke: 0.4pt + hair, image(p.file, width: w, height: h, fit: "cover", alt: p.alt))

// ---- Page 1: what this is, and what is asked ----------------------------------------------------

#row(
  stack(spacing: 5mm,
    meta("Resumo diário", tab[nº #m.number]),
    meta("Data", m.dateLong),
    meta("Para", m.addressee.to),
    ..if m.addressee.cc.len() > 0 { (meta("Com cópia", m.addressee.cc.join(", ")),) },
    meta("Assunto", text(weight: 600, m.subject))),
  {
    heading(level: 1, bookmarked: true)[#text(size: 28pt, tracking: -0.032em, m.headline)]
    v(5mm)
    block(width: 112mm, text(size: 10.5pt, fill: ink2, m.lede))
    v(9mm)
    // The day in four figures, each under a rule; the reports in accent, because they're the ask.
    let fig(s, first) = block(width: 100%, stroke: (top: 1.2pt + if first { accent } else { ink }), inset: (top: 3mm), stack(spacing: 2.4mm,
      text(size: 28pt, weight: 600, tracking: -0.035em, fill: if first { accent } else { ink }, tab(s.value)), text(size: 7.5pt, fill: ink2, s.label)))
    grid(columns: (1fr,) * m.stats.len(), column-gutter: 5mm, ..m.stats.enumerate().map(((i, s)) => fig(s, i == 0)))
  },
  below: 10mm)

#if m.sample {
  row([], block(width: 100%, stroke: 0.6pt + ink, inset: (x: 4mm, y: 3mm), text(size: 8.3pt)[*Amostra com dados fictícios.* Nenhum destes registros é real; este documento mostra como o resumo chega à Ouvidoria.]), below: 8mm)
}

// The bodies: name and numbers, a bar for the share (the busiest in accent), the pages to turn to.
#let mx = calc.max(..d.summary.map(s => s.count))
#let bar(n) = pdf.artifact(box(width: 30mm, height: 2.2mm, {
  place(left + horizon, rect(width: 30mm, height: 2.2mm, fill: wash2))
  place(left + horizon, rect(width: n / mx * 30mm, height: 2.2mm, fill: if n == mx { accent } else { ink }))
}))
#row(caps[Por órgão], context {
  let starts = d.summary.map(s => locate(label(s.key)).page())
  let last = counter(page).final().first()
  let pages(i) = {
    let a = starts.at(i)
    let b = if i + 1 < starts.len() { starts.at(i + 1) - 1 } else { last }
    if a == b { str(a) } else { str(a) + "–" + str(b) }
  }
  table(columns: (1fr, 30mm, 7mm, 16mm), column-gutter: 3mm, inset: (x: 0pt, y: 2.7mm),
    align: (left + horizon, left + horizon, right + horizon, right + horizon),
    table.header(caps[Órgão], caps[Volume], caps[Reg.], caps[Páginas]),
    table.hline(stroke: 0.8pt + ink),
    ..d.summary.enumerate().map(((i, s)) => (
      stack(spacing: 1.5mm, link(label(s.key), text(size: 9pt, weight: 500, s.agency)), text(size: 7pt, fill: ink3, tab(s.range))),
      bar(s.count),
      text(weight: 600, tab(str(s.count))),
      text(fill: ink3, tab(pages(i))),
      table.hline(stroke: 0.4pt + hair),
    )).flatten())
}, below: 8mm)

#v(1fr)
// The ask, as a finding: a bold lead, then how to answer.
#row(caps(fill: accent)[O que pedimos], block(width: 100%, fill: wash, inset: (x: 5mm, y: 4.5mm), stack(spacing: 2.2mm,
  text(size: 10pt, weight: 600)[Que cada registro seja protocolado e encaminhado ao órgão responsável.],
  text(size: 8.5pt, fill: ink2, m.answer))), below: 5mm)
#row([], text(size: 7pt, fill: ink3)[#m.clock #m.privacy #m.independent])

// ---- The city -----------------------------------------------------------------------------------

#if d.overview != none {
  pagebreak()
  row(caps[Mapa], { heading(level: 1)[Mapa dos registros]; v(2.5mm); text(fill: ink3, m.overviewCaption) }, below: 6mm)
  area-map(d.overview, W, "Mapa de " + m.municipality + " com os bairros e os registros deste resumo")
  v(2.5mm)
  text(size: 6.5pt, fill: ink3, m.attribution)
  // The key, number to place, so the map reads without turning pages; only while numbered.
  if d.overview.numbered {
    v(5mm)
    grid(columns: (1fr,) * 4, column-gutter: 4mm, row-gutter: 2.8mm, ..d.sections.map(s => s.entries).flatten().map(e => grid(columns: (5.5mm, 1fr), column-gutter: 1.5mm,
      pdf.artifact(disc(e.n, r: 2mm)),
      stack(spacing: 1.2mm, text(size: 7.3pt, weight: 500, e.category), text(size: 6.5pt, fill: ink3)[#mono(e.id, size: 6.5pt, fill: ink3) · #e.bairro]))))
  }
}

// ---- One section per body -----------------------------------------------------------------------

#let record(e) = block(breakable: false, width: W, below: 8mm, {
  // The band: number, code, the category with its pictogram, bairro and time, reversed on ink.
  block(width: W, fill: ink, inset: (x: 3.5mm, y: 2.6mm), below: 4.5mm, grid(columns: (rail - 3.5mm + gap / 2, auto, 1fr, auto), column-gutter: 3mm, align: horizon,
    text(size: 15pt, weight: 600, fill: white, tracking: -0.02em, tab(str(e.n))),
    mono(e.id, size: 8pt, fill: white),
    text(size: 8pt, fill: luma(215))[#pictogram(e.icon, fill: white)#h(1.6mm)#e.category · #e.bairro],
    if e.registered != none { text(size: 7.5pt, fill: luma(190), tab(e.registered)) }))
  row(
    // The rail: what the Ouvidoria copies into a protocol, then the way to the full record.
    stack(spacing: 3.6mm,
      ..(
        if e.address != none { meta("Endereço", e.address) },
        if e.reference != none { meta("Referência", e.reference) },
        if e.street != none { meta("Via mais próxima", e.street) },
        if e.place != none { meta("Lugar", e.place) },
        if e.coords != none { meta("Coordenadas", mono(e.coords, size: 7.8pt)) },
        meta("Confirmações", e.confirmations),
        if e.photosLine != none { meta("Fotos", e.photosLine) },
      ).filter(x => x != none),
      v(0.5mm),
      if e.qr != none { image(e.qr, width: 18mm, alt: e.qrAlt) },
      text(size: 6.5pt, fill: ink3)[#link(e.url, e.urlLabel)#if e.osm != none [ \ #link(e.osm)[Abrir no OpenStreetMap]]]),
    {
      [#heading(level: 2, e.title)#label("r-" + e.id)]
      if e.text != none { v(2mm); text(size: 9.3pt, fill: ink2)[“#e.text”] }
      // A street that floods: the resident's account, then what the nearest gauge measured, each
      // said as what it is.
      if e.water != none or e.rain != none {
        v(3mm)
        block(width: C, inset: (left: 3mm, y: 0.6mm), stroke: (left: 1.2pt + hair), stack(spacing: 2.2mm,
          ..(
            if e.water != none { text(size: 8.6pt, fill: ink2)[#text(fill: ink3)[Segundo quem registrou:] #e.water] },
            if e.rain != none { stack(spacing: 1.3mm, text(size: 8.6pt, fill: ink2, e.rain.line), text(size: 6.8pt, fill: ink3, e.rain.source)) },
          ).filter(x => x != none)))
      }
      v(4mm)
      if e.locator != none {
        // The street map and the photos side by side, on the content column's grid.
        let mw = 76mm
        let pw = (C - mw - 4mm - 2.5mm) / 2
        grid(columns: (mw, 1fr), column-gutter: 4mm, align: top,
          locator(e, mw),
          if e.photos.len() > 0 {
            grid(columns: (pw, pw), column-gutter: 2.5mm, row-gutter: 2.5mm, ..e.photos.map(p => photo(p, pw, pw * 3 / 4)))
          })
      } else if e.photos.len() > 0 {
        let pw = (C - 3 * 2.5mm) / 4
        grid(columns: (pw,) * 4, column-gutter: 2.5mm, ..e.photos.map(p => photo(p, pw, pw * 3 / 4)))
      }
    })
})

#for (i, s) in d.sections.enumerate() {
  pagebreak()
  [#metadata(s.short)<orgao>]
  row(
    stack(spacing: 2mm, text(size: 40pt, weight: 600, tracking: -0.04em, tab(if i + 1 < 10 { "0" + str(i + 1) } else { str(i + 1) })), text(size: 7.5pt, fill: ink3)[de #n-bodies #if n-bodies == 1 [órgão] else [órgãos]]),
    { [#heading(level: 1, s.agency)#label(s.key)]; v(3mm); text(fill: ink3, s.line) },
    below: 7mm)
  row(caps[Registros deste órgão], {
    if s.map != none {
      area-map(s.map, C, "Mapa com os registros de " + s.agency + ", numerados como na lista abaixo")
      v(4mm)
    }
    table(columns: (7mm, 13mm, 1fr, 26mm, 8mm), column-gutter: 2.5mm, inset: (x: 0pt, y: 2.2mm),
      align: (left + top, left + top, left + top, left + top, right + top),
      table.header(caps[Nº], caps[Código], caps[Registro], caps[Bairro], caps[Pág.]),
      table.hline(stroke: 0.8pt + ink),
      ..s.entries.map(e => (
        text(weight: 600, tab(str(e.n))),
        link(label("r-" + e.id), mono(e.id, size: 7.5pt)),
        stack(spacing: 1.3mm, text(size: 8pt, weight: 500, e.title), text(size: 6.8pt, fill: ink3, e.category)),
        text(size: 8pt, e.bairro),
        text(size: 8pt, fill: ink3, context tab(str(counter(page).at(label("r-" + e.id)).first()))),
        table.hline(stroke: 0.4pt + hair),
      )).flatten())
  }, below: 9mm)
  for e in s.entries { record(e) }
}
