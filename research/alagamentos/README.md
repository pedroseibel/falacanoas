# Rain flooding (alagamento) in Canoas: data, methods, and what to build

Research brief, 2026-10-26. Three passes: Canoas's data sources, methods and precedents, and the local context and partners. "[não verificado]" means not confirmed from a primary source.

The founder's framing: flooding in Canoas is mostly pluvial (rain and drainage); the 2024 river flood was unprecedented.

## What makes Canoas different

- **Polders.** The low west and east sides are ringed by dikes. Rain inside them reaches the storm drains (bocas de lobo), then the internal ditches (valas), and only the pump stations (casas de bombas) lift it out over the dike. When the river is high, the flap gates close and the pumps lift against it.
- **Many causes behind one symptom.** A street that "floods every rain" can be a blocked drain, a full vala, a stopped pump or a high river. That is the PLAMSAB (2012) diagnosis, and residents' letters in 2025 and 2026 say the same.
- **Terrain alone misleads here.** Terrain-only methods (HAND, TWI, depression screening) ignore pipes and pumps. In a flat, pumped city they mislead (Copenhagen 2011 is the cautionary case).

## Data that exists

| Source | What | Access | Note |
|---|---|---|---|
| GeoCanoas, `Hosted/TOPOGRAFICO_CANOAS` | 1 m contours (8,349 lines) and 42,301 spot heights, whole municipality | Public ArcGIS REST, no token | Survey date and vertical datum unknown. No licence stated. |
| GeoCanoas, `Boca_de_Lobo` | 11,038 storm-drain inlets (points, no attributes) | Public REST | Inlet density per street. |
| GeoCanoas, `cadastro_pluvial` | The stormwater pipe network and manholes | Token required | Request from SMOR. |
| GeoCanoas, `Hosted/GISADMIN_casas_bomba_2026` | 10 pump stations with status (edited 2026-10-14: 1–8 "Paralisado", 9–10 "Contratado") | Public REST | Meaning of "Paralisado" [não verificado]. Pump operation was contracted to Elmo Eletro Montagem on 18/05/2026. |
| GeoCanoas, `Defesa_civil` | 3 official "alagável" polygons, the 5 Cemaden gauges, 2 weather stations | Public REST | Too few polygons to learn from. |
| GeoCanoas, polders, dikes, canals, hydrography | 4 polders, 20 dike segments with crest heights, 177 canals, 156 artificial drains | Public REST | Context. |
| Cemaden automatic rain gauges in Canoas | 5 gauges: Rio Branco 7324, Mathias Velho 7325, Estância Velha 7326, São Luís 7327, Marechal Rondon 7328 | Live: undocumented JSON (`resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=RS`), accumulations over 1–96 h, every 5–10 min. History: PED (`ped.cemaden.gov.br`), login and approved request. | No archive of the live feed: what isn't logged now is lost. Mathias Velho was off from 2024-05-04 for a while. |
| Defesa Civil de Canoas station network | 18 stations, rain per minute and per hour | No public feed | Request. |
| State 2.5 m terrain model (RF1 base, 2018 aerial survey; SPGG/Deplan) | Street-scale terrain | Request | The UFRGS altimetry map (Zenodo 10.5281/zenodo.11435276) cites it. |
| State and federal LiDAR (Sema 2025 tender; MIDR/SNSH) | LiDAR terrain and surface | Not published yet | Best future source. |
| Global models (Copernicus, FABDEM, ANADEM, 30 m) | | Free | Too coarse and noisy for a floodplain under 10 m. |
| OpenStreetMap | about 480 waterways, 113 culverts, the pump stations | ODbL | No pipe network. |
| Past events | | | No open dataset: no Defesa Civil occurrences, no Ouvidoria, only the press. The 2012 PLAMSAB lists chronic streets per quadrante (Relatório 8, Tabela 4.12), now 14 years old. |

**Rain amounts seen in events:**
- 23/05/2024: about 90 mm in a few hours.
- 17–18/06/2025: 69 mm in about 4 h, the west side hit hardest, 89 desalojados.
- 28/07/2026: 55 mm in 24 h, temporary flooding.

These are too few for a defensible threshold.

**A possible exposure found in passing.** The public layer `pontos_vistoria` has NOME, CPF and TELEFONE fields; values not pulled. Tell the Prefeitura [não verificado].

## Methods, from what we can do to what we can't

1. **Observed and descriptive (now).**
   - Per street: distinct rain days with reports, first and last dates, neighbour confirmations.
   - Each event joined to the nearest gauge's rain (24 h total, peak hourly), naming the gauge and its distance.
   - Verifiable, and no claims about cause or future risk. NYC's 311 and FloodNet work and São Paulo's CGE point lists sit here.
2. **Context layers (with the Prefeitura's permission).** Inlet density, the pump station serving each polder and its status, the official "alagável" areas.
3. **Terrain screening (internal only, later).** Depression screening over a 5 m surface from the 1 m contours and spot heights, or the 2.5 m state model or LiDAR when obtained.
   - Use it to check whether reports cluster in low spots, never to publish risk.
   - HAND and TWI are built for river valleys: no.
4. **Statistical (much later, with a partner).** Logistic or Poisson models of reports against rain intensity, terrain, inlets and pump status.
   - Needs hundreds of events across 10–20 storms, correction for who reports (normalise by app reach), spatial cross-validation, and an independent check.
   - It models reporting before flooding.
5. **2D hydrodynamic models: not for this project.** They need the pipe network with inverts, pumps, calibration and a hydraulic engineer. That is the Prefeitura's and the university's work.

**Heuristics for when each step becomes meaningful** (judgement, not from a source):
- A per-street rain "threshold": 5–10 events on 3 or more rain days, with a gauge within a few km.
- Bairro comparisons: 30 or more reports across several storms, normalised.
- A model: hundreds of events.

## Rules for publishing

- **Observed and modelled never share a layer** or a colour scale. Modelled is labelled "estimativa, não é mapa de risco oficial".
- **No risk vocabulary.** Never "zona de risco", "área de risco" or "segura".
- **"Sem relatos não é sem alagamento."**
- **Streets and segments, not lots or addresses.** The map becomes a property-value signal (caselaw and studies in the methods brief); keep a correction path.
- **Not our role.** Risk mapping is municipal, with SGB's setorização and Defesa Civil (Lei 12.608/2012 art. 8). Fala links to them and never issues alerts.

## Emergency numbers (affects the app now)

- **199:** the Prefeitura's emergency page lists it as the Polícia Civil, not the Defesa Civil. The app's report form says "Defesa Civil 199".
- **Defesa Civil de Canoas, 24 h:** (51) 98255-0805, phone or WhatsApp. Also 190 and 193.
- **Alerts:** SMS **40199** with the CEP (free). Cell Broadcast for severe alerts.
- **To confirm:** 199 with the Secretaria de Defesa Civil e Resiliência Climática.

## Partners

1. **IPH/UFRGS.**
   - The strongest technical fit: Collischonn, Goldenfum, Possanti's 2024 map repository, and the drainage-plan lineage from Tucci.
   - No IPH study of pluvial flooding in Canoas was found.
   - A plausible co-author of a method for citizen reports.
2. **Cemaden, and FGV's "Dados à Prova D'Água".** The closest prior art: school rain gauges plus a flood-report app. The gauges are already Canoas's rain source.
3. **Defesa Civil and Eclima (Canoas).** Rain and river data, pump status, the 199 question. Partnering requires the same neutrality the product keeps.
4. **Residents' committees.** Comitê Unitário dos Seis Bairros and SOS Bairro, already campaigning on drains and pumps.

## Sources

Full briefs with URLs were produced by the three research passes (this session's transcript). Key primary sources:
- GeoCanoas REST (`geo.canoas.rs.gov.br/server/rest/services`).
- Cemaden live feed and PED.
- PLAMSAB Relatório 8 (2012).
- Prefeitura emergency page and the mutirão news (11/08/2026).
- JC, 18/05/2026 (pump operator).
- Governo RS, Prepara RS (jun/2026).
- Lei 12.608/2012.
- NYC FloodNet and 311 studies (NOAA repository).
- PetaBencana; the Danish Road Directorate's Blue Spot reports; NHESS 23 (2023), Dallas and Waze.
