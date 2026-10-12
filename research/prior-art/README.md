# FalaCanoas: Prior-Art Brief

Rewritten and fact-checked 2026-10-12 (replaces the 2026-10-11 draft). Every claim below was re-checked; what could not be verified was cut. See the Verification log at the end.

Evidence labels: **(P)** = read on the primary or official page/paper. **(S)** = secondary source or search-result excerpt only (primary page blocked or not opened). **(Proposal)** = our design inference, not a finding.

---

## TL;DR

1. **Responsiveness is the retention lever, but the evidence is associational.** On UK FixMyStreet (2007-2013; 399,364 reports by 154,957 people), people whose first report was marked fixed within 35 days filed a second report 18.2% of the time versus 11.6% otherwise (model estimates). That gap is the "57% increase". "Success" means marked fixed by the council or another user, not merely answered. (Sjoberg, Mellon & Peixoto, Public Administration Review 2017.)
2. **Clock-start precedent.** FixMyStreet emails the council by default (a job runs every 5 minutes) and the public report page states how long after creation it was sent. Open311 is the optional upgrade: it returns the council's own reference and, with polling, pushes status changes back. Stamp "enviado à Prefeitura em ..." on every pin and start the public clock at that timestamp.
3. **Canoas's intake channel is the Ouvidoria Geral (Controladoria-Geral do Município) on Fala.BR** (adhered 2018; 95% of access in 2019). The legal reply deadline is 30 days plus one 30-day extension (Lei 13.460/2017 art. 16; Decreto Municipal 434/2019). The Ouvidoria's 2019 report puts the average reply across units at 54.1 days. Confirm with the CGM whether a FalaCanoas digest becomes a protocolled manifestação. If not, the clock is ours, not a legal deadline, and must be labelled that way.
4. **"Fixed" is mostly self-declared.** On UK FixMyStreet, 79.9% of fixes were marked by the reporter, 11.0% by the council, 9.0% by other users. Council-marked fixes averaged 26 days, reporter-marked 57, other users 109. Show who declared "resolvido" and let neighbours contest it.
5. **Reclame Aqui's model is four complainant-judged metrics**: response rate, resolution rate, average rating (0-10), and "would do business again". The top tier (RA1000) needs at least 90% response, at least 90% resolution and an average of at least 7.0 (S; official help pages blocked). FixMyStreet Pro already lets councils post statuses and public replies, so official replies are not novel. A public per-secretaria timing scoreboard with resident-judged resolution is.
6. **Duplicates are handled the same way everywhere**: nudge at submit time, a lightweight "me too", staff merge. FixMyStreet checks the same category within a small radius and offers "subscribe". SeeClickFix offers follow/vote. Colab has "Apoiar". Nobody auto-merges.
7. **Inequality is documented and has no proven fix.** Brussels (30,041 reports), UK (FixMyStreet.com) and NYC 311 all show under-reporting from poorer, more diverse areas. Outreach is recommended in the literature, but I found no evaluated mitigation. Our first persona (engaged neighbour in bairro groups) will reproduce the bias, so measure pins and sign-ups per 1,000 residents by bairro from day one.
8. **Colab is the Brazilian incumbent, sold to prefeituras** (64 cities in 2015, 130+ in 2017; now claims 1M+ citizens and 80%+ of demands resolved, self-reported). Porto Alegre adopted it in 2015. I found no evidence of Colab in Canoas. Canoas did launch its own top-down "Ágora em Rede" in 2014.
9. **Government silence is the failure mode, and voice without "teeth" rarely moves agencies** (Peixoto & Fox). The Canberra "Fix My Street" under inquiry is the ACT Government's own tool, not mySociety's, so it is not a FixMyStreet failure. Achados e Pedidos (Transparência Brasil/Abraji) shut down on 31 Jan 2026 after nine years, so plan funding and an archive path.
10. **Landing page**: steal live counters and recent-item cards (FixMyStreet.com), a funding/independence statement (mySociety, Meu Rio), and a WhatsApp sign-up path (Meu Rio). There is no credible waitlist-conversion benchmark, so measure our own. FixMyStreet, Decidim and Consul are all AGPL-3.0; forking FixMyStreet means publishing our changes.

---

## 1. Answers to the open questions

### (a) How FixMyStreet delivers reports and shows "sent" and "fixed" (maps to the clock-start decision)

**Delivery (P)**
- Default send method is email. The send method can be set per body and per category (e.g. potholes via Open311, streetlights via email).
- A `send-reports` task runs every 5 minutes by default. The admin shows a "when sent" date once it succeeds.
- "The public view of the report shows this: it says how long after creation the report was sent."
- Integration levels documented by mySociety: 0 = email; 1 = Open311 injection into the council back-end (the council's reference is stored as `external_id`; the FixMyStreet ID is passed as `attribute[fixmystreet_id]`); 2 = back-end status changes propagate back (FixMyStreet polls, e.g. "changed in the last 15 minutes?", and posts public updates such as "Fixed by ... council road crew"); 3 = problems created in the back-end also appear on FixMyStreet.
- Where the council has no Open311 endpoint, mySociety runs adapter proxies (open311-adapter on GitHub).
- Sources: https://fixmystreet.org/customising/send_reports/ and https://github.com/mysociety/fixmystreet/blob/master/docs/customising/integration.md

**When a report becomes "Open"** (S): automatically once the reporter has verified their email (SocietyWorks, 2022). So FixMyStreet's clock effectively starts at confirmation plus send.

**Statuses and who sets them (P/S)**
- FixMyStreet Pro statuses: Open, Action scheduled, For triage, In progress, Investigating, Planned, Closed, Duplicate, Internal referral, Not responsible, No further action, Fixed. Councils set them; citizens only see them.
- mySociety's "golden rule": do not mark Fixed until the problem is actually resolved, and attach an explanatory response template to every closure status.
- Source: https://www.societyworks.org/2022/07/20/how-to-increase-transparency-with-fixmystreets-report-statuses/
- On the public UK site, users can also mark a report fixed (see (c)). The reporter gets an automatic follow-up email at 28 days if not fixed (Sjoberg et al., data 2007-2013).

**Open311 GeoReport v2 (P)**: a service request has only two statuses, `open` and `closed`. It says nothing about who may close. Duplicates appear only as a `status_notes` example. Source: https://wiki.open311.org/GeoReport_v2/

**What this means for the clock (Proposal)**
- Show two timestamps per pin: "criado" and "enviado". Run the scoreboard from "enviado".
- For a daily digest, the clock starts at the digest send, not at pin creation. Say so on the pin.
- Store delivery evidence (message ID, Fala.BR protocol if any). FixMyStreet relies on email delivery and cannot prove receipt either.
- Open311 is not worth building until a prefeitura asks for it. Email/digest plus an optional verified-account reply is the FixMyStreet "level 0" model.

### Canoas context that changes the clock design

- **Ouvidoria Geral do Município sits inside the Controladoria-Geral do Município (CGM).** Its 2019 management report (P) says it handled 1,050 contacts (in person, e-Ouv, SIC, phone). The most-complained units were Saúde 185, Obras 92 and Serviços Urbanos 86. Fala.BR (CGU), joined by Termo de Adesão in 2018, accounted for 95% of accesses.
- The report cites Lei 13.460/2017 art. 16 (reply within 30 days, extendable once by 30) and Decreto Municipal 434/2019. It states the average reply time across units was **54.10 days** and that most units exceeded the legal period. It describes the Ouvidoria as a **"second instance"**, used after the primary service channels.
- The report has internal inconsistencies (e.g. "10 (cinco) unidades"; 1,050 appears as both annual total and monthly average), so treat its numbers as indicative. It is from 2019; I found no 2024-25 equivalent. The sibling brief `../canoas/README.md` says no annual Ouvidoria report was found; this one exists: https://canoas.rs.gov.br/relatorio-gestao-ouvidoria-cgm-2019-canoas
- **Fala.BR anonymity (S)**: only a denúncia can be filed without identification ("Continuar sem me identificar"), and then there is no protocol number and no reply. Other manifestation types need identification (gov.br login). A FalaCanoas digest would therefore need an identified submitter to get a protocol and a legal deadline. Whether the CGM would accept an organisation's bulk digest is an open question for them.
- **Volume check (Proposal)**: the 2019 intake was about 1,050 contacts (the report also calls 1,050 a monthly average, so the true annual figure is unclear). Either way it is small enough that a bairro-wide digest could rival it, so coordinate with the CGM before sending and rate-limit.

### (b) Reclame Aqui: reputation score and verified accounts

**Score (S; official help pages returned 403, so figures come from several Brazilian business sources)**
- Reputation uses four metrics: índice de resposta (share of complaints answered), média das avaliações (0-10, given by the complainant), índice de solução (share the consumer considered solved), and índice de novos negócios ("voltaria a fazer negócio?", counting only finalised and evaluated complaints).
- Tiers: RA1000, Ótimo, Bom, Regular, Ruim, Não Recomendada. I did not find the weights or the cut-offs for any tier except RA1000.
- RA1000: response at least 90%, resolution at least 90%, average rating at least 7.0 on a 0-10 scale. Two sources add at least 50 evaluations in six months; one adds a new-business index above 70%.
- The consumer, not the company, closes the loop by marking solved and rating. Silence counts against the company ("quando a empresa não se posiciona, transmite descaso e perde credibilidade").
- Sources: https://blog.inter.co/inter-conquista-selo-ra100/ ; https://olist.com/blog/gestao-empresarial/pos-venda/como-funciona-o-reclame-aqui ; https://www.mlabs.com.br/?p=622663

**Verified company accounts (S)**
- Companies register to answer complaints. The "RA Verificada" seal is granted after audits of cadastral regularity (CNPJ, razão social, nome fantasia), working communication channels and financial health (mLabs). Another source adds confirmation of the identity of a partner and a registered website. Free versus paid tiers: not stated in anything I could read.

**Scale (P)**: over 28 million registered consumers, 750,000 registered companies, about 46,000 complaints a day (Meio & Mensagem, 27 Nov 2025). The draft's "26.5M" had no source.
https://www.meioemensagem.com.br/marketing/aos-25-anos-reclame-aqui-quer-ampliar-atuacao-internacional

**What to take (Proposal)**
- Keep response and resolution separate, and let the reporter (plus confirming neighbours) judge resolution, not the secretaria.
- Require a minimum sample (e.g. n pins in a rolling window) before ranking a secretaria or bairro. Use medians, because a mean of 54 days hides skew.
- Do not publish a composite 0-1000 score at launch. Show "dias em aberto (mediana)", "% respondidas", "% resolvidas segundo moradores".
- Verified secretaria account: an official @canoas.rs.gov.br address plus written authorisation from the Prefeitura. This is our design, not Reclame Aqui's documented process.

### (c) Duplicates, "me too", and who can mark fixed

| | Duplicate prevention | "Me too" | Who marks fixed / closed |
|---|---|---|---|
| **FixMyStreet** | Shows nearby reports before you type (2012 design note). 2019 trial on Bath & NE Somerset's FixMyStreet Pro: at submit time, checks open reports in the same category within a small radius and offers to view them. No effectiveness numbers published. | "Subscribe" to the existing report to follow updates. | Council sets statuses (incl. Duplicate, Fixed). On the public UK site the reporter and other users could also mark fixed: 79.9% reporter, 11.0% council, 9.0% others in 2007-2013 data. |
| **SeeClickFix** (S) | Guidance to open the existing request and Follow or comment. | Follow and vote. | Per developer-docs excerpt (page returned 403): any authenticated user can switch Open/Closed; only government employees can set Acknowledged; closed issues archive after 7 days. Public threads complain of cities closing before fixing (e.g. "Hartford311 closing issues that are not fixed"). |
| **Colab** (S) | No public detail found. | "Apoiar" button on other citizens' demands in the feed. | The responsible municipal department answers; no public detail on duplicate handling or who closes. |
| **Open311 v2** | `status_notes: "Duplicate request."` is only an example. | None. | Unspecified; only `open`/`closed`. |

Sources: https://www.mysociety.org/2019/04/24/stop-right-there-thats-already-been-reported/ ; https://www.mysociety.org/2012/08/16/mysociety-design-tips-avoid-duplication/ ; Sjoberg et al. (see log); SeeClickFix excerpt via search; https://www.baguete.com.br/noticias/porto-alegre-adere-ao-colab-re

**Proposal for FalaCanoas**
- At submit time, show open pins of the same category nearby and offer "Também vejo isso". Count one per verified phone.
- Moderators merge duplicates and keep the earliest "enviado" timestamp.
- "Resolvido" shows its source: "Prefeitura respondeu: resolvido", "autor confirmou", or "N vizinhos confirmaram". Residents can contest within a window. Never auto-close.
- Unconfirmed closure is the recurring complaint on public SeeClickFix threads (e.g. "Hartford311 closing issues that are not fixed"). It would destroy the scoreboard's credibility, so the source-of-resolution rule above is not optional.

### (d) Homepage and launch-page examples to study

Snapshot 2026-10-12, read through a page summariser (numbers drift). None of these is a waitlist page; I found no credible civic waitlist page to cite. Reclame Aqui, WhatDoTheyKnow and Querido Diário could not be read (403 / script-rendered).

| # | URL | What to steal | Caveat |
|---|---|---|---|
| 1 | https://www.fixmystreet.com/ | Postcode/street box as the only primary action; live counters ("22,713 reports in past week", "50,192 fixed in past month", "16,394,379 updates on reports"); five "recent reports" cards with photo, place and time (a map-preview substitute); "start with a photo"; charity line and open-source link. | Counters mix activity and outcomes: copy that, but define "fixed" strictly. |
| 2 | https://www.mysociety.org/ | Independence block: "registered charity in England and Wales (1076346)", and disclosure that profits of its wholly owned commercial subsidiary SocietyWorks fund the charity; donate CTA. | No hard impact numbers on the homepage. |
| 3 | https://www.meurio.org.br/ | Single-step WhatsApp sign-up ("receber nossos alertas de mobilização"); member counter ("mais de 300 mil pessoas"); explicit funding rule: "não aceitamos dinheiro de governos, partidos, empresas ou bancos". | Issue-based, not bairro-based. Only claim a rule like that if it is true for us. |
| 4 | https://www.colab.com.br/sou-cidadao (colab.re now redirects here) | Outcome counters up front ("1+ million citizens", "80%+ of demands resolved", "995 thousand participations"); three-step "foto, descreva, envie" pitch. | Self-reported and government-facing ("todos os serviços da prefeitura"). Do not copy an unaudited resolution rate. |
| 5 | https://www.boston.gov/innovation-and-technology/cityscore | Published targets and a plain scoring rule (below 1 = under target, above 1 = above); explicit update cadence (daily, weekly Monday, monthly 1st). Example targets: 80% of 311 potholes repaired within one business day; 311 calls answered in 30 seconds 95% of the time. | Internal management tool for the Mayor, not a citizen-facing scoreboard. |
| 6 | https://www.achadosepedidos.org.br/ | Counters ("mais de 350 mil" requests and responses processed), named operators (Transparência Brasil, Abraji), and a data-driven accountability line about legal-deadline compliance. | Deactivated 31 Jan 2026 ("Missão Cumprida"). A reminder to plan funding, an archive and a sunset. |

**Steal list for the first-job-is-sign-ups-by-bairro page (Proposal)**
- Real counters only: sign-ups per bairro, shown from the first one, with a visible "as of" date. No fake FOMO.
- A WhatsApp button next to email, because the first persona already lives in bairro groups (Meu Rio pattern).
- A "who funds us / who runs us / not the Prefeitura, not a party" block (mySociety, Meu Rio pattern).
- A sourced one-line statistic with the link: e.g. the 2019 Ouvidoria reply average and the 30+30-day rule, once confirmed with the CGM.
- A "preview of the scoreboard" with labelled placeholder data, so the promise is concrete. (Our design; none of the six above does exactly this.)

### (e) Participation inequality: evidence and mitigations

**Evidence**
- **Brussels** (P): Pak, Chua & Vande Moere, "FixMyStreet Brussels: Socio-Demographic Inequality in Crowdsourced Civic Participation", Journal of Urban Technology 24(2), 2017, pp. 65-87. 30,041 reports since 2013 compared with district sociodemographic data and geotagged Twitter. "Statistical analysis revealed several significant differences between the districts that suggested that crowdsourced civic participation platforms tend to marginalize low-income and ethnically diverse communities." I could not read the full text, so I have no district-level effect sizes. https://arxiv.org/abs/1708.02274
- **UK FixMyStreet.com** (P, abstract): Matthews, Parsons, Nyanzu & Rae, "Dog fouling and potholes: understanding the role of coproducing 'citizen sensors' in local governance", Local Government Studies, 2022. "Service requests follow a parabolic relationship between neighbourhood deprivation levels and reporting, but ignoring the contributions of 'superusers' there is a more linear relationship, with more reports in less-deprived areas." Reports also rise near significant infrastructure (transport, schools). A trade-press summary (S) adds that deprived areas report more dog fouling, litter and fly-tipping while less-deprived areas report more road defects. https://dspace.stir.ac.uk/handle/1893/34613
- **NYC 311** (P): Kontokosta, Hong & Korsberg, "Equity in 311 Reporting". Over 20 million requests analysed. Under-reporting neighbourhoods had more minority residents, higher unemployment and more limited-English speakers; over-reporting ones had higher rents, incomes and education. The authors recommend "directed outreach and education" in under-reporting areas. https://arxiv.org/html/1710.02452
- **SeeClickFix** (P, abstract only): Yong et al. (2019) study the Capital District of New York State against neighbourhood demographics. The abstract has no "40% less" figure and does not mention Albany; the draft's number was removed.
- **Street Bump** (S): widely cited case of Boston's pothole app over-recording wealthier areas because of smartphone ownership.

**Mitigations: what exists, and how strong the evidence is**
- Directed outreach to under-reporting areas: recommended by the NYC authors; I found no evaluation of its effect.
- Paid/official ambassadors: San Francisco's Community Ambassadors Program reports hazards to 311 and city departments while serving low-income, non-English-speaking, homeless and older residents (https://www.sf.gov/information--community-ambassadors-program). A program exists; I found no impact evaluation.
- Offline channels and WhatsApp: no evaluated evidence found for civic reporting.
- Responsiveness itself: fixes raise repeat reporting (Sjoberg), but that does not show it closes the gap between areas.
- ICT "voice" without "teeth": Peixoto & Fox reviewed 23 ICT platforms and found most had raised agencies' capacity to respond but "have yet to influence their willingness to do so". https://bulletin.ids.ac.uk/index.php/idsbo/article/download/34/html?inline=1

**Honest conclusion**: there is no proven mitigation to import. Treat each of the following as a hypothesis to measure (Proposal):
1. Track sign-ups and pins per 1,000 residents by bairro from day one and publish them next to the scoreboard.
2. Never read a bairro's low pin count as "fewer problems", and never rank bairros by raw pins.
3. Let a trusted person (líder comunitário, associação de moradores) post on behalf of neighbours by WhatsApp or phone, with the bairro shown and the poster's pseudonym visible. Pilot in one or two under-represented bairros and compare.
4. Keep the report form to a photo (optional), a category and one sentence, so low-end phones and low literacy are not the barrier.

---

## 2. Product facts (verified only)

### FixMyStreet / FixMyStreet Platform (mySociety, UK)
- Licence: AGPL v3 or later. The `LICENSE.txt` in mysociety/fixmystreet says the software is distributed "under the terms of the GNU Affero General Public License ... either version 3 of the License, or (at your option) any later version". (GitHub's licence field reads "NOASSERTION" because of the custom preamble.) Language: Perl.
- Delivery, statuses, duplicates: see section 1(a) and 1(c).
- Scale on its homepage today: 22,713 reports in the past week; 50,192 fixed in the past month (P, snapshot).
- Known limits: UK data show 39.9% of reports were ever marked fixed in 2007-2013 (159,539 of 399,364). Mean time to "fixed" was 66 days. Fix rate varied by category (streetlights about 50%, dog fouling about 20%). That is dated, and councils have since integrated more.

### SeeClickFix (CivicPlus, USA)
- Commercial SaaS (https://www.civicplus.com/seeclickfix-311-crm/). No self-hosting. Duplicate and closure behaviour: see 1(c). Participation-bias research: see 1(e).

### Colab (Brazil)
- Sold to prefeituras (B2G). Claims over time: 64 cities and 100k+ users and 15,000+ reports (May 2015, Baguete); 130+ prefeituras and 150k+ users (May 2017, Mercado & Consumo via search); 1M+ citizens and 80%+ of demands resolved (colab.com.br, Oct 2026).
- Porto Alegre adopted it 13 May 2015: a municipal team monitors a dashboard; demands are "forwarded to the responsible agency".
- Canoas: no evidence found in two Colab-and-Canoas searches (absence of results, not proof). Cities seen in RS: Porto Alegre, and Pelotas and Ibirapuitã in secondary results.
- The draft's "70+ municipalities, mostly Pernambuco/SP/RJ" had no support and was removed.

### Fala.BR (CGU)
- Federal ombudsman platform, also the system the Canoas Ouvidoria uses. Anonymity rules: see "Canoas context". The draft's other claims (CPF requirement, April 2026 AI classification, 30-day escalation) were not verified and were cut.

### Fogo Cruzado (Rio, Recife, other metro areas)
- Inputs: the app, WhatsApp, Twitter, Facebook, plus press and police channels (IJNet, 22 Feb 2021). The team cross-checks "with scripts and filters" and discards information that is "incomplete, repeated or has not been confirmed". On WhatsApp they "only deal with sources with which we already established a trusting relationship".
- In 2020 a team member said verifying everything is unattainable and that the product has no "scientific methodology"; the app offers filters by source type (official, press, app) (Brasil de Fato, 1 Feb 2020).
- App use: you can browse the map without registering; registered users can add or confirm incidents (Olhar Digital, 2021).
- **Not supported**: "uses real names", "volunteer verification", and "250,000 downloads". No source states any of them. One trade summary describes the app as collecting anonymous reports, but the articles I opened do not specify either way.
- Lesson (Proposal): a tiered model (open reports, plus a trusted set of known sources, plus staff cross-check) is the closest precedent for guest pins held for review and phone-verified posters.

### Onde Fui Roubado (Brazil)
- Anonymous reporting by victims on a map; started in Salvador in 2013 by UFBA students (Catraca Livre, Aug 2013, updated 2020: "A população denuncia de forma anônima ..."). Early press (2013-14, via search excerpts, not re-opened) cites roughly 400 cities and 17,000 reports. **"980 municipalities" has no source.**
- No government follow-up channel. A map without a delivery path produces statistics, not accountability.

### Decidim and Consul
- Both AGPL-3.0 (GitHub licence field: decidim/decidim and consuldemocracy/consuldemocracy). Participatory-process tools (proposals, consultations), not issue-reporting maps. I did not evaluate them further.

### Ouvidorias in general
- Accountability Research Center page: ouvidorias "can only make suggestions or recommendations", sit as subdivisions of their own institutions, have "no mechanism to force them to take any action", and risk being "window-dressing institutions". https://accountabilityresearch.org/public-ouvidorias-in-brazil-from-accounting-to-multifaceted-accountability/
- Consistent with the Canoas Ouvidoria's own "second instance" description and 54.1-day average. Implication: FalaCanoas should be positioned as complementary to the Ouvidoria and not rely on it to enforce anything.

---

## 3. Lessons for FalaCanoas

### DO
1. **Stamp every pin with "criado" and "enviado" (time, channel, protocol if any)** and start the public clock at "enviado". (FixMyStreet shows time-to-send publicly.)
2. **Show the source of every "resolvido"** (Prefeitura, autor, vizinhos) and let residents contest it. Mark-fixed provenance is the main data-quality risk (79.9% of UK fixes were reporter-declared).
3. **Use medians, minimum sample sizes, and a rolling window** on the scoreboard (RA1000 reportedly needs 50+ evaluations in six months; Canoas's 54.1-day mean across units hides skew). Publish the targets and the update cadence (CityScore).
4. **Reference the 30+30-day rule (Lei 13.460/2017 art. 16) only as a labelled benchmark** until the CGM confirms the digest creates a protocolled manifestação.
5. **Make the scoreboard work with zero Prefeitura cooperation.** The digest is unilateral and the verified account is an opt-in extra. Without teeth, voice rarely changes agency willingness (Peixoto & Fox). Teeth here means public visibility, the press, and the Câmara de Vereadores.
6. **Ask the CGM first**: how they would want a digest (one email per day? Fala.BR entries? a named contact?), and how it would count against their 2019-scale intake.
7. **Ship "Também vejo isso"** on nearby same-category open pins, one per verified phone, with moderator merge.
8. **Measure inequality from the start**: sign-ups and pins per 1,000 residents by bairro, published. Pilot a trusted-poster route in one or two under-represented bairros.
9. **Put an independence block on the landing page**: who runs it, who funds it, what we do not accept, and the AGPL repository link.
10. **Plan the sunset**: data export and an archive policy from day one (Achados e Pedidos closed after nine years).

### DON'T
1. **Don't present the "57%" as causal or as a universal rate.** It is an association on UK data from 2007-2013, defined as "first report marked fixed within 35 days by the council or another user", comparing 18.2% with 11.6%.
2. **Don't treat Canberra as a FixMyStreet failure.** It is the ACT Government's own tool. As of 12 May 2025: 40,077 cases reported in 2024-25, 30,934 completed. The inquiry exists because of delays; the 12-month wait is a resident quote in the Canberra Times.
3. **Don't copy Colab's headline resolution rate** or any self-reported resolution figure.
4. **Don't rank bairros by raw pin counts** or read a quiet bairro as a healthy one.
5. **Don't let any user, official or not, close a pin without a visible source and a contest window.** Early or false closing is the recurring SeeClickFix complaint.
6. **Don't claim official replies as a differentiator over FixMyStreet.** FixMyStreet Pro councils already post statuses and templated replies. The differentiators are the public per-secretaria timing and resident-judged resolution, and independence from the Prefeitura.
7. **Don't quote a waitlist conversion benchmark.** The draft's 20-40% had no credible source (vendor blogs only; their own ranges run from about 3% to 45% by traffic source).
8. **Don't flood the Ouvidoria.** Rate-limit and batch the digest.
9. **Don't promise anonymity beyond what we deliver.** Phone verification plus a public pseudonym and bairro is our model. Fala.BR itself allows only anonymous denúncias, with no protocol and no reply.

---

## 4. Open questions (not resolved by this research)

1. Does the CGM accept a daily digest as a manifestação, via Fala.BR or email, and who is the "usuário" of record?
2. Ouvidoria volumes and reply times for 2024-25 (only 2019 found). A LAI request to the CGM would settle it.
3. Whether Canoas has ever used Colab or another reporting platform (negative search results only), and whether "Ágora em Rede" (2014) still exists.
4. Reclame Aqui's official help pages (scoring weights, verification steps, free vs paid) were blocked; the figures above are from secondary sources.
5. Any evaluated mitigation for participation inequality. None found; treat the ideas in 1(e) as pilots with a measurement plan.
6. How Brazilian prefeituras' back-ends could accept Open311. Not researched; default to email/Fala.BR.

---

## 5. Verification log

| Claim in draft | Finding | Source |
|---|---|---|
| Sjoberg, Mellon & Peixoto: "successful first report = 57% increase in second report" | **Verified, with corrections.** Abstract: "a successful first experience using FixMyStreet.com is associated with a 57 percent increase in the probability of an individual submitting a second report". Mechanics: model estimates 11.6% (not fixed) vs 18.2% (fixed within 35 days) = about 57% relative; bivariate 13.6% vs 24.1%. "Fixed" = marked fixed within 35 days by the council or another user (self-marked fixes excluded to limit endogeneity). Data: 399,364 reports by 154,957 individuals, 28 Feb 2007 to 12 Feb 2013 (draft said "399,364 participants"). The authors call the estimate conservative. Published in Public Administration Review 2017 (draft said World Bank 2015). It is an association with controls, not a randomised effect. The "predicts all future submissions" line is in the abstract. | Oxford ORA working-paper PDF (text read): https://ora.ox.ac.uk/objects/uuid:2bd169fd-0b27-46e4-8b81-1ccfccf7c55a/files/ma5b19b3d0c0005e21d0bc3e457691bf5 ; abstract wording also at https://democracyspot.net/2017/03/ ; the draft's World Bank link returned 403 |
| "FixMyStreet Brussels study (30,041 reports)" at dspace.stir.ac.uk | **Study real; link wrong.** Pak, Chua & Vande Moere (2017), J Urban Technology 24(2):65-87, 30,041 reports since 2013. The stir.ac.uk handle is a different paper (Matthews et al. 2022, UK data). The draft's "2-3x more reports" is not in the Brussels abstract and I could not confirm it (full text unread); "near-linear without superusers" is from Matthews et al. (UK), not Brussels. Both removed or re-attributed. | https://arxiv.org/abs/1708.02274 ; https://rxd.architectuur.kuleuven.be/research/inequality-in-crowdsourced-civic-participation/ ; https://dspace.stir.ac.uk/handle/1893/34613 |
| Canberra FixMyStreet submission says 12-month delays, false "fixed" closures, dismissive replies | **Partly.** The submission exists (Submission 035, Alice Paton, 25 July 2025, to the ACT inquiry into the effectiveness of Fix My Street). Per its summary (PDF returned 403): responses often come months later "only to close the incident report"; slow responses reduce confidence and future reporting; the tool is reactive, not root-cause. "12 months" is a Canberra Times resident quote (Fraser Castles). "False fixed closures" and "dismissive replies" were not confirmed. Canberra's Fix My Street is the ACT Government's own City Services service (launched 2010 as a web form), not mySociety's software. | https://www.parliament.act.gov.au/__data/assets/pdf_file/0010/2911069/Submission-035-Alice-Paton-25-July-2025_Redacted.pdf (via search excerpt) ; https://www.canberratimes.com.au/story/8973416/canberras-fix-my-street-faces-scrutiny-over-delays/ ; https://www.act.gov.au/fixmystreet |
| arXiv 2603.11120 = crowdsourcing misinformation (pranksters, DDoS, bots) | **Exists, but not what the draft says. Deleted.** It is "The Laziness of the Crowd: Effort Aversion Among Raters Risks Undermining the Efficacy of X's Community Notes Program" (Wack, Warren, Alam; 11 Mar 2026). It does not study civic-reporting platforms, pranksters, DDoS or moderators. | https://arxiv.org/abs/2603.11120 |
| Reclame Aqui "26.5M users" (and "400 employees") | **Not supported. Replaced.** The cited accountabilityresearch.org page never mentions Reclame Aqui. Current figures: 28M+ consumers, 750k companies, ~46k complaints/day (27 Nov 2025). Headcount unverified, cut. | https://www.meioemensagem.com.br/marketing/aos-25-anos-reclame-aqui-quer-ampliar-atuacao-internacional ; https://accountabilityresearch.org/public-ouvidorias-in-brazil-from-accounting-to-multifaceted-accountability/ |
| Fogo Cruzado "uses real names + volunteer verification, 250k downloads" | **Not supported.** Reports arrive via app, WhatsApp, social media, press and police; the team cross-checks, drops incomplete/repeated/unconfirmed items, and uses only WhatsApp sources it has a trust relationship with. App: browse unregistered; registered users contribute. Real-name requirement and volunteer verification not stated anywhere I read. No download figure found. | https://ijnet.org/en/story/app-fills-information-gap-shootings-brazil ; https://www.brasildefato.com.br/2020/02/01/aplicativo-propoe-mapear-tiroteios-no-rio-de-janeiro/ ; https://olhardigital.com.br/2021/07/29/tira-duvidas/fogo-cruzado-entenda-como-funciona-o-aplicativo-que-mapeia-tiroteios/ ; fogocruzado.org.br pages returned 403 |
| Onde Fui Roubado "980 municipalities" | **No source found.** 2013-14 press excerpts cite roughly 400 cities and 17,000 reports (S). Reports are anonymous. Draft's "Salvador, BH 1000+, SP 1000+" matches Catraca Livre (Aug 2013). | https://catracalivre.com.br/cidadania/de-forma-colaborativa-pagina-mapeia-o-crime-no-brasil/ ; search excerpts |
| FixMyStreet, Consul, Decidim are AGPL | **Verified.** FixMyStreet: AGPL v3 or later per LICENSE.txt (GitHub shows NOASSERTION). Decidim: AGPL-3.0. Consul (consuldemocracy/consuldemocracy): AGPL-3.0. The draft's "Ushahidi AGPL for some, GPL for others" is unverified (GitHub shows NOASSERTION) and was cut. | https://raw.githubusercontent.com/mysociety/fixmystreet/master/LICENSE.txt ; https://api.github.com/repos/decidim/decidim ; https://api.github.com/repos/consuldemocracy/consuldemocracy |
| Colab city list; Canoas ever used Colab | **Draft numbers wrong/unsupported.** 64 cities (May 2015); 130+ prefeituras (May 2017, via search excerpt); 1M+ citizens, 80%+ resolved (colab.com.br, 2026). Porto Alegre since 2015. No evidence for Canoas (two searches). Canoas launched its own "Ágora em Rede" (Lung, 16 Jul 2014). Draft's "70+ municipalities" and "100k users" and its newcities.org source were not verified. | https://www.baguete.com.br/noticias/porto-alegre-adere-ao-colab-re ; https://www.colab.com.br/sou-cidadao ; https://www.baguete.com.br/noticias/canoas-lanca-rede-social-para-populacao |
| Waitlist "20-40% conversion" (SEO blog) | **Deleted.** Only vendor-blog benchmarks found (about 3-10% paid, 10-20% cold, 25-45% warm traffic), none with a primary dataset. | search results (getlaunchlist, Medium) |
| FixMyStreet delivery "auto-email ... API"; duplicate "customisable radius, 50 m" | **Corrected.** Email by default, Open311 optional, `send-reports` every 5 minutes. The 2019 duplicate trial uses "same category within a small radius"; the 50 m figure and "measurable deduplication" have no source. | docs links in 1(a); mySociety 2019 post |
| FixMyStreet "no official replies" (draft conclusion 3) | **Wrong.** Councils set statuses and post templated responses on FixMyStreet Pro. | SocietyWorks 2022 post |
| Open311 statuses "open, in progress, completed, not addressed, closed" | **Wrong.** GeoReport v2 has only `open` and `closed`. | https://wiki.open311.org/GeoReport_v2/ |
| Fala.BR "CPF required; pseudonymous not available" | **Corrected.** Anonymous filing exists only for denúncias (no protocol, no reply); other types need identification (gov.br login). | https://falabr.cgu.gov.br ; ouvidoria guidance found via search (S) |
| SeeClickFix Albany "40% less" | **Deleted.** The cited NSF abstract (Yong et al. 2019, Capital District NY) contains no such figure and does not mention Albany. | https://par.nsf.gov/biblio/10196229-understanding-online-civic-engagement-multi-neighborhood-study-seeclickfix |
| MIT Govlab/World Bank (Peixoto, 2017) "civic tech doesn't level the field" | **Unverified (403). Replaced** with Peixoto & Fox, "When Does ICT-Enabled Citizen Voice Lead to Government Responsiveness?" (23 ICT platforms; capacity up, willingness not yet). Read via search excerpt (S). | https://bulletin.ids.ac.uk/index.php/idsbo/article/download/34/html?inline=1 |
| Ouvidorias "300+ federal ouvidorias" | **Unverified, cut.** The Accountability Research page supports only the independence and enforcement points. | accountabilityresearch.org page above |
| Boston CityScore link (smartcitiescouncil) | **Replaced** with the boston.gov page; targets and cadence quoted from it. | https://www.boston.gov/innovation-and-technology/cityscore |
| Cut as unverified or not decision-relevant | Rio 1746 ("23,000 calls/day"), SP156, Fala.BR "AI classification April 2026", Decidim "100+ cities, ~1M users", Querido Diário, SOS RS, Wheelmap, StreetComplete, Ushahidi teardown, gamification study (Romano et al., not re-checked), "60% of civic app users on mobile", "conversion drops 15% with two fields", Reclame Aqui "payment-receipt verified consumer", FixMyStreet "Received/Investigating/Fixed" lifecycle (replaced by the real status list). | n/a |

**Method notes.** About 70 web fetches/searches were used, above the 30-40 target, because the five gap questions and ten claim checks each needed separate sources. Pages that returned 403/429 and could not be read directly: the World Bank bitstream, the Canberra PDF, fogocruzado.org.br, all reclameaqui.com.br pages, dev.seeclickfix.com, mitgovlab.org, whatdotheyknow.com, and fixmystreet.com/faq. Claims resting only on search-result excerpts are marked (S). Homepage numbers are a 2026-10-12 snapshot.
