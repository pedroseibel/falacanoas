# Web-ready outputs (derived files)

All files are WGS84 lon/lat (EPSG:4326; the IBGE inputs are SIRGAS 2000, the difference is below ~1 m), coordinates rounded to 5 decimals (≈ 1 m), built on 2026-10-12 by `research/maps/scripts/build_web_data.py` (shapely 2.2, pyproj 3.8, pyshp 3.1; Python 3.14 venv under /tmp). Re-run:

```bash
python3 -m venv /tmp/fc/venv && /tmp/fc/venv/bin/pip install shapely pyproj pyshp
/tmp/fc/venv/bin/python -I research/maps/scripts/build_web_data.py \
  --flood-gpkg /path/to/cheias_rhguaiba_2024_db_v12.gpkg      # optional, 196 MB, see canoas-cheia-2024 below
```

| File | Derived from | Method | Raw / gzip | Licence |
|---|---|---|---|---|
| `canoas-bairros.geojson` | IBGE Censo 2022 bairros (`../canoas-bairros-ibge-censo2022/`) | 18 Canoas features; `shapely.coverage_simplify` at 6 m in EPSG:31982 (keeps shared borders identical); rounded to 5 decimals; properties reduced to `id` (IBGE `CD_BAIRRO`, string) and `name` | 36 419 B / 7 106 B | IBGE terms **[não verificado]**; credit "Fonte: IBGE, Censo 2022" |
| `canoas-limite.geojson` | IBGE Malha Municipal 2025 (`../rs-municipios-ibge-2025-fullres-source/`) | Canoas feature (`CD_MUN 4304606`); `simplify(8 m, preserve_topology)`; 5 decimals; properties `id`, `name` | 3 522 B / 1 062 B | IBGE terms **[não verificado]**; credit "Fonte: IBGE, Malha Municipal 2025" |
| `canoas-bairros.svg` | same as `canoas-bairros.geojson` | projected to EPSG:31982 (SIRGAS 2000 / UTM 22S), north up; `coverage_simplify` 12 m; viewBox `0 0 1000 898`; one `<path id="b-<CD_BAIRRO>" data-name="<nome>">` per bairro; relative path commands, 1 decimal; root carries only `fill="transparent" stroke="currentColor" stroke-width="1"` so it is outline-only standalone and clickable/stylable by CSS | 10 784 B / 4 402 B | as bairros |
| `canoas-cheia-2024.geojson` | UFRGS flood database (see below) | layer `analise_ada_inundacao_20240506` (26 polygons touching the Canoas bbox), unioned, clipped to the 2025 municipal boundary, `simplify(20 m)`, slivers < 2 500 m² dropped, 5 decimals; one MultiPolygon (3 parts), 63.15 km² (48.3 % of the municipality) | 15 900 B / 3 151 B | **CC BY 4.0**, credit "Possantti et al. (2024), UFRGS, doi:10.5281/zenodo.13227745" |

Total of the three GeoJSON files: 55 841 B raw, about 11.3 KB gzip. The SVG alone is the only map asset a landing page needs.

## QA numbers (2026-10-12)

- Bairros: 18 features, all valid, no overlaps (0 m²), no gaps (union is one polygon without holes), 1 572 vertices (source: 2 111), max Hausdorff distance to the source 2.5 m, total area change +0.002 %.
- Limite: valid, Hausdorff 7.7 m to the 2025 shapefile, 130.67 km² (IBGE `AREA_KM2` 130.774).
- Bairros (Censo 2022) versus municipal boundary (MMD 2025): they are different vintages; maximum separation 66 m, 0.036 km² of the municipality not covered by bairros and 0.050 km² of bairros outside it. Invisible at landing-page scale, visible only at street zoom.
- Flood: IoU 0.9945 against the unsimplified clipped source; IoU 0.907 against the independent GeoCanoas layer (63.80 km²).

## Display-name override

IBGE spells bairro `4304606018` as "Ilha das Graças". The Prefeitura spells it "Ilha das Garças" in its Plano Municipal de Saúde 2022-2025 and in four public GeoCanoas layers (`Populacao_e_domicilios_por_bairros`, `COVID_BAIRROS`, `Bairro_Regiao_CISP_Centroide`, `crime_bairro`); only GeoCanoas' `Dissolve_bairro_censo22`, a copy of the IBGE Censo 2022 names, keeps "Graças". The web files therefore use "Ilha das Garças" in `name` and keep the IBGE code as the id. Still **confirm with the Prefeitura / the bairro law** before launch. The other 17 names are identical to IBGE's and to the GeoCanoas layers ("São Luís" in every GeoCanoas layer; "São Luiz" appears once in the Plano de Saúde).

## Flood source details

- **Dataset:** Possantti, I. et al. (2024). *Banco de dados das cheias na Região Hidrográfica do Lago Guaíba em Maio de 2024*, v1.2 (2024-08-05), Zenodo, https://doi.org/10.5281/zenodo.13227745 (concept DOI 10.5281/zenodo.11164049). Licence CC BY 4.0 (from the Zenodo record metadata). File `cheias_rhguaiba_2024_db_v12.gpkg`, 196 124 672 B, md5 `620afc4afef02d7e4eed567075876299` (matches the Zenodo checksum). Not stored in the repo (too large); download it only to rebuild.
- **Layer:** `analise_ada_inundacao_20240506`, described in the record's glossary as the "área diretamente afetada (ADA)" on 06/05/2024 and 08/05/2024 derived from water and mud flood extents observed by remote sensing. It is a mapped footprint of the event, not a hazard or depth model, and it does not say which parts flooded on which day. Edges are ~10 m resolution (Sentinel-2) class.
- **Cross-check (not redistributed):** GeoCanoas, the Prefeitura's own ArcGIS feature service `inundação_mancha` ("baseada na imagem de satélite Sentinel 2A de 06 de maio de 2024"), https://geo.canoas.rs.gov.br/server/rest/services/inundação_mancha/FeatureServer/0 (3 polygons, queryable as GeoJSON with `outSR=4326`). It agrees with the UFRGS layer (63.80 vs 63.16 km², IoU 0.907). It declares **no licence or copyright text**, so it was used only for validation, not shipped.
- **Per-bairro share of area inside the flood footprint** (computed from the shipped file; the IBGE bairro polygons are statistical areas, so read these as approximate): Harmonia 100 %, Mathias Velho 99.7 %, São Luís 95.8 %, Rio Branco 95.6 %, Mato Grande 92.8 %, Industrial 86.5 %, Fátima 77.3 %, Ilha das Garças 73.2 %, Niterói 29.9 %, Centro 21.8 %, Nossa Senhora das Graças 10.8 %; Brigadeira, Estância Velha, Guajuviras, Igara, Marechal Rondon, Olaria and São José 0 %.
- **Other candidates found, not used:** Copernicus EMS EMSR720 (no AOI touches Canoas), INPE/International Charter vectors (Pleiades Canoas airport 2024-05-07, SEPLAG-RS consolidated 2024-05-23; hosted at https://data.inpe.br/charter/data/Call_1003_Brazil_RS/Vectors/, 18-37 MB shapefiles, licence not stated), INPE "Mapa de Inundações e Movimentos de Massa V3.0" (WMS only, layer list not exposed).
