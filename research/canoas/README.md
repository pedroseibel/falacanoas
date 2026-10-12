# Canoas, RS: verified context for FalaCanoas

**Verified:** 2026-10-12 (every URL below was opened that day unless marked otherwise).
**Replaces:** the 2026-10-11 draft. Most of its citations did not support the claims attached to them; see the Verification log.
**Legend:** `[não verificado]` = could not be confirmed from a primary source. Nothing marked that way should appear on the landing page.
**Language:** English, with pt-BR terms and quotes where the source is Portuguese.

---

## TL;DR

1. **Size.** 347,657 residents (Censo 2022); IBGE 2026 estimate 359,845.
2. **Bairros.** 18 official (Lei 4.736/2003), 17 inhabited. Cinco Colônias is a loteamento inside Harmonia, not a bairro.
3. **No 156.** Channels: CAC (0800 510 1234, e-mail, protocolos), Ouvidoria (e-mail, Fala.BR), IP Canoas (lighting), WhatsApp (Limpeza Urbana).
4. **Clock.** Best anchor: a daily e-mail digest to the Ouvidoria (30+30-day legal reply, Decreto 434/2019), CAC in copy. E-mail protocol numbers [não verificado]; pilot first.
5. **Baseline.** Ouvidoria logged 2,772 manifestações in 2024 (~8 per 1,000 residents); flood-period replies within 30 days: 53.7%.
6. **Flood 2024.** 31 deaths (Defesa Civil RS); ~180 mil affected (Prefeitura); 50–60% of territory flooded.
7. **Draft errors.** "7 chronic bairros" was one storm (18/06/2025); the lighting PPP operator is IP Canoas, not TIM; Ouvidoria statistics do exist.
8. **Owners.** Obras e Reconstrução: potholes, drainage, pumps. Serviços e Zeladoria Urbana: cleaning, pruning, lighting. Mobilidade Urbana: traffic. Collection contractor [não verificado].
9. **Data.** GeoCanoas publishes official bairro polygons; no open-data portal.
10. **Community.** Bairro Facebook groups [não verificado]; Instagram reach is large. Press 2024–26: potholes dominate; Mathias Velho and Centro recur.

---

## 1. Basic facts

| Fact | Value | Source |
|---|---|---|
| Population, Censo 2022 | 347,657 | [IBGE SIDRA t.4714](https://apisidra.ibge.gov.br/values/t/4714/n6/4304606/p/2022) |
| Area, Censo 2022 | 130.789 km² (the draft said 130.774) | same |
| Density, Censo 2022 | 2,658.15 hab/km² | same |
| Estimate 2025 / 2026 | 359,840 / 359,845 | [IBGE SIDRA t.6579](https://apisidra.ibge.gov.br/values/t/6579/n6/4304606/v/9324/p/2025,2026) |
| Internet use, Brazil 2024 (national only) | 93.6% of households; 89.1% of people 10+; 98.8% of those users go online by cell phone | [IBGE PNAD TIC 2024](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102193_informativo.pdf) |

No Canoas-level internet figure was found. Do not infer one from the national numbers.

### Bairros, quadrantes, subprefeituras

- **18 official bairros.** Lei Municipal 4.736 of 30/01/2003 ("Denominação e localização dos bairros"), as reproduced in the Prefeitura's [Canoas em Dados 2012](https://www.canoas.rs.gov.br/canoas_em_dados2012-2) (PDF, box "Divisão territorial – bairros", which lists all 18 by name). The municipal health plan repeats it: "cinco quadrantes ... divididos em dezoito bairros" ([PMS 2022–2025, p. 8](https://canoas.rs.gov.br/wp-content/uploads/2023/03/Plano-Municipal-de-Saude-de-Canoas-PMS-2022-2025.pdf)). GeoCanoas serves the same 18 polygons in a layer last modified 2026-08-14 ([BAIRROSOFICIAL](https://geo.canoas.rs.gov.br/server/rest/services/BAIRROSOFICIAL/FeatureServer/0)).
- **Ilha das Garças** is official but has 0 residents (Censo 2010 and 2022 columns in GeoCanoas). The draft's list of 17 omitted it. Industrial (32 residents) and Brigadeira (437) are also almost empty, so the real sign-up list is about 14 bairros plus São Luís.
- **Cinco Colônias is not a bairro.** It is absent from the 2003 law and from the GeoCanoas layer. Correios address data classify it as a loteamento of Harmonia: CEP 92320-380, "Rua das Palmas (Lot Cinco Colônias)", bairro Harmonia ([ViaCEP](https://viacep.com.br/ws/92320380/json/)). The Prefeitura still says "bairro Cinco Colônias" in its own releases ([example](https://www.canoas.rs.gov.br/noticias/atencao-prefeitura-alerta-para-que-moradores-dos-bairros-harmonia-e-cinco-colonias-deixem-as-areas/)) and has a "Subprefeitura Harmonia / Cinco Colônias". **Product decision:** offer the 18 official bairros, and let people type "Cinco Colônias" as a locality that resolves to Harmonia.
- **Quadrantes exist** (the draft said they did not): Nordeste, Noroeste, Sudeste, Sudoeste, Centro (PMS 2022–2025, p. 8).
- **10 subprefeituras** run local services (bocas de lobo, sidewalk erosion, pruning, road signs, debris; pothole sweeps are done with Obras). Current groupings, per the [official list](https://www.canoas.rs.gov.br/lista-de-subprefeituras/): Centro; Igara/São José; Guajuviras; Estância Velha/Olaria; N. Sra das Graças/Mal. Rondon; Niterói; Mathias Velho/São Luís; Harmonia/Cinco Colônias; Fátima/Mato Grande; Rio Branco. They differ from the groupings in [Decreto 10/2025](https://www.canoas.rs.gov.br/wp-content/uploads/2025/05/DECRETO-10.2025-Prefeitura-de-Canoas-Estrutura-e-Competencias.pdf) (Jan 2025), so the structure changed after that date. Subprefeituras are a natural second axis for the scoreboard.

| Bairro | Quadrante | Pop. 2022 (GeoCanoas) |
|---|---|---|
| Mathias Velho | Noroeste | 43,263 |
| Guajuviras | Nordeste | 40,803 |
| Harmonia | Noroeste | 34,802 |
| Niterói | Sudeste | 33,002 |
| Estância Velha | Nordeste | 30,519 |
| Rio Branco | Sudoeste | 28,384 |
| Igara | Nordeste | 20,213 |
| Fátima | Sudoeste | 19,393 |
| São José | Nordeste | 18,360 |
| Mato Grande | Sudoeste | 16,377 |
| Olaria | Nordeste | 15,926 |
| Centro | Central | 15,698 |
| Marechal Rondon | Central | 15,251 |
| N. Sra das Graças | Sudeste | 14,596 |
| São Luís | Noroeste | 4,407 |
| Brigadeira | Nordeste | 437 |
| Industrial | Noroeste | 32 |
| Ilha das Garças | Sudoeste | 0 |

Quadrantes: PMS 2022–2025. Population: `POPULACAO_2022` field of the GeoCanoas layer. It sums to 351,463, not the Censo total of 347,657, because the Prefeitura aggregated census sectors into bairros. Use it for relative size only, never as a footnoted figure.

---

## 2. The 2024 flood and drainage

All figures are attributed because sources disagree.

| Item | Figure | Source |
|---|---|---|
| Deaths in Canoas | 31, the most of any RS municipality (Roca Sales 13, Cruzeiro do Sul 12). Defesa Civil RS bulletin of 14/06/2024. Later revisions [não verificado]. | [Agência Brasil, 14/06/2024](https://agenciabrasil.ebc.com.br/geral/noticia/2024-06/numero-de-mortes-por-enchentes-no-rs-aumenta-para-176) |
| People affected | "cerca de 180 mil pessoas, mais da metade da população" (Prefeitura). The Secretário de Obras also said 180 mil, plus ">70 mil residências inundadas". The 2024 Ouvidoria annual report says 150 mil moradores, 70 mil casas, ~28 mil desabrigados. Use one figure with its attribution. | [Prefeitura](https://www.canoas.rs.gov.br/recomeco-de-canoas/); [BdF, 09/07/2024](https://www.brasildefato.com.br/2024/07/09/audiencia-aponta-falhas-e-necessidades-do-sistema-de-protecao-contras-cheias-da-grande-porto-alegre); [Ouvidoria 2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/RELATORIO-ANUAL-OUVIDORIA-2024-_1_.pdf) |
| Territory flooded | "cerca de 60%" (prefeito, 06/05/2024); "mais de 50%" (Secretário de Obras, jul/2024) | [JC, 06/05/2024](https://www.jornaldocomercio.com/jornal-cidades/2024/05/1153346-prefeito-de-canoas-fala-em-60-dias-para-que-agua-baixe-em-toda-a-cidade.html); BdF link above |
| Pump houses | 8 casas de bombas. Mid-flood snapshot: 2 operating, 6 inoperative. Current status [não verificado]. | [Sul21, 08/05/2024](https://sul21.com.br/noticias/geral/2024/05/pioneira-em-criar-escritorio-de-resiliencia-climatica-canoas-falhou-ao-se-preparar-para-enchente/); [JC, 17/05/2024](https://www.jornaldocomercio.com/jornal-cidades/2024/05/1155199-canoas-tera-40-bombas-para-escoamento-da-agua-no-lado-oeste.html) |
| Dikes | ~30 km, designed on the 1941 flood. Breaches on 3 May 2024 at Mathias Velho/Harmonia (by casa de bombas nº 6) and Rio Branco/Fátima. | Sul21 and BdF above |
| Dike repairs | Rio Branco/Fátima: "conserto definitivo" delivered 14/12/2024. Mathias Velho: works ongoing (councillors' visit 03/06/2026). Dique Araçá (Mato Grande): [demolitions started May 2026](https://www.canoas.rs.gov.br/noticias/prefeitura-inicia-remocao-de-casas-em-area-do-dique-araca-para-avanco-das-obras/). | [Prefeitura 14/12/2024](https://www.canoas.rs.gov.br/noticias/prefeitura-de-canoas-conclui-o-fechamento-definitivo-do-dique-rio-branco-fatima/); [03/06/2026](https://www.canoas.rs.gov.br/noticias/vereadores-acompanham-andamento-das-obras-de-reconstrucao-do-dique-mathias-velho/) |
| Cost estimate | R$ 1.5 billion for the protection system (Secretário de Obras, jul/2024) | BdF link above |
| Resident claim | Mathias Velho residents say the pump houses are "sem operadores" (05/05/2026). Not confirmed by the Prefeitura in anything found. | [BdF, 05/05/2026](https://www.brasildefato.com.br/2026/05/05/moradores-de-canoas-rs-denunciam-casas-de-bombas-sem-operadores-e-medo-de-novas-cheias-na-cidade/) |

### "Chronic alagamento" bairros: the claim is wrong

Nobody publishes a list of chronic bairros. The draft's seven (Olaria, Niterói, Fátima, Harmonia, Estância Velha, Cinco Colônias, Mathias Velho) are the bairros that flooded in **one event**: 69 mm in 4 hours on 18/06/2025, with 89 desalojados and 28 desabrigados ([Sul21, 18/06/2025](https://sul21.com.br/noticias/geral/2025/06/bairros-de-canoas-voltam-a-alagar-com-chuva-acima-do-esperado/)). Canoas decreed emergency the next day ([Timoneiro, 19/06/2025](https://jornaltimoneiro.com.br/index.php/2025/06/19/canoas-decreta-situacao-de-emergencia-devido-a-alagamentos-e-chuvas-intensas/)).

The 2024 flood hit the west side. Organised residents describe it as six bairros: São Luís, Mathias Velho, Harmonia, Mato Grande, Fátima, Rio Branco ([BdF, 25/07/2025](https://www.brasildefato.com.br/2025/07/25/moradores-de-seis-bairros-atingidos-por-enchentes-cobram-acoes-da-prefeitura-de-canoas/)). A "flood watch" feature should draw on official flood-protection and Defesa Civil map layers (GeoCanoas lists both tools; layer contents not inspected), not on this list.

Current prevention work: from 10/08/2026 the Prefeitura runs a bairro-by-bairro drainage task force starting in Mathias Velho, under Obras e Reconstrução ([Prefeitura, 11/08/2026](https://www.canoas.rs.gov.br/noticias/prefeitura-em-acao-mutirao-de-bairro-a-bairro-para-prevenir-alagamentos/)).

---

## 3. Complaint channels (all checked 2026-10-12)

**There is no 156.** The number appears nowhere on canoas.rs.gov.br (home, CAC, Ouvidoria, emergency numbers). There is no general municipal complaint app. The only app is lighting-specific, and it belongs to the concessionária.

| Channel | Exact details | Protocolo | Source |
|---|---|---|---|
| **CAC** (Central de Atendimento ao Cidadão): service requests and general complaints | 0800-51-01234 (shown as 0800-5101234 in the site footer). Mon–Fri 8h–18h. E-mail atendimento.cidadao@canoas.rs.gov.br. In person: Rua Ipiranga 120, Centro. Doubts: (51) 3236-1079 / 3236-1088. | Page says "são gerados os protocolos gerais do município" for phone, e-mail, 0800 and in-person requests. Whether the e-mail sender gets the number back [não verificado]. | [CAC page](https://www.canoas.rs.gov.br/servicos/central-de-atendimento-ao-cidadao/) |
| **Ouvidoria Municipal**: formal manifestações | Fala.BR; e-mail transparenciaouvidoria@canoas.rs.gov.br; phone (51) 3236-1676; Rua Ipiranga 120, Centro (the 2024 report's annex says nº 95, 7º andar). Mon 12–18h, Tue–Thu 8–17h, Fri 8–14h. | Fala.BR issues a protocol number plus an access code. Only denúncias can be anonymous; reclamações and solicitações must be identified. For e-mail the report only says entries go in a spreadsheet and are forwarded by memorando; the number returned to the sender [não verificado]. | [Ouvidoria portal](http://sistemas.canoas.rs.gov.br/transparencia/servlet/wmouvidoriamunicipal); [CGU wiki, Nova Manifestação](https://wiki.cgu.gov.br/index.php?title=4._Nova_Manifesta%C3%A7%C3%A3o) |
| **Fala.BR** (CGU) | Canoas "opera através da plataforma Fala.BR". The portal's deep link `falabr.cgu.gov.br/publico/RS/Canoas/Manifestacao/RegistrarManifestacao` returns **HTTP 404**, and so does the same URL pattern for Porto Alegre, so the scheme has probably changed. The platform root works: https://falabr.cgu.gov.br/web/home. Whether Canoas appears in the new organ list [não verificado]. | protocol number + access code | Ouvidoria portal above |
| **Fala.BR API** | For ouvidorias only: the Ouvidor of the organ asks CGU for a "WebService" user. Not available to a third party. | | [CGU wiki](https://wiki.cgu.gov.br/index.php?title=Fala.BR_-_API_Faq) |
| **Public lighting** | IP Canoas: 0800 002 1757; app "Ilumina Canoas" (Android/iOS); https://ipcanoas.cidadeiluminada.com.br. Prefeitura lists a 2-day service target (the same page's description text looks pasted from an unrelated service, so treat the target as indicative). | not checked | [Prefeitura service page](https://www.canoas.rs.gov.br/servicos/solicitacao-de-manutencao-ou-reparos-da-iluminacao-publica/); [orientações](https://www.canoas.rs.gov.br/orientacoes-sobre-o-servico-de-iluminacao-publica/) |
| **Illegal dumping** | WhatsApp of the Diretoria de Limpeza Urbana: (51) 98255-2777 (also CAC and e-mail above). Fines 50–400 URM (R$ 4.62 each in 2026), Lei 4.980/2005. | not checked | [Prefeitura](https://www.canoas.rs.gov.br/servicos/descarte-irregular-de-residuos/) |
| **Defesa Civil** | 24h on-call (51) 98255-0805 | | [Prefeitura](https://www.canoas.rs.gov.br/servicos/telefones-de-emergencia/) |
| **Pedido de informação (e-SIC / LAI)** | https://sistemas.canoas.rs.gov.br/transparencia/servlet/wmpedido. Deadline: 20 days, extendable by 10 (Lei 12.527, art. 11; the draft's "20 business days" was wrong). | | [Lei 12.527](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm) |
| **Prefeitura social** | Instagram @prefcanoas (217K); Facebook /PrefeituradeCanoas; X /prefcanoas | | [home page](https://www.canoas.rs.gov.br/) |

**Legal basis of the Ouvidoria.** Decreto Municipal 434/2019 "regulamenta a Lei federal 13.460/2017 e institui a Ouvidoria Municipal de Canoas". The draft's number is right, but the decree text itself was not found online. It is confirmed only through the Ouvidoria's own [Relatório Anual 2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/RELATORIO-ANUAL-OUVIDORIA-2024-_1_.pdf) (§2, §3.3). That report quotes art. 17: conclusive reply "no prazo de trinta dias ... prorrogável por igual período". [Lei 13.460/2017 art. 16](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm) says the same. Under the 2025 structure the Ouvidoria sits in Secretaria de Transparência e Controladoria → Diretoria de Transparência e Ouvidoria → Unidade de Ouvidoria (Decreto 10/2025, art. 14). A Fala.BR integration, if the Prefeitura ever wants a "verified account", would be requested by the Ouvidor (CGU wiki above).

### Published volume and response times

The draft said none existed. Annual management reports exist for 2019–2024 on the [Ouvidoria portal](http://sistemas.canoas.rs.gov.br/transparencia/servlet/wmouvidoriamunicipal); a 2025 report is not listed yet.

| Metric | Value | Source |
|---|---|---|
| Manifestações 2023 | 1,862 (+144 pedidos de acesso à informação) | [Relatório 2023](https://www.canoas.rs.gov.br/wp-content/uploads/2024/07/Relatorio-anual-de-Gestao-OUVIDORIA-ano-base-2023_compressed.pdf) |
| Manifestações 2024 (to 20/12) | 2,772: e-mail 1,470; Fala.BR 1,087; phone 189; in person 26 | Relatório 2024 |
| Per capita | ~8 per 1,000 residents in 2024 (2,772 / 347,657). The 2023 report itself calls usage "pouco expressiva" and blames lack of publicity. | derived |
| Growth | The 2024 report says +67% vs 2023; its own totals give +49% (2,772 / 1,862). Do not quote either. | |
| Most demanded secretarias 2024 | Serviços Urbanos 46.5%, Saúde 30.85%, Obras 22.7% | Relatório 2024 §3.5 |
| Flood period 06/05–06/12/2024: 1,783 manifestações | 53.7% answered within 30 days; 26.1% answered late; 12.4% still open and late; 7.8% open within deadline | Relatório 2024, anexo |
| Same period, Serviços Urbanos | 363 received; 267 on time (73.6%); 58 late; 24 open and late; 14 open | same |
| Same period, Obras | 186 received; 73 on time (39.2%); 58 late; 36 open and late; 19 open | same |

CAC volumes and response times: none published [não verificado]. The Ouvidoria is one channel among several; the 2023 report notes many complaints go through the CAC or directly to secretarias.

### What this means for the scoreboard clock (decision input)

- **E-mail is the busiest Ouvidoria channel** (53% of 2024 manifestações) and needs no account. A daily digest e-mail is therefore a channel the Ouvidoria already handles at scale.
- The Ouvidoria forwards each manifestação by memorando to the responsible secretário, and the 30-day legal clock (extendable once by 30) runs on receipt. A timestamped e-mail to transparenciaouvidoria@canoas.rs.gov.br, with atendimento.cidadao@canoas.rs.gov.br in copy, is the most defensible "clock starts" moment. The CAC copy gives a "protocolo geral".
- **Lighting is different.** The concessionária takes tickets by phone, app or site, not through the Ouvidoria. A separate clock, against the 2-day service target on the Prefeitura page, would be the honest way to score lighting pins.
- Lei 13.460, art. 10 says a manifestação "conterá a identificação do requerente". A digest sent in the project's name needs a legal read on whether it counts as a manifestação (see `research/legal`). On Fala.BR only denúncias can be anonymous; a reclamação or solicitação must be identified.
- **Pilot before launch:** send one real pin to both addresses and record what comes back (auto-reply, protocolo, a person). That answers the two open [não verificado] cells above.

---

## 4. Who owns what

Source for all rows: [Decreto nº 10 of 07/01/2025](https://www.canoas.rs.gov.br/wp-content/uploads/2025/05/DECRETO-10.2025-Prefeitura-de-Canoas-Estrutura-e-Competencias.pdf) (Diário Oficial, Edição Complementar 3, 08/01/2025; it regulates Lei 6.796/2025 and was not "May 2025" as the draft said), cross-checked with the Prefeitura's service pages. Secretaria names changed in 2025: "Serviços Urbanos" is now "Serviços e Zeladoria Urbana"; "Obras" is now "Obras e Reconstrução".

| Problem | Secretaria / unit | Notes |
|---|---|---|
| Tapa-buraco, pavimentação | **SMOR** Obras e Reconstrução: Diretoria de Pavimentação de Obras Viárias → Unidade de Conservação de Pavimentação, with the subprefeituras | The draft put this under Zeladoria. [Prefeitura, 02/09/2025](https://www.canoas.rs.gov.br/noticias/acao-de-tapa-buraco-mobiliza-equipes-em-todas-as-regioes-de-canoas/) names SMOR plus subprefeituras. |
| Drenagem (bocas de lobo, galerias), casas de bombas, diques | **SMOR**: Diretoria de Esgotos Pluviais; Diretoria de Serviços de Proteção → Estações de Bombeamento; Conservação de Macrodrenagem e Diques | [Prefeitura, 11/08/2026](https://www.canoas.rs.gov.br/noticias/prefeitura-em-acao-mutirao-de-bairro-a-bairro-para-prevenir-alagamentos/) |
| Limpeza urbana, coleta, entulho | **SMSZU** Serviços e Zeladoria Urbana: Diretoria de Limpeza Urbana | Collection is contracted out. **Contractor's name [não verificado].** An emergency contract was tendered on 30/12/2024 ([Dispensa 450/2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/edital-450-2024.pdf)) pending the new tender Edital 391/2024. "Grupo THV", which turns up in searches, was the 2024 flood-cleanup contractor, not the regular collector. |
| Iluminação pública | **SMSZU**: Diretoria de Iluminação Pública, executed by the PPP concessionária **IP Canoas** | The draft said Obras and "TIM PPP". Both wrong; see below. |
| Poda, arborização | **SMSZU**: Unidade de Arborização Urbana ("Solicitação de Poda e Supressão em Locais Públicos" is listed under SMSZU). The CAC page also lists "podas e cortes de árvores" under Meio Ambiente, so the split is unclear. | |
| Calçadas | Subprefeituras handle "erosões nas calçadas" ([subprefeitura page](https://www.canoas.rs.gov.br/departamentos/subprefeitura-harmonia-cinco-colonias/)). A 2018 municipal cartilha ("Calçada Cidadã") sets rules for owners paving their own sidewalks; current rules and enforcement owner [não verificado]. | |
| Trânsito, sinalização, semáforos | **SMMU** Mobilidade Urbana: Diretoria de Trânsito; Diretoria de Obras e Sinalização | The draft said "unverified". |
| Defesa Civil | Secretaria de Defesa Civil e Resiliência Climática (SDCRC) | |

**Lighting PPP (corrected).** The concession was auctioned on 16/05/2023 with BNDES support, runs 24 years ([BNDES release via Mercado & Consumo](https://mercadoeconsumo.com.br/15/05/2023/noticias/bndes-leilao-de-ppp-para-iluminacao-publica-de-canoas-rs-sera-nesta-3a-feira/)). The concessionária **IP Canoas** is formed by STE, GCE, RH Engenharia, Fortnort, Henerge and Expresso Charqueadas. TIM is its connectivity partner for remote management (TIM Smart Lighting), not the operator ([TeleTime, 22/04/2025](https://teletime.com.br/22/04/2025/tim-fecha-parceria-para-levar-iluminacao-inteligente-a-canoas/)). By 11/06/2025, 30,550 of 30,667 points had been swapped to LED ([ABC+](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/quase-100-das-lampadas-ja-foram-trocadas-por-led-nas-ruas-e-espacos-publicos-de-canoas/)). The concession covers 30,667 points (same ABC+ piece). Whether the June 2025 target was met is [não verificado].

---

## 5. Maps and open data

- **GeoCanoas exists:** https://geo.canoas.rs.gov.br (Esri portal; description at [canoas.rs.gov.br/geocanoas-por](https://www.canoas.rs.gov.br/geocanoas-por/)). Public tools: equipamentos públicos, meio ambiente, infraestrutura (including the flood-protection system), urbanismo, Defesa Civil, historical imagery, monitoring, Mapoteca.
- **Public ArcGIS REST endpoint:** https://geo.canoas.rs.gov.br/server/rest/services (237 services). Useful layers: `BAIRROSOFICIAL` (18 polygons with population fields), `Area_subprefeitura` (5 quadrante-style areas, i.e. the older structure), `Loteamentos`, `Quadras`, `iluminacao_2025`. FalaCanoas can assign bairro from this layer instead of hand-drawing boundaries.
- **License or terms of reuse:** not stated on the layer (`copyrightText` is empty) [não verificado]. Ask the Prefeitura before redistributing the geometry.
- **No open-data portal found.** Only the [Portal da Transparência](http://sistemas.canoas.rs.gov.br/transparencia/) (budgets, contracts, Ouvidoria reports).

---

## 6. Where residents already talk

Counts are the public follower numbers each profile exposed on 2026-10-12.

**Bairro Facebook groups and WhatsApp groups: [não verificado].** Facebook groups are behind a login wall and search engines do not index them. Nothing here names a bairro group or its size. A logged-in person must do this census (see section 9). The only WhatsApp group found by name is the Diário de Canoas reader community, advertised on its articles. The persona's habitat is therefore plausible but not measured. The one documented case: a Fátima resident started a street group that "ficou enorme" and became the Comissão SOS Bairro Fátima/Rio Branco ([Sul21, 30/04/2025](https://sul21.com.br/noticias/geral/2025/04/moradores-de-canoas-se-unem-para-cobrar-obras-antienchentes/)).

| Page | Platform | Size | Notes |
|---|---|---|---|
| [Acontecimentos Canoas](https://www.instagram.com/acontecimentoscanoas/) | Instagram | 228K | News and resident reports (per search-engine snippet; not confirmed on the profile). Largest local account found. |
| [O Timoneiro](https://www.instagram.com/jornaltimoneirocanoas/) / [Facebook](https://www.facebook.com/jornaltimoneiro/) | Instagram / Facebook | 130K / 15,097 | Local newspaper |
| [Diário de Canoas](https://www.instagram.com/diariodecanoas/) | Instagram | 111K | Local newspaper |
| [Niterói Canoas](https://www.instagram.com/niteroicanoas/) | Instagram | 39K | Only bairro-named Instagram account found |
| [Portal Canoas](https://www.instagram.com/portalcanoas/) | Instagram | 21K | News portal |
| [Mathias Velho \| Canoas RS](https://www.facebook.com/BairroMathias/) | Facebook page | 6,777 | Bairro page |
| [Canoas Notícias](https://www.facebook.com/canoasnoticias/) | Facebook page | 5,189 | |
| [Consepro](https://www.facebook.com/conseprocanoas/) | Facebook page | 1,099 | Community public-safety council |
| [Assoc. Moradores Bairro Rio Branco](https://www.facebook.com/ambrbcanoas/) | Facebook page | 796 | |
| [Assoc. Moradores da COHAB](https://www.facebook.com/associacaodacohab/) | Facebook page | 623 | |
| [UAMCA, União de Associações de Moradores de Canoas](https://www.facebook.com/p/UAMCA-Uni%C3%A3o-de-Associa%C3%A7%C3%B5es-de-Moradores-de-Canoas-100067808962201/) | Facebook page | not read | Federation of associations; the draft's Telelistas listing was a dead end |

**Organised resident collectives** (already doing what FalaCanoas would aggregate): Comissão SOS Bairro Fátima/Rio Branco (Sul21 above) and the Comitê Unitário dos Seis Bairros Atingidos (São Luís, Mathias Velho, Harmonia, Mato Grande, Fátima, Rio Branco), which delivered an eight-point letter to the Prefeitura on 17/07/2025 ([BdF, 25/07/2025](https://www.brasildefato.com.br/2025/07/25/moradores-de-seis-bairros-atingidos-por-enchentes-cobram-acoes-da-prefeitura-de-canoas/)).

**Civic-tech prior art in Canoas:** no evidence of Colab or any other third-party reporting app. The Prefeitura site search for "colab" returns "Sem resultados". This is a negative result, not proof [não verificado]. The draft's Colab national figures had no support and are removed.

---

## 7. Local press, 2024–2026

Dates come from each page's publication metadata. Bairro column = named in the headline or lede; "n/d" = not confirmed. This is a small, hand-picked sample, not a ranking. ABC+ is the Diário de Canoas portal; its articles invite readers to a Diário de Canoas WhatsApp community (size not shown).

| Date | Headline | Outlet | Bairro | Theme |
|---|---|---|---|---|
| 2024-06-24 | [Entulhos deixam calçadas intransitáveis no Mathias Velho](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/entulhos-deixam-calcadas-intransitaveis-no-mathias-velho/) | ABC+ | Mathias Velho | calçadas / entulho |
| 2025-05-05 | [Moradores cobram solução para ruas esburacadas em Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/moradores-cobram-solucao-para-ruas-esburacadas-em-canoas/) | ABC+ | Igara (Rua Xingu) and others | buracos. Says the municipality had been "sem contrato vigente" for asphalt maintenance since the start of the year. |
| 2025-06-18 | [Chuvas alagam lado Oeste de Canoas e aulas são suspensas na região; 89 pessoas ficaram desalojadas e 28 desabrigados](https://jornaltimoneiro.com.br/index.php/2025/06/18/chuvas-alagam-lado-oeste-de-canoas-e-aulas-sao-suspensas-na-regiao-89-pessoas-ficaram-desalojadas-e-28-desabrigados/) | O Timoneiro | west side (7 bairros per Sul21) | alagamento |
| 2025-07-04 | ["É brabo amanhecer com uma pilha de lixo na frente do portão", reclama morador de Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/e-brabo-amanhecer-com-uma-pilha-de-lixo-na-frente-do-portao-reclama-morador-de-canoas/) | ABC+ | west side: Harmonia, Mathias Velho, Rio Branco named in the lede (Rua República) | lixo / entulho |
| 2025-07-18 | [Descarte irregular de lixo afeta paradas de ônibus e causa preocupação em moradores](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/descarte-irregular-de-lixo-afeta-paradas-de-onibus-e-causa-preocupacao-em-moradores/) | ABC+ | Niterói (Rua Lajeado) | lixo |
| 2025-09-02 | [Mutirão corrige 766 buracos nas ruas de Canoas, informa Prefeitura](https://jornaltimoneiro.com.br/index.php/2025/09/02/mutirao-corrige-766-buracos-nas-ruas-de-canoas-informa-prefeitura/) | O Timoneiro | citywide | buracos (Prefeitura figure) |
| 2025-12-16 | [Buracos em Canoas: Moradores do bairro Nossa Senhora das Graças relatam prejuízos e insegurança no trânsito](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/buracos-em-canoas-moradores-do-bairro-nossa-senhora-das-gracas-relatam-prejuizos-e-inseguranca-no-transito/) | ABC+ | N. Sra das Graças | buracos |
| 2026-04-02 | ["Uma vergonha": Motoristas reclamam do asfalto da Rua 15 de Janeiro, no Centro de Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/uma-vergonha-motoristas-reclamam-do-asfalto-da-rua-15-de-janeiro-no-centro-de-canoas/) | ABC+ | Centro | buracos / asfalto |
| 2026-05-05 | [Moradores de Canoas (RS) denunciam casas de bombas sem operadores e medo de novas cheias na cidade](https://www.brasildefato.com.br/2026/05/05/moradores-de-canoas-rs-denunciam-casas-de-bombas-sem-operadores-e-medo-de-novas-cheias-na-cidade/) | Brasil de Fato | Mathias Velho (per article) | alagamento |
| 2026-05-20 | ["Qual lugar que não tem buraco?": condição do asfalto continua sendo problema em Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/qual-lugar-que-nao-tem-buraco-condicao-do-asfalto-continua-sendo-problema-em-canoas/) | ABC+ | Igara (photo caption); lede says complaints come "de todos os lados da cidade" | buracos |
| 2026-05-21 | [Prefeitura de Canoas inicia operação emergencial de tapa-buracos em bairros do município](https://jornaltimoneiro.com.br/index.php/2026/05/21/operacao-tapa-buracos-canoas-recuperacao-vias-bairros/) | O Timoneiro | citywide | buracos (Prefeitura action) |
| 2026-08-04 | [Canoas retira toneladas de resíduos em ação contra descarte irregular no bairro Mathias Velho](https://jornaltimoneiro.com.br/index.php/2026/08/04/canoas-limpeza-entulho-rua-curitiba-mathias-velho/) | O Timoneiro | Mathias Velho (Rua Curitiba) | lixo |
| 2026-08-05 | ["Já perdi uma suspensão e uma roda": Após a chuva, restam os buracos em ruas e avenidas de Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/ja-perdi-uma-suspensao-e-uma-roda-apos-a-chuva-restam-os-buracos-em-ruas-e-avenidas-de-canoas/) | ABC+ | Estrada do Paquetá (lede) | buracos / pós-chuva |
| 2026-08-26 | ["Piso tátil que termina em lugar nenhum": Calçadas sem manutenção são desafio para deficientes visuais em Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/piso-tatil-que-termina-em-lugar-nenhum-calcadas-sem-manutencao-sao-desafio-para-deficientes-visuais-em-canoas/) | ABC+ | Centro (area around Prefeitura and Câmara) | calçadas |
| 2026-08-28 | ["Parece que a nossa rua voltou a ser de terra batida": Moradores reclamam de obra no bairro Rio Branco em Canoas](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/parece-que-a-nossa-rua-voltou-a-ser-de-terra-batida-moradores-reclamam-de-obra-no-bairro-rio-branco-em-canoas/) | ABC+ | Rio Branco | obra / pavimento |

**What stands out.**
- Potholes are the most persistent resident complaint in 2025–2026 coverage (7 of 15 rows). Mathias Velho (3 rows), Centro (2) and Igara (2) recur by name; Niterói, N. Sra das Graças and Rio Branco appear once, and the 2025-07-04 piece also names Harmonia.
- Streetlight coverage is almost entirely about the PPP rollout (e.g. [Timoneiro, 20/02/2024](https://jornaltimoneiro.com.br/index.php/2024/02/20/consorcio-e-prefeitura-assinam-ordem-de-servico-para-iluminacao-publica-em-canoas/), ABC+ 12/06/2025). I found no resident-complaint headline about streetlights in 2024–2026. That fits the lighting backlog being absorbed by the concessionária's 0800/app rather than by the press, but it is an inference.
- Some Timoneiro rows (2025-09-02, 2026-05-21) report Prefeitura actions, not resident voices. Pair them with the ABC+ complaint stories when you want evidence of demand.

---

## 8. Neutrality notes (only what the page needs)

- The administration changed on 01/01/2025, so the 2024 Ouvidoria report was written under the previous one and secretaria names changed. Cite documents by date and issuing body.
- Flood reconstruction, potholes and drainage are live local political topics. Keep landing-page figures to attributed facts (deaths, IBGE, Ouvidoria totals). Do not publish progress claims about works.
- 2026 is a general-election year (the municipality is not in dispute). That is lower risk than a municipal election, but the scoreboard method (what counts, when the clock starts) should be public from day one, in the same spirit as the "verified figures only" rule in `/home/pedro/git/gov-br/PRODUCT.md`.
- The draft's cabinet list, vote shares, and allegations about the previous mayor are removed: not needed, and the allegations had no verified source.

---

## 9. Open items that need a human

1. **Pilot e-mail:** send one real pin to the Ouvidoria and CAC addresses; record any acknowledgement or protocolo.
2. **Legal read** on Lei 13.460 art. 10 (identification of the requerente) for a project-signed digest. Cross-reference `research/legal`.
3. **LAI request** (e-SIC or Fala.BR) for: CAC annual volume by category and bairro, CAC response times, the 2025 Ouvidoria report, the name of the current household-waste contractor, and the operating status of each casa de bombas.
4. **Facebook group census** by someone logged in: for each bairro, group name, public or private, member count, admin rules on tools and links.
5. **Fala.BR:** confirm the current way to reach the Canoas Ouvidoria (deep link is 404) and whether Canoas appears in the organ list.
6. **GeoCanoas reuse terms:** ask before redistributing bairro polygons.
7. **Final death toll:** confirm Canoas's last figure from Defesa Civil RS (31 is the 14/06/2024 bulletin).

---

## 10. Figures cleared for the landing page

pt-BR wording, each with its footnote source. Anything not in this table needs a new source first.

| Figure | Suggested wording | Footnote source |
|---|---|---|
| 347.657 habitantes | "Canoas tinha 347.657 habitantes no Censo 2022." | IBGE SIDRA t.4714 |
| 359.845 (estimativa) | "A estimativa do IBGE para 2026 é de 359.845 habitantes." | IBGE SIDRA t.6579 |
| 18 bairros | "Canoas tem 18 bairros oficiais (Lei Municipal 4.736/2003)." | Canoas em Dados 2012; GeoCanoas |
| 0800 510 1234 | "Central de Atendimento ao Cidadão da Prefeitura: 0800 510 1234, de segunda a sexta, das 8h às 18h." | CAC page |
| 2.772 manifestações | "Em 2024, a Ouvidoria da Prefeitura registrou 2.772 manifestações (até 20/12)." | Relatório Anual 2024 |
| 53,7% em 30 dias | "Entre 6/5 e 6/12/2024, a Ouvidoria informa que 53,7% das manifestações foram respondidas dentro do prazo de 30 dias." | Relatório 2024, anexo |
| 30 dias | "O prazo legal para resposta é de 30 dias, prorrogável uma vez por mais 30." | Lei 13.460/2017, art. 16 |
| 31 mortes (high sensitivity) | "A enchente de 2024 matou 31 pessoas em Canoas, segundo balanço da Defesa Civil do RS de 14/06/2024." | Agência Brasil |
| 89,1% / 98,8% (national) | "Em 2024, 89,1% dos brasileiros de 10 anos ou mais usaram a internet; 98,8% deles, pelo celular." | IBGE PNAD TIC 2024 |

---

## Verification log

Access date for everything: 2026-10-12. "Draft" = the 2026-10-11 README. Of the draft's 40 distinct URLs, 1 is a dead link (Brasil de Fato, 28/05/2024 protest), 4 are blocked to scripts (IBGE, IBGE agency, AppLocal, Cenário Energia), 3 did not respond from this machine (UFRGS repository, two Telelistas pages), and many that do load do not contain the claim they are cited for (flagged row by row below).

### Population and geography

| Claim | Finding | Source |
|---|---|---|
| 347,657 residents (Censo 2022) | Correct | [SIDRA 4714](https://apisidra.ibge.gov.br/values/t/4714/n6/4304606/p/2022) |
| 359,840 estimate (2025) | Correct. 2026 estimate is 359,845. | [SIDRA 6579](https://apisidra.ibge.gov.br/values/t/6579/n6/4304606/v/9324/p/2025,2026) |
| Area 130.774 km² | **Wrong.** 130.789 km². | SIDRA 4714 |
| Density 2,658.15 | Correct | SIDRA 4714 |
| 17 official bairros, source AppLocal | **Wrong.** 18 by Lei 4.736/2003. AppLocal is a real-estate site and blocks scripts. | [Canoas em Dados 2012](https://www.canoas.rs.gov.br/canoas_em_dados2012-2); [PMS 2022–25](https://canoas.rs.gov.br/wp-content/uploads/2023/03/Plano-Municipal-de-Saude-de-Canoas-PMS-2022-2025.pdf); [GeoCanoas layer](https://geo.canoas.rs.gov.br/server/rest/services/BAIRROSOFICIAL/FeatureServer/0) |
| Cinco Colônias is a bairro | **Loteamento in Harmonia** (Correios). The Prefeitura uses "bairro" informally. | [ViaCEP](https://viacep.com.br/ws/92320380/json/); [Prefeitura release](https://www.canoas.rs.gov.br/noticias/atencao-prefeitura-alerta-para-que-moradores-dos-bairros-harmonia-e-cinco-colonias-deixem-as-areas/) |
| "No official quadrantes" | **Wrong.** Five quadrantes. | PMS 2022–25, p. 8 |
| IDHM 0.750 (2010) | [não verificado] (IBGE API returned empty; IBGE site blocks scripts). Dropped. | |
| PIB per capita R$ 83,895.04 | Consistent with PIB 2023 of R$ 29,166,697 mil divided by the Censo population. Derived, not a published figure. Dropped. | [SIDRA 5938](https://apisidra.ibge.gov.br/values/t/5938/n6/4304606/v/37/p/last%201) |
| PNAD TIC: 93.6% households online; 92% mobile network, 95.3% urban, 65.8% rural | Correct (national) | [IBGE](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102193_informativo.pdf) |
| "88.9% own a mobile phone" | **Misread.** 88.9% is the share of internet households using fixed broadband. Personal phone ownership not located. | same |
| "98.8% of internet users go online by phone" | Correct (people 10+) | same |
| "Canoas likely above average" | Speculation. Removed. | |
| Rivers, geography, dike history (1974, DNOS, named pump houses) | Not in the cited source. Removed [não verificado]. | |

### Flood

| Claim | Finding | Source |
|---|---|---|
| 31 deaths, highest in RS | Correct as of the 14/06/2024 bulletin | [Agência Brasil](https://agenciabrasil.ebc.com.br/geral/noticia/2024-06/numero-de-mortes-por-enchentes-no-rs-aumenta-para-176) |
| ~150,000 affected (~43%) | **Inconsistent.** 150 mil appears in the Ouvidoria report; the Prefeitura says 180 mil. The 43% is the draft's own arithmetic. | [Ouvidoria 2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/RELATORIO-ANUAL-OUVIDORIA-2024-_1_.pdf); [Prefeitura](https://www.canoas.rs.gov.br/recomeco-de-canoas/) |
| 60%+ territory flooded; source INPE | The INPE PDF is maps only, with no figure. Mayor said "cerca de 60%"; Secretário de Obras said ">50%". | [JC](https://www.jornaldocomercio.com/jornal-cidades/2024/05/1153346-prefeito-de-canoas-fala-em-60-dias-para-que-agua-baixe-em-toda-a-cidade.html); [BdF](https://www.brasildefato.com.br/2024/07/09/audiencia-aponta-falhas-e-necessidades-do-sistema-de-protecao-contras-cheias-da-grande-porto-alegre) |
| 2 of 8 pump stations working | Supported only as a mid-May 2024 snapshot. The cited Brasil de Fato article does not say it. | [Sul21](https://sul21.com.br/noticias/geral/2024/05/pioneira-em-criar-escritorio-de-resiliencia-climatica-canoas-falhou-ao-se-preparar-para-enchente/); [JC](https://www.jornaldocomercio.com/jornal-cidades/2024/05/1155199-canoas-tera-40-bombas-para-escoamento-da-agua-no-lado-oeste.html) |
| 180,000+ "displaced"; ~101,000 households | 180 mil is "atingidas", not displaced. The 101,000 figure has no source. Removed. | |
| 11,699–12,000 in shelters "early June" | JC headline says 11,7 mil in May 2024. Removed as stale. | [JC](https://www.jornaldocomercio.com/geral/2024/05/1156628-canoas-ainda-enfrenta-alagamentos-e-tem-117-mil-pessoas-em-abrigos.html) |
| R$ 213.3 million approved (78.7 / 62.3 / 67.9) | Not in the cited article [não verificado]. Removed. R$ 1.5 bi is correct (Secretário de Obras). | BdF 09/07/2024 |
| "7 chronic alagamento bairros" | **Wrong framing.** Seven bairros in one event, 18/06/2025. Cited JC article is a different piece. | [Sul21](https://sul21.com.br/noticias/geral/2025/06/bairros-de-canoas-voltam-a-alagar-com-chuva-acima-do-esperado/) |
| June 2025: 69 mm in 4 h, 89 desalojados, 28 desabrigados | Correct | Sul21; [Timoneiro](https://jornaltimoneiro.com.br/index.php/2025/06/18/chuvas-alagam-lado-oeste-de-canoas-e-aulas-sao-suspensas-na-regiao-89-pessoas-ficaram-desalojadas-e-28-desabrigados/) |
| Left-bank dikes done Dec 2024; right-bank ongoing | **Mixed up.** Rio Branco/Fátima fix concluded 14/12/2024; Mathias Velho still under construction in June 2026. | [Prefeitura](https://www.canoas.rs.gov.br/noticias/prefeitura-de-canoas-conclui-o-fechamento-definitivo-do-dique-rio-branco-fatima/) |
| 6,000 homes pledged, <10% built | No source. Campaign-adjacent. Removed. | |
| Schools reopened Jun–Jul 2024 | Not verified. Removed (not decision-relevant). | |

### Channels and Ouvidoria

| Claim | Finding | Source |
|---|---|---|
| 0800-5101234, hours "likely 24/7", protocol "likely" | Number correct. Hours are Mon–Fri 8h–18h. Protocolos "gerados" per the CAC page. | [CAC](https://www.canoas.rs.gov.br/servicos/central-de-atendimento-ao-cidadao/) |
| "Ouvidoria portal launched in 2024, uptake unknown" | **Wrong.** Decreto 434/2019; management reports since 2019 with volumes and response times. | [Ouvidoria portal](http://sistemas.canoas.rs.gov.br/transparencia/servlet/wmouvidoriamunicipal) |
| Decreto 434/2019 regulates the Ouvidoria | Confirmed via the Ouvidoria's own report; decree text not found online | [Relatório 2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/RELATORIO-ANUAL-OUVIDORIA-2024-_1_.pdf) |
| Ouvidoria URL, e-SIC URL | Both resolve (HTTP 200) | portal; [wmpedido](http://sistemas.canoas.rs.gov.br/transparencia/servlet/wmpedido) |
| Fala.BR "integrated" with standard protocol | Canoas operates through Fala.BR; protocol number + access code issued; anonymous only for denúncias; Canoas deep link 404 today | [CGU wiki](https://wiki.cgu.gov.br/index.php?title=4._Nova_Manifesta%C3%A7%C3%A3o) |
| LAI deadline "20 business days" | **Wrong.** 20 days + 10 | [Lei 12.527 art. 11](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm) |
| "No published volume/response-time statistics" | **Wrong.** See section 3. | |
| Social handle @prefcanoas on four networks | The site header links Instagram @prefcanoas (217K, read), X /prefcanoas, YouTube, and Facebook /PrefeituradeCanoas (not @prefcanoas) | [home](https://www.canoas.rs.gov.br/) |
| 0800 vs app vs WhatsApp (draft: "no app") | Lighting app "Ilumina Canoas" exists; WhatsApp (51) 98255-2777 for dumping | [orientações](https://www.canoas.rs.gov.br/orientacoes-sobre-o-servico-de-iluminacao-publica/); [descarte](https://www.canoas.rs.gov.br/servicos/descarte-irregular-de-residuos/) |

### Secretarias and services

| Claim | Finding | Source |
|---|---|---|
| Tapa-buraco: Serviços e Zeladoria Urbana | **Wrong.** SMOR (Obras e Reconstrução) with subprefeituras | [Prefeitura 02/09/2025](https://www.canoas.rs.gov.br/noticias/acao-de-tapa-buraco-mobiliza-equipes-em-todas-as-regioes-de-canoas/); Decreto 10/2025 |
| Lighting: Secretaria de Obras; TIM PPP | **Wrong on both.** SMSZU; operator is concessionária IP Canoas; TIM is the connectivity partner | Decreto 10/2025; [TeleTime](https://teletime.com.br/22/04/2025/tim-fecha-parceria-para-levar-iluminacao-inteligente-a-canoas/) |
| Lighting "2024 PPP", 30,000+ points, done Jun 2025 | Auction 16/05/2023; 30,667 points; 30,550 swapped by 11/06/2025; completion [não verificado] | [BNDES via M&C](https://mercadoeconsumo.com.br/15/05/2023/noticias/bndes-leilao-de-ppp-para-iluminacao-publica-de-canoas-rs-sera-nesta-3a-feira/); [ABC+](https://www.abcmais.com/brasil/rio-grande-do-sul/vale-do-rio-dos-sinos/canoas/quase-100-das-lampadas-ja-foram-trocadas-por-led-nas-ruas-e-espacos-publicos-de-canoas/) |
| Trânsito "likely Mobilidade or Obras" | SMMU | Decreto 10/2025 |
| Poda "likely Obras or Ambiente" | SMSZU (arborização) with a Meio Ambiente overlap | Decreto 10/2025; CAC page |
| Drenagem: Obras, 8 pump houses, 30 km dikes | Secretaria correct (now SMOR); 8 casas confirmed; 30 km confirmed | BdF 09/07/2024; Sul21 |
| Collection contractor, "60-month contract 2024–2029" | Contractor not found; term not verified. Emergency tender 450/2024 pending Edital 391/2024. | [Edital 450/2024](https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/edital-450-2024.pdf) |
| "DECRETO 10.2025, May 2025", cabinet names | It is Decreto nº 10 of 07/01/2025 (DO 08/01/2025). Names removed. | Decreto 10/2025 |
| GeoCanoas "URL not verified" | https://geo.canoas.rs.gov.br; cited `?p=20839` is the English description page | [GeoCanoas page](https://www.canoas.rs.gov.br/geocanoas-por/) |

### Community, press, other

| Claim | Finding | Source |
|---|---|---|
| "80%+ of flood-affected bairros have WhatsApp groups"; "every bairro has a group" | **No source.** Removed. | |
| UFRGS repository (WhatsApp study) | Link did not respond from this machine; the "80%+" claim it supports has no source anyway. Removed. | |
| União das Associações via Telelistas; CAPS Reviver; Clube de Advogados | Directory listings, off-topic. Replaced by UAMCA page and Consepro. | [UAMCA](https://www.facebook.com/p/UAMCA-Uni%C3%A3o-de-Associa%C3%A7%C3%B5es-de-Moradores-de-Canoas-100067808962201/) |
| Associations source `03_Anexo_III_Detalhamento_TTS` | A housing-regularisation annex; says nothing about associations | [PDF](https://www.canoas.rs.gov.br/wp-content/uploads/2026/01/03_Anexo_III_Detalhamento_TTS_assinado_assinado.pdf) |
| "Poluição em canais às vésperas da quadra chuvosa" (O Povo+) as Canoas press | **Wrong.** It is about Fortaleza, Ceará; the text never mentions Canoas | [O Povo+](https://mais.opovo.com.br/jornal/reportagem/2024/12/19/perigo-anunciadosujeira-toma-canais-as-vesperas-da-quadra-chuvosa.html) |
| Colab: 130+ municipalities, no Canoas presence | Figures unsupported; negative result unproven | [não verificado] |
| Universities (ULBRA, Unilasalle, IFRS) | Padding, no product relevance; cited to Wikipedia and a Canadian university page. Removed. | |
| Election result 52.14/47.86; allegations about the previous mayor; mandate dates | Not needed for the product; allegations unverified. Removed. | |
| "No bairro/quadrante data" and "Facebook groups likely" | Replaced by section 1 and section 6 | |
| BdF protest article, 28/05/2024 (draft link 1) | Dead link; the working article is [this one](https://www.brasildefato.com.br/2024/05/28/protesto-em-frente-a-camara-de-vereadores-de-canoas-rs-cobra-solucao-para-areas-ainda-alagadas/) | |

### Method and limits

- Primary pages fetched directly (canoas.rs.gov.br, the Ouvidoria portal, GeoCanoas REST, IBGE SIDRA API, Planalto, CGU wiki). IBGE's site blocks scripts, so the SIDRA API was used instead.
- Instagram and Facebook follower counts come from the public `og:description` tags on the access date and will drift.
- Facebook groups and WhatsApp groups could not be reached. Correio do Povo was not available to the search tool and was not used.
- The decree text of Decreto 434/2019 and the 2025 Ouvidoria report were not found.
