# IBGE Censo 2022 – bairros do Rio Grande do Sul

- **File:** `RS_bairros_CD2022.zip` (1 614 411 B, sha256 `8585dd063083d6a5a0949d8e307335098a1683e70b11277d2b2462e507ee572d`)
- **Source URL:** https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/RS_bairros_CD2022.zip
- **Publisher:** IBGE (Instituto Brasileiro de Geografia e Estatística), Censo Demográfico 2022, "Bairros" (divisões intramunicipais). Server `Last-Modified`: 2024-11-12; files inside the zip are dated 2024-11-08.
- **Obtained:** 2026-10-11 (local copy). On 2026-10-12 the live URL was re-downloaded and the sha256 above matched.
- **Licence:** **[não verificado]**. The zip contains no licence file and ibge.gov.br refused automated access (HTTP 403), so the terms could not be read. The earlier draft's "CC0" was never verified and should not be relied on. Safe minimum: credit "Fonte: IBGE, Censo Demográfico 2022" and read IBGE's Nota Metodológica ("Informações técnicas e legais para a utilização dos dados publicados") before public launch.
- **CRS:** SIRGAS 2000 geographic, EPSG:4674 (from the `.prj`; the earlier draft said WGS84). The difference to WGS84 is below ~1 m, so the web outputs treat the coordinates as WGS84 lon/lat.
- **Format:** ESRI Shapefile, polygons, UTF-8 (`.cpg`), 2 240 features for the whole state, fields `CD_REGIAO NM_REGIAO CD_UF NM_UF CD_MUN NM_MUN CD_DIST NM_DIST CD_SUBDIST NM_SUBDIST CD_BAIRRO NM_BAIRRO CD_RGINT NM_RGINT CD_RGI NM_RGI CD_CONCURB NM_CONCURB`.
- **Canoas subset:** `CD_MUN = 4304606` → 18 bairros (codes `4304606001` … `4304606018`), all valid polygons, no overlaps, no gaps between them.
- **Notes:** the zip is kept as the untouched source. Do not extract into this folder; the build script `research/maps/scripts/build_web_data.py` reads it directly. Two names differ from the Prefeitura's own documents, see `../web/SOURCE.md`.
