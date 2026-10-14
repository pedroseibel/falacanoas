// The daily resumo to the Ouvidoria, laid out. Words, numbers and file paths come from data.json
// (apps/digest/src/pdf/template-data.ts); this file only decides where they go.
//
// Structure (DECISIONS round 5; the reasoning and sources are in research/digest-pdf):
// page 1 says what this is and what is asked; page 2 is the city map; then one section per body,
// each starting on its own page so it can be forwarded as is: its map, its index, then one record
// per report. Running head names the body on every page; "Página X de Y" in the foot.

#let d = json("data.json")
#let m = d.meta

// DESIGN.md's neutral scale for print; the orange marks the place a record is about, nothing else.
#let ink = rgb("#0E0F10")
#let ink2 = rgb("#393B40")
#let ink3 = rgb("#5F626A")
#let hair = rgb("#E4E4E6")
#let rule = rgb("#C9CACE")
#let wash = rgb("#F5F5F6")
#let orange = rgb("#F05A1A")

#let W = 172mm // the text block's width

#set document(title: m.title, author: m.sender, keywords: ("resumo diário", "Ouvidoria", "problemas urbanos"))
#set text(font: "Geist", size: 9.5pt, fill: ink, lang: "pt", region: "br")
#set par(leading: 0.62em, spacing: 1em)
#set table(stroke: none)
#show link: it => underline(stroke: 0.4pt + rule, offset: 2pt, evade: true, it)

#let mono(body, size: 8.5pt) = text(font: "Geist Mono", size: size, body)
#let tab(body) = text(number-width: "tabular", body)

#let wordmark(size) = {
  let parts = m.sender.split(",")
  text(size: size, weight: 600, tracking: -0.01em)[#parts.at(0)#text(fill: orange)[,]#parts.slice(1).join(",")]
}

// The body a page belongs to, for the running head: one opening on this page, or the last before it.
#let body-at(loc) = {
  let here-page = loc.page()
  let on = query(heading.where(level: 1)).filter(h => h.location().page() == here-page)
  if on.len() > 0 { return on.first().body }
  let before = query(selector(heading.where(level: 1)).before(loc))
  if before.len() > 0 { before.last().body } else { none }
}

#let code-chip(id) = box(
  inset: (x: 3.5pt, y: 2pt),
  outset: (y: 0.5pt),
  radius: 3pt,
  stroke: 0.6pt + rule,
  mono(id, size: 8pt),
)

#set page(
  paper: "a4",
  margin: (top: 22mm, bottom: 20mm, left: 20mm, right: 18mm),
  header-ascent: 38%,
  footer-descent: 40%,
  header: context {
    if here().page() > 1 {
      set text(size: 7.5pt, fill: ink3)
      grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        [#wordmark(8.5pt)#h(6pt)Resumo diário nº #m.number · #m.day#if m.sample [ · #text(fill: ink, weight: 500)[AMOSTRA COM DADOS FICTÍCIOS]]],
        {
          let b = body-at(here())
          if b != none { text(fill: ink2, weight: 500, b) }
        },
      )
      v(-2pt)
      line(length: 100%, stroke: 0.5pt + hair)
    }
  },
  footer: context {
    set text(size: 7pt, fill: ink3)
    grid(
      columns: (1fr, auto),
      align: (left + top, right + top),
      [#m.host · registros públicos, com fotos e histórico · mapas © colaboradores do OpenStreetMap (ODbL)],
      tab[Página #counter(page).display() de #counter(page).final().first()],
    )
  },
  background: if m.sample {
    pdf.artifact(place(center + horizon, rotate(-32deg, text(size: 80pt, weight: 700, fill: luma(244), "AMOSTRA"))))
  },
)

#show heading.where(level: 1): it => {
  set text(size: 17pt, weight: 600, tracking: -0.015em)
  block(above: 0pt, below: 2.2mm, it.body)
}
#show heading.where(level: 2): it => {
  set text(size: 11.5pt, weight: 600, tracking: -0.005em)
  block(above: 1.8mm, below: 1.6mm, it.body)
}

// ---- Maps ---------------------------------------------------------------------------------------

#let scale-bar(s, width) = box(
  fill: white.transparentize(12%),
  inset: (x: 3pt, top: 2pt, bottom: 2.5pt),
  radius: 2pt,
  stack(
    spacing: 1.6pt,
    text(size: 6pt, fill: ink2, tab(s.label)),
    box(width: s.fraction * width, height: 2.6pt, stroke: (bottom: 0.8pt + ink2, left: 0.8pt + ink2, right: 0.8pt + ink2)),
  ),
)

// A street name on the map, centred on its anchor, along its street, with a white halo.
#let street-label(l, width, height) = context {
  let body(stroke) = text(size: 6.4pt, weight: 500, fill: if stroke == none { ink2 } else { white }, stroke: stroke, l.name)
  let s = measure(body(none))
  let at = (dx: l.x * width - s.width / 2, dy: l.y * height - s.height / 2)
  place(top + left, ..at, rotate(l.angle * 1deg, body(2pt + white)))
  place(top + left, ..at, rotate(l.angle * 1deg, body(none)))
}

// The numbered discs (or plain dots past the numbering limit), set over the map. The figure's alt
// text speaks for the whole map, so all of this is an artifact for screen readers.
#let marker-layer(map, width, height, numbered) = pdf.artifact({
  for mk in map.markers {
    if numbered {
      let r = if mk.n >= 100 { 2.5mm } else { 2.15mm }
      if mk.moved {
        place(top + left, line(start: (mk.x * width, mk.y * height), end: (mk.lx * width, mk.ly * height), stroke: 0.5pt + ink3))
        place(top + left, dx: mk.x * width - 0.55mm, dy: mk.y * height - 0.55mm, circle(radius: 0.55mm, fill: ink))
      }
      place(
        top + left,
        dx: mk.lx * width - r,
        dy: mk.ly * height - r,
        circle(radius: r, fill: ink, stroke: 0.7pt + white, inset: 0pt)[
          #set align(center + horizon)
          #text(size: if mk.n >= 100 { 5.6pt } else { 6.4pt }, weight: 600, fill: white, tab(str(mk.n)))
        ],
      )
    } else {
      place(top + left, dx: mk.x * width - 0.9mm, dy: mk.y * height - 0.9mm, circle(radius: 0.9mm, fill: ink, stroke: 0.5pt + white))
    }
  }
})

#let area-map(map, width, alt) = {
  let height = width / map.aspect
  figure(
    alt: alt,
    box(width: width, height: height, clip: true, radius: 3pt, stroke: 0.5pt + hair, {
      image(map.svg, width: width, height: height, alt: alt)
      marker-layer(map, width, height, map.numbered)
      pdf.artifact(place(bottom + left, dx: 3mm, dy: -3mm, scale-bar(map.scale, width)))
    }),
  )
}

#let locator(e, width) = {
  let map = e.locator
  let height = width / map.aspect
  figure(
    alt: e.locatorAlt,
    box(width: width, height: height, clip: true, radius: 3pt, stroke: 0.5pt + hair, {
      image(map.svg, width: width, height: height, alt: e.locatorAlt)
      pdf.artifact({
        for l in map.labels { street-label(l, width, height) }
        place(top + left, dx: width / 2 - 2.3mm, dy: height / 2 - 2.3mm, circle(radius: 2.3mm, fill: orange, stroke: 1.3pt + white))
        place(bottom + left, dx: 2.5mm, dy: -2.5mm, scale-bar(map.scale, width))
      })
    }),
  )
}

// ---- One report ---------------------------------------------------------------------------------

#let fact(label, value) = (text(size: 7.5pt, fill: ink3, label), text(size: 8.5pt, value))

#let ficha(e) = block(breakable: false, width: 100%, above: 0pt, below: 0pt, {
  v(3mm)
  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 7pt,
    align: horizon,
    code-chip(e.id),
    text(size: 8pt, fill: ink3)[#e.category · #e.bairro],
    if e.registered != none { text(size: 8pt, fill: ink3, tab[Registrado em #e.registered]) },
  )
  [#heading(level: 2)[#text(fill: ink3, weight: 500, tab(str(e.n)))#h(0.5em)#e.title]#label("r-" + e.id)]
  if e.text != none { block(width: 136mm, below: 0pt, text(fill: ink2)[“#e.text”]) }
  v(3mm)

  // Where it is (the street map), what's known (facts), and the way to the full record (QR).
  let facts = (
    if e.address != none { fact("Endereço", e.address) },
    if e.reference != none { fact("Referência", e.reference) },
    if e.coords != none { fact("Coordenadas", mono(e.coords, size: 8pt)) },
    if e.street != none { fact("Via mais próxima", e.street) },
    if e.place != none { fact("Lugar", e.place) },
    fact("Confirmações", e.confirmations),
    if e.photosLine != none { fact("Fotos", e.photosLine) },
    fact("Página pública", link(e.url, e.urlLabel)),
    if e.osm != none { fact("No mapa", link(e.osm)[Abrir no OpenStreetMap]) },
  ).filter(x => x != none).flatten()
  let qr = if e.qr != none {
    stack(spacing: 2.5pt, image(e.qr, width: 17mm, alt: e.qrAlt), align(center, text(size: 6pt, fill: ink3)[Ver no celular]))
  }
  grid(
    columns: if e.locator != none { (74mm, 1fr, 17mm) } else { (1fr, 17mm) },
    column-gutter: 5mm,
    align: top,
    ..(
      if e.locator != none { locator(e, 74mm) },
      grid(columns: (23mm, 1fr), column-gutter: 2.5mm, row-gutter: 4.4pt, ..facts),
      qr,
    ).filter(x => x != none),
  )

  // Photos as small multiples: the same size whatever their number, the whole strip one glance.
  if e.photos.len() > 0 {
    v(3mm)
    grid(
      columns: (40mm,) * e.photos.len(),
      column-gutter: 2.5mm,
      ..e.photos.map(p => box(width: 40mm, height: 30mm, clip: true, radius: 2.5pt, image(p.file, width: 40mm, height: 30mm, fit: "cover", alt: p.alt))),
    )
  }
  v(4.2mm)
  line(length: 100%, stroke: 0.5pt + hair)
})

// ---- Page 1: what this is, and what is asked ----------------------------------------------------

#grid(
  columns: (1fr, auto),
  align: (left + bottom, right + bottom),
  wordmark(16pt),
  text(size: 7.5pt, fill: ink3, align(right)[Mapa independente de problemas urbanos \ #m.host]),
)
#v(3mm)
#line(length: 100%, stroke: 0.8pt + ink)
#v(6mm)
#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  text(size: 10.5pt, weight: 600, tracking: 0.04em)[RESUMO DIÁRIO Nº #m.number],
  text(size: 9.5pt, m.dateLine),
)
#v(4mm)
#text(fill: ink2)[À #m.addressee.to \ Com cópia: #m.addressee.cc.join(", ")]
#v(2mm)
#text[*Assunto:* #m.subject]
#if m.sample {
  v(4mm)
  block(stroke: 0.6pt + ink, inset: (x: 4mm, y: 3mm), radius: 3pt, text(size: 8.5pt)[*Amostra com dados fictícios.* Nenhum destes registros é real; esta página mostra como o resumo chega à Ouvidoria.])
}
#v(8mm)
#block(width: 128mm, text(size: 15pt, weight: 600, tracking: -0.012em, m.headline))
#v(2.5mm)
#block(width: 138mm, text(size: 10pt, fill: ink2, m.lede))
#v(7mm)
#grid(
  columns: (auto,) * m.stats.len(),
  column-gutter: 13mm,
  ..m.stats.map(s => stack(spacing: 3pt, text(size: 26pt, weight: 600, tracking: -0.02em, s.value), text(size: 8pt, fill: ink3, s.label))),
)
#v(8mm)

#context {
  let starts = d.summary.map(s => locate(label(s.key)).page())
  let last = counter(page).final().first()
  let pages(i) = {
    let a = starts.at(i)
    let b = if i + 1 < starts.len() { starts.at(i + 1) - 1 } else { last }
    if a == b { str(a) } else { str(a) + "–" + str(b) }
  }
  table(
    columns: (1fr, auto, auto, auto),
    column-gutter: 8mm,
    inset: (x: 0pt, y: 5.5pt),
    align: (left, right, left, right),
    table.header(..("Órgão", "Registros", "Números", "Páginas").map(h => text(size: 7.5pt, fill: ink3, h))),
    table.hline(stroke: 0.8pt + ink),
    ..d.summary.enumerate().map(((i, s)) => (
      link(label(s.key), text(weight: 500, s.agency)),
      tab(str(s.count)),
      tab(s.range),
      tab(pages(i)),
      table.hline(stroke: 0.5pt + hair),
    )).flatten(),
  )
}
#v(6mm)
#block(fill: wash, inset: (x: 5mm, y: 4.2mm), radius: 4pt, width: 100%)[
  #text(weight: 600)[Como responder] \
  #text(fill: ink2, m.answer)
]
#v(5mm)
#set text(size: 8pt, fill: ink3)
#m.clock \
#m.privacy \
#m.independent
#set text(size: 9.5pt, fill: ink)

// ---- Page 2: the city ---------------------------------------------------------------------------

#if d.overview != none {
  pagebreak()
  heading(level: 1)[Mapa dos registros]
  text(fill: ink3, m.overviewCaption)
  v(5mm)
  area-map(d.overview, W, "Mapa de " + m.sender.split(", ").last() + " com os bairros e os registros deste resumo")
  v(3mm)
  text(size: 7pt, fill: ink3, m.attribution)
}

// ---- One section per body -----------------------------------------------------------------------

#for s in d.sections {
  pagebreak()
  [#heading(level: 1, s.agency)#label(s.key)]
  text(fill: ink3, s.line)
  v(5mm)
  if s.map != none {
    area-map(s.map, W, "Mapa com os registros de " + s.agency + ", numerados como na lista abaixo")
    v(6mm)
  }
  table(
    columns: (8mm, 15mm, 1fr, 42mm, 25mm, 10mm, 9mm),
    column-gutter: 3mm,
    inset: (x: 0pt, y: 3.8pt),
    align: (right, left, left, left, left, right, right),
    table.header(..("Nº", "Código", "Tipo", "Bairro", "Registrado", "Conf.", "Pág.").map(h => text(size: 7pt, fill: ink3, h))),
    table.hline(stroke: 0.7pt + ink),
    ..s.entries.map(e => (
      tab(str(e.n)),
      link(label("r-" + e.id), mono(e.id, size: 7.8pt)),
      text(size: 8.5pt, e.category),
      text(size: 8.5pt, e.bairro),
      text(size: 8.5pt, tab(if e.registered != none { e.registered } else { "—" })),
      text(size: 8.5pt, tab(str(e.confirms))),
      text(size: 8.5pt, context tab(str(counter(page).at(label("r-" + e.id)).first()))),
      table.hline(stroke: 0.4pt + hair),
    )).flatten(),
  )
  v(4mm)
  for e in s.entries { ficha(e) }
}
