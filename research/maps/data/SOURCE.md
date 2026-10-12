# Loose file in `data/`

## `canoas-bairros-simplified.geojson`

- **What it is:** the 18 Canoas features of `canoas-bairros-ibge-censo2022/RS_bairros_CD2022.zip` converted to GeoJSON, **with no simplification at all**. Checked on 2026-10-12 against the shapefile: same 18 `CD_BAIRRO` codes, same 2 111 vertices, Hausdorff distance 0 m, area ratio 1.0000 for every feature. The file name is therefore misleading.
- **Differences from the shapefile:** none in geometry; coordinates carry 14–15 decimals (≈ 99.9 KB raw, ≈ 19.7 KB gzip); each feature keeps all 18 IBGE attribute columns (`CD_REGIAO … NM_CONCURB`), most of them constant noise for a web map; no `crs` member (coordinates are SIRGAS 2000 ≈ WGS84).
- **Source URL / licence / date:** as in `canoas-bairros-ibge-censo2022/SOURCE.md` (IBGE Censo 2022; licence **[não verificado]**; file written 2026-10-11).
- **Status:** superseded by `web/canoas-bairros.geojson` (5 decimals, 6 m topology-preserving simplification, properties `id` and `name` only, 36 KB). Keep this file only as an intermediate; do not ship it to the browser.
