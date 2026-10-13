# What the receiving side needs: the Fala, Canoas digest PDF

Research brief, 2026-10-13.

Method: primary texts (FixMyStreet source and templates, Open311 spec, CGU wiki and portarias, planalto.gov.br, Canoas Ouvidoria 2019 report) were read directly (large pages were searched by keyword). Secondary and news sources are marked. [não verificado] means a snippet, a secondhand claim, or an inference.

## 1. How established platforms deliver reports to public bodies

**FixMyStreet (mySociety)**
- Email is the default delivery. Each report is its own email, sent every ~5 minutes by cron, only after the reporter confirms. Location decides the *body*; the chosen *category* decides the *contact address*. https://fixmystreet.org/customising/send_reports/ and https://fixmystreet.org/running/bodies_and_contacts/
- The default template has the subject `Problem Report: <title>`. Body fields: Report ID, name, e-mail ("None provided" if absent), phone, category, title, details, extra category fields, latitude, longitude, an OpenStreetMap link, the reverse-geocoded "closest address", and a link to the full report page. https://raw.githubusercontent.com/mysociety/fixmystreet/master/templates/email/default/submit.txt and .../submit.html
- Photos are not in the default mail. It says "This web page also contains a photo", with the image URL. The code can inline images in HTML mail. https://raw.githubusercontent.com/mysociety/fixmystreet/master/perllib/FixMyStreet/Queue/Item/Report.pm
- The email says whether the pin was placed on a map ("precise location") or the user only typed a place ("could not locate the problem on a map"). Same file as above.
- When one report goes to several bodies, the mail warns "please ignore it if you're not the correct council". The footer asks the recipient to suggest a better contact address for the category. Same file as above.
- Replies go to the reporter's inbox, not to the platform. https://osm.fixmystreet.com/about/information-for-councils
- mySociety says plain email forces staff to re-key reports. It recommends Open311, where the council returns its own reference (`external_id`), polled about every 15 minutes. https://fixmystreet.org/customising/integration/ and https://www.mysociety.org/2024/06/13/did-you-know-that-fixmystreet-reports-can-be-sent-directly-into-backend-systems/

**Open311 GeoReport v2**
- POST: `service_code` (required) plus a full location, given as `lat`+`long` (WGS84) *or* `address_string` *or* `address_id`. Optional: `description` (max 4,000 characters), `media_url` (a URL, with no parsing convention), contact fields, and `attribute[...]`.
- The record read back always lists `service_request_id`, `status`, `service_name`, `description`, `requested_datetime`, `address`, `lat`, `long` and `media_url`. `agency_responsible`, `expected_datetime` and `service_notice` are optional. https://webarchive.library.unt.edu/web/20170118233000mp_/http://wiki.open311.org/GeoReport_v2

**Colab (colab.re)**
- What the prefeitura sees in the "Monitor": a list with photo, street address, link to the social post, comments and likes, and the protocol number of each request. It is forwarded to the responsible órgão. 2014 source. https://www.baguete.com.br/noticias/curitiba-adota-colab-re-como-canal-oficial
- The current site advertises dashboards, real-time reports, a geolocated view, and APIs and webhooks. Export and per-secretaria routing rules are not documented publicly. [não verificado] https://www.colab.com.br/?p=13

**SeeClickFix (CivicPlus)**
- Routing and assignment by location and category, with internal comments hidden from residents. The reporter and the town get an email, and the issue goes to the department. Links to work orders, with notes, photos and cost recorded. https://www.civicplus.com/infographics/atm/from-report-to-resolution-visible-service-delivery-with-civicplus-seeclickfix-311-crm-and-asset-management/ and https://www.swampscottma.gov/node/24
- The vendor's help center and API (403) could not be read. Field list [não verificado].

**Fala.BR (CGU)**
- Form fields: Identificação, Destinatário, Descrição, Local do fato (UF / Cidade / Local) and Envolvidos.
- Attachments: up to **10 files, 30 MB total**. Accepted types are PDF, DOC, DOCX, TXT, XLS, XLSX, PNG, JPG, JPEG, MP3, MP4 and AVI. Other types can cause "Erro 400". CSV is not listed. https://wiki.cgu.gov.br/index.php?title=Fala.BR_-_M%C3%B3dulo_Ouvidoria
- The report text is limited to **7,000 characters**. https://ufu.br/sites/default/files/2026-06/tutorial-para-registro-de-manifestacao-na-plataforma-fala.br-versao-junho.2026.pdf

## 2. What field operations need

- No Brazilian municipal OS template for zeladoria turned up. [não verificado] What exists is indirect.
  - Aguaí's tapa-buraco contract has the OS "contendo a indicação dos trechos, metragem estimada e demais orientações técnicas". https://aguai.sp.gov.br/home/wp-content/uploads/2026/02/Termo-de-Referencia-Tapa-buraco.pdf
  - The Cityworks work-order fields are: address, location notes, geocode X/Y, district, priority, projected start date, requested by, supervisor, "submit to" and instructions. https://help.cityworks.com/Respond/5-0/Content/WorkOrder/WorkOrderDetailsPanelFields.htm
- What cities ask a resident for, which is what crews use to find the spot:
  - Rio 1746: "endereço completo com ponto de referência" and whether there is accident risk. https://carioca.rio/?p=77681
  - SP lighting: full address and reference point. https://prefeitura.sp.gov.br/web/spregula/w/iluminacao_publica/renovar/4603
  - A citizen guide lists address, cross streets, reference points, approximate dimensions and photos. https://digitei.com/?p=83427
  - Curitiba lighting wants the six-digit pole *plaqueta* plus the exact map point. This is search-snippet only, and the page returned 403. [não verificado] https://www.curitiba.pr.gov.br/conteudo/iluminacao-publica/3172
- Street address alone is weak. FixMyStreet always sends lat/long, a map link *and* the reverse-geocoded address, and it flags whether the pin was exact. I found no source saying a reverse-geocoded address replaces the reference point. Treat the ponto de referência as expected in Brazil.
- Navigation: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` and `.../maps/dir/?api=1&destination=<lat>,<lng>` open the Maps app on Android and iOS and a browser elsewhere. https://developers.google.com/maps/documentation/urls/guide No municipal precedent found for a QR code on an OS that opens navigation. [não verificado]

## 3. How ouvidorias process an incoming batch

- **Who may write.** "Usuário" is a pessoa física *or jurídica* (Lei 13.460 art. 2 I). The manifestação "conterá a identificação do requerente", but the demands "não inviabilizem" it (art. 10 §1), motives cannot be required (§2), and e-mail is a valid channel (§4). The requerente's identification is protected personal information (§7). Receipt cannot be refused (art. 11). https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm
- **Federal rules, by analogy only.** Decreto 9.492/2018 is federal. Canoas uses Decreto municipal 434/2019, whose identification clause I could not read. [não verificado] https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9492.htm
  - Certification of identity is demanded only if the answer exposes personal data (art. 15).
  - Insufficient information leads to a *pedido de complementação*, which suspends the deadline (art. 18 §§2–4). Silence leads to archiving (§5).
- **"Comunicação" vs manifestação.** A "comunicação de irregularidade" is an *unidentified* manifestação, handled as denúncia, with no conclusive answer. An anonymous denunciante gets no NUP or access code. An identified sender gets both. Portaria CGU 1.037/2021 art. 4: https://repositorio.cgu.gov.br/bitstream/1/78288/1/Portaria_1037_2021.pdf and the UFU tutorial above. The digest should therefore always be identified.
- **E-mail intake.** Portaria Normativa CGU 116/2024 (federal) says e-mailed manifestações "serão registradas na Plataforma Fala.BR pela unidade setorial" (art. 20), with "desmembramento adequado ... registros distintos para manifestações com tipologias, assuntos ou órgãos ... distintos" (art. 17 parágrafo único; art. 20 parágrafo único). Triage can "individualizar e agrupar" (art. 22 III). https://www.gov.br/mec/pt-br/canais_atendimento/ouvidoria/antiga/1256.PortariaCGU116_.pdf
- When the ouvidoria registers on a citizen's behalf, e-mail is optional. If given, the citizen is notified. The citizen consults with *Número de Protocolo + Código de Acesso*, which the clerk hands over. https://wiki.cgu.gov.br/index.php?title=Fala.BR_-_M%C3%B3dulo_Ouvidoria. Triage may also reclassify tipologia and assunto. https://ufob.edu.br/a-ufob/ouvidoria/fluxo_ouvidoria_2025.pdf
- **Canoas.** Fala.BR has been adopted since 2018 and carried 95% of accesses in 2019. Forwarding to the secretarias goes by memorando, averaging ~95 ofícios a month. Units took an average of 54.1 days against a 20-day internal target. The same report gives 1,050 as both a yearly and a "monthly average" total, which is ambiguous. https://canoas.rs.gov.br/relatorio-gestao-ouvidoria-cgm-2019-canoas
- **Preference for one PDF per manifestação or one consolidated file:** no guidance found. [não verificado] What the rules imply is that someone must separate items per assunto and per órgão. A consolidated file is workable if it comes apart cleanly.
- **Size.** No fixed prefeitura rule. canoas.rs.gov.br MX records point to Google Workspace (my `dig`). Workspace receives up to 50 MB (Enterprise Standard, after ~37% encoding overhead) and 500 attachments per message. The edition Canoas uses is unknown. https://knowledge.workspace.google.com/admin/gmail/gmail-receiving-limits-in-google-workspace
  - Other intake rules are stricter. Goiás ITCD takes 12 MB per e-mail and *disregards* zip/rar and cloud-link-only e-mails. https://goias.gov.br/economia/?p=32085
  - Fala.BR allows 30 MB total.
- **PDF/A and signatures.** No municipal-intake norm found that requires either for Canoas. One São Paulo CGM portaria (2020) requires searchable PDF/A, ≤50 MB per file and digital signature for its own intake. https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/normativa(1).pdf Lei 14.063 art. 5 §1 I allows a simple electronic signature for lower-impact interactions with no classified data, with each ente setting its own minimum. https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

## 4. Splitting by recipient

- FixMyStreet routes per body and category, one email per report, and tells the recipient how to redirect a misrouted one. See section 1.
- 156 systems route by subprefeitura and service (SP Itaquera: drain cleaning through 156, the subprefeitura desk or SAC). https://prefeitura.sp.gov.br/web/itaquera/w/zeladoria_urbana/80126 [search snippet, não verificado]
- In Brazilian ouvidorias, forwarding is per órgão (CGU 116 arts. 17, 22 V–VI). Canoas forwards per secretário by memorando.
- Inference: a section per responsible body, each starting on its own page and self-contained, lets the Ouvidoria cut and attach it to a memorando. No source tests this directly. [não verificado]

## 5. Precedents of citizen groups sending consolidated reports

- **Calçada Cilada** (Corrida Amiga, citizens' app reports compiled "e enviadas às autoridades competentes"): in 2015 it logged 291 reports in 41 municipalities and only three answered. Two of those asked for more information. https://www.gazetadopovo.com.br/vida-e-cidadania/futuro-das-cidades/campanha-usa-app-de-celular-para-denunciar-calcadas-ruins-em-cidades-brasileiras-2ab6m70nu7gu65vztmvib246y/ The file format is not documented.
- **Canoas:** in July 2025 the Comitê dos Seis Bairros delivered a letter with eight demands, including drainage. No periodic consolidated report exists in the record. https://www.brasildefato.com.br/2025/07/25/moradores-de-seis-bairros-atingidos-por-enchentes-cobram-acoes-da-prefeitura-de-canoas/
- Observatório Social reports are quadrimestral and cover procurement, not zeladoria. No precedent found of a periodic, per-body zeladoria digest from an association. IP Canoas (lighting) has no public channel that I found. [não verificado]

## Implications for the Fala digest PDF

1. **One self-contained block per report.** Each carries: Fala code (the unique id); category; the original text; date and time reported; bairro; street address (reverse-geocoded) plus resident-typed *ponto de referência*; latitude/longitude; a flag for exact pin versus approximate; a link to the public pin page; and the number of confirmations. This mirrors FixMyStreet's template, Open311's core fields and Rio/SP's required inputs. Sources: FMS submit.txt, GeoReport v2, carioca.rio 1746.
2. **Reverse-geocoded address AND coordinates AND a tappable map link.** Add a QR code and a link in the form `maps/dir/?api=1&destination=lat,lng` so a crew can navigate. Source: Google Maps URLs guide; FMS sends lat/long, OSM link and closest address together.
3. **Thumbnails embedded in the PDF, with full-size by link.** Moderated photos only. Roughly 1 to 2 photos per item at about 800 px JPEG. FMS's link-only photos mean the recipient needs a second step, and Calçada Cilada shows municipalities ask for more information when the report is thin.
4. **Group by responsible body, one section per body.** Each section starts on a new page with a header naming the secretaria, subprefeitura or concessionária, plus a count. Each report appears under exactly one body, with the routing rule stated in a footnote. This follows FMS body/category routing, CGU 116 art. 17 par. único on per-órgão records, and Canoas's per-secretário memorandos.
5. **Make every item separable.** Keep each block short (≤ ~7,000 characters of text). Use stable anchors and bookmarks per body and per item, and number items sequentially. Offer an optional XLSX with one row per item for the Ouvidoria's spreadsheet; Fala.BR accepts XLSX but not CSV. Sources: Fala.BR wiki limits; the Canoas spreadsheet fact; CGU 116 art. 22 III.
6. **Size.** Aim for a total of ≤ 8–10 MB per e-mail, as one searchable PDF with text and embedded fonts. Split into numbered parts "1/3" if larger. Never use zip or a cloud-link-only mail, and never send an image-only PDF. Sources: Workspace 50 MB receiving limit after 37% encoding; Fala.BR 30 MB; Goiás ITCD rules. PDF/A and ICP-Brasil signatures are not required by anything found for Canoas. They are optional extras (SP CGM, Lei 14.063 art. 5 §1 I).
7. **The association identifies itself, in its own name.** Give the full legal name, contact e-mail that is read daily, and a line saying the digest is sent by the association in its own name: it is not an official channel and does not speak for the residents. Do not put residents' names or contact data in the PDF. Sources: Lei 13.460 art. 2 I, art. 10 §§1 and 7; Decreto 9.492 art. 24; UFU tutorial on anonymous submissions.
8. **Keep the sender identified so the Ouvidoria can record and answer.** Frame the content as reclamação/solicitação, never as an anonymous denúncia, and give a reply-to e-mail the association actually monitors. Sources: Portaria CGU 1.037 art. 4; Fala.BR wiki on ouvidoria-registered manifestações.
9. **Ask for protocol numbers back, explicitly, on page 1.** "Responda este e-mail com o número de protocolo (NUP) e o código de acesso, ou o número do memorando/ofício." Allow one protocol for the whole batch or one per item, and state which item codes each covers. Mirrors FMS `external_id` and Open311 `service_request_id`; the CGU wiki says protocol plus access code are what the citizen holds.
10. **Pre-empt the pedido de complementação.** Include the minimum an ouvidoria needs to avoid it: where, what, when, and a photo, in plain language. Include a named person or mailbox that answers fast. A complementação suspends the deadline and silence archives (Decreto 9.492 art. 18 §§2–5, federal; Canoas's equivalent is [não verificado]). Calçada Cilada answers were requests for more information.
11. **Page 1 as a cover.** It carries the date and time of the digest, the totals, a table of bodies with counts and item codes, and a short line citing the 30-day deadline (Lei 13.460 art. 16). The Ouvidoria's units averaged 54.1 days to answer forwarded ofícios in 2019, so the cover should make sorting and forwarding by body quick.
12. **Never lose the e-mail body.** Repeat the summary table in the mail text. It goes to the Ouvidoria and, in copy, the CAC. The PDF is the document that gets attached to a memorando. Sources: FMS plain-text-first design; Goiás rule that the body summarizes the request and the PDF is the attachment.
