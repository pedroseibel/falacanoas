# IBGE Malha Municipal 2025 – Rio Grande do Sul (full resolution)

- **File:** `RS_Municipios_2025.zip` (10 139 778 B, sha256 `d70d47ccd1c2722e78a6dcc7fa4a00715679684785aa137ed2bf11999de28513`)
- **Source URL:** https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/RS/RS_Municipios_2025.zip
- **Publisher:** IBGE, Malha Municipal Digital (MMD) 2025. Server `Last-Modified`: 2026-02-26 (files inside dated 2026-02-03).
- **Obtained:** 2026-10-11 (local copy). On 2026-10-12 the live URL was re-downloaded and the sha256 above matched.
- **Licence:** **[não verificado]**. The zip carries a `LEIA-ME.txt` saying that using any MMD file means accepting the conditions of IBGE's Nota Metodológica ("Informações técnicas e legais para a utilização dos dados publicados", version 2025, https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html). ibge.gov.br refused automated access (HTTP 403), so that note could not be read. No CC0 claim can be supported.
- **CRS:** SIRGAS 2000 geographic, EPSG:4674 (from `.prj`, `.qmd`).
- **Format:** ESRI Shapefile, polygons; fields `CD_MUN NM_MUN CD_RGI NM_RGI CD_RGINT NM_RGINT CD_UF NM_UF SIGLA_UF CD_REGIAO NM_REGIAO SIGLA_RG CD_CONCURB NM_CONCURB AREA_KM2`.
- **Canoas feature:** `CD_MUN = 4304606`, `AREA_KM2 = 130.774`, one polygon with 498 vertices.
- **Notes:** this is the best municipal outline in the repo. It is used for `data/web/canoas-limite.geojson`. Keep the zip untouched; do not extract it here.
