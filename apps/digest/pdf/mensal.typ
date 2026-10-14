// The monthly report per body, laid out. Words and numbers come from data.json
// (apps/digest/src/pdf/monthly.ts); this file only decides where they go.
//
// Page 1: what this is, every body side by side, and how it's counted. Then one page per body, so a
// secretaria's page can be forwarded as it is. Running head names the body; "Página X de Y" in the foot.

#let d = json("data.json")
#let m = d.meta

// DESIGN.md's neutral scale for print, as in the resumo. No orange: nothing here is a place or a clock.
#let ink = rgb("#0E0F10")
#let ink2 = rgb("#393B40")
#let ink3 = rgb("#5F626A")
#let hair = rgb("#E4E4E6")
#let rule = rgb("#C9CACE")
#let wash = rgb("#F5F5F6")
#let orange = rgb("#F05A1A")

#set document(title: m.title, author: m.sender, keywords: ("relatório mensal", "órgãos públicos", "problemas urbanos"))
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

#let body-at(loc) = {
  let on = query(heading.where(level: 1)).filter(h => h.location().page() == loc.page())
  if on.len() > 0 { return on.first().body }
  let before = query(selector(heading.where(level: 1)).before(loc))
  if before.len() > 0 { before.last().body } else { none }
}

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
        [#wordmark(8.5pt)#h(6pt)Relatório mensal · #m.label#if m.sample [ · #text(fill: ink, weight: 500)[AMOSTRA COM DADOS FICTÍCIOS]]],
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
      [#m.host/relatorios · registros públicos, com fotos e histórico],
      tab[Página #counter(page).display() de #counter(page).final().first()],
    )
  },
  background: if m.sample {
    pdf.artifact(place(center + horizon, rotate(-32deg, text(size: 80pt, weight: 700, fill: luma(244), "AMOSTRA"))))
  },
)

#show heading.where(level: 1): it => {
  set text(size: 17pt, weight: 600, tracking: -0.015em)
  block(above: 0pt, below: 4mm, it.body)
}
#show heading.where(level: 2): it => {
  set text(size: 11.5pt, weight: 600, tracking: -0.005em)
  block(above: 7mm, below: 2.5mm, it.body)
}

#let head(h) = text(size: 7.5pt, fill: ink3, h)

// ---- Page 1 ----------------------------------------------------------------------------------------

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
  text(size: 10.5pt, weight: 600, tracking: 0.04em, upper[Relatório mensal · #m.label]),
  text(size: 9.5pt, m.generated),
)
#if m.sample {
  v(4mm)
  block(stroke: 0.6pt + ink, inset: (x: 4mm, y: 3mm), radius: 3pt, text(size: 8.5pt)[*Amostra com dados fictícios.* Nenhum destes números é real; esta página mostra como o relatório é publicado.])
}
#v(8mm)
#block(width: 138mm, text(size: 15pt, weight: 600, tracking: -0.012em, m.headline))
#v(2.5mm)
#block(width: 142mm, text(size: 10pt, fill: ink2, m.lede))
#v(7mm)
#grid(
  columns: (auto,) * m.stats.len(),
  column-gutter: 12mm,
  ..m.stats.map(s => stack(spacing: 3pt, text(size: 26pt, weight: 600, tracking: -0.02em, s.value), text(size: 8pt, fill: ink3, s.label))),
)
#v(8mm)

#context {
  let page-of(key) = str(locate(label(key)).page())
  table(
    columns: (1fr, auto, auto, auto, auto, auto, auto),
    column-gutter: 5.5mm,
    inset: (x: 0pt, y: 5.5pt),
    align: (left, right, right, right, right, right, right),
    table.header(
      head[Órgão], head[Enviados], head[Resolvidos], head[Mediana \ (dias)], head[Em aberto], head[Há mais de \ #m.deadline dias], head[Pág.],
    ),
    table.hline(stroke: 0.8pt + ink),
    ..d.summary.map(s => (
      link(label(s.key), text(weight: 500, s.agency)),
      tab(s.sent), tab(s.resolved), tab(s.median), tab(s.open), tab(s.over), tab(page-of(s.key)),
      table.hline(stroke: 0.5pt + hair),
    )).flatten(),
    text(weight: 600)[Total], tab(text(weight: 600, d.totals.sent)), tab(text(weight: 600, d.totals.resolved)),
    tab(text(weight: 600, d.totals.median)), tab(text(weight: 600, d.totals.open)), tab(text(weight: 600, d.totals.over)), [],
  )
}
#v(6mm)
#block(fill: wash, inset: (x: 5mm, y: 4.2mm), radius: 4pt, width: 100%)[
  #text(weight: 600)[Como contamos]
  #v(1mm)
  #set text(size: 8.5pt, fill: ink2)
  #stack(spacing: 2.2mm, ..m.method.map(l => block(l)))
]

// ---- One page per body --------------------------------------------------------------------------

#for b in d.bodies {
  pagebreak()
  [#heading(level: 1, b.agency)#label(b.key)]
  grid(
    columns: (88mm, 1fr),
    row-gutter: 6pt,
    column-gutter: 4mm,
    ..b.facts.map(f => (text(fill: ink2, f.label), tab(text(weight: 500, f.value)))).flatten(),
  )
  if b.bairros.len() > 0 {
    heading(level: 2, b.bairrosTitle)
    table(
      columns: (1fr, auto, auto),
      column-gutter: 8mm,
      inset: (x: 0pt, y: 5pt),
      align: (left, right, right),
      table.header(head[Bairro], head[Em aberto], head[Há mais de #m.deadline dias]),
      table.hline(stroke: 0.8pt + ink),
      ..b.bairros.map(x => (x.bairro, tab(x.open), tab(x.over), table.hline(stroke: 0.5pt + hair))).flatten(),
    )
  }
  if b.oldest.len() > 0 {
    heading(level: 2, b.oldestTitle)
    table(
      columns: (auto, 1fr, auto, auto),
      column-gutter: 6mm,
      inset: (x: 0pt, y: 5pt),
      align: (left, left, left, right),
      table.header(head[Código], head[Tipo], head[Bairro], head[Em aberto]),
      table.hline(stroke: 0.8pt + ink),
      ..b.oldest.map(o => (
        link(o.url, mono(o.id, size: 8pt)), o.category, o.bairro, tab(o.days),
        table.hline(stroke: 0.5pt + hair),
      )).flatten(),
    )
    v(2mm)
    text(size: 8pt, fill: ink3)[Cada código abre a página pública do registro, com as fotos, o lugar e o histórico.]
  }
}
