# Canoas municipal boundary (IBGE API, coarse)

- **File:** `canoas-malha-maxima.geojson` (2 245 B, 1 polygon, 96 vertices, 4-decimal coordinates, property `codarea = 4304606`, no `crs` member)
- **Source URL:** https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4304606?formato=application/vnd.geo+json&qualidade=maxima
- **Publisher:** IBGE, API de Malhas Geográficas v3. On 2026-10-12 the same URL returned a file with identical geometry (checked programmatically).
- **Obtained:** 2026-10-11 (local copy).
- **Licence:** **[não verificado]** (same IBGE terms issue as the other IBGE folders; the earlier draft's "CC0" was not verified).
- **CRS:** not declared in the file; IBGE's API serves SIRGAS 2000 (≈ WGS84). Treat as lon/lat.
- **Quality caveat:** despite the `qualidade=maxima` parameter this is a heavily generalised outline. It deviates up to ~73 m from the full-resolution 2025 boundary in `../rs-municipios-ibge-2025-fullres-source/` and is not suitable for any overlay at street zoom. Prefer `../web/canoas-limite.geojson` (derived from the 2025 shapefile).
