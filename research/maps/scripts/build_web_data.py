#!/usr/bin/env python3
"""Build web-ready Canoas geodata (WGS84, 5 decimals) + static SVG.

Run (from anywhere, isolated mode):
    python3 -m venv /tmp/fc/venv && /tmp/fc/venv/bin/pip install shapely pyproj pyshp
    /tmp/fc/venv/bin/python -I research/maps/scripts/build_web_data.py [--flood-gpkg /path/cheias_rhguaiba_2024_db_v12.gpkg] [--crosscheck /path/geocanoas_mancha.geojson]

Inputs  (read straight from the zips, nothing is extracted into data/):
    data/canoas-bairros-ibge-censo2022/RS_bairros_CD2022.zip     IBGE Censo 2022 bairros (SIRGAS 2000)
    data/rs-municipios-ibge-2025-fullres-source/RS_Municipios_2025.zip   IBGE MMD 2025
    optional (flood): UFRGS/Possantti et al. Zenodo GeoPackage (CC BY 4.0), layer analise_ada_inundacao_20240506
    optional (cross-check only): GeoCanoas flood layer saved as GeoJSON (EPSG:4326), see data/web/SOURCE.md
Outputs (data/web/):
    canoas-limite.geojson, canoas-bairros.geojson, canoas-bairros.svg,
    canoas-cheia-2024.geojson (only when --flood-gpkg is given)

Simplification is topology-preserving: shapely.coverage_simplify keeps shared
bairro borders identical (no gaps/overlaps); single polygons use
simplify(preserve_topology=True).
"""
import argparse
import gzip
import io
import json
import os
import sqlite3
import sys
import warnings
import zipfile
from html import escape

warnings.filterwarnings("ignore", category=DeprecationWarning)  # shapely.ops.transform still fine

import shapefile  # pyshp
import shapely
from pyproj import Transformer
from shapely import coverage_is_valid, coverage_simplify
from shapely.geometry import mapping, shape
from shapely.ops import transform, unary_union
from shapely.validation import make_valid

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "data"))
OUT = os.path.join(DATA, "web")
CD_MUN = "4304606"

# Tolerances in metres (applied in EPSG:31982, SIRGAS 2000 / UTM 22S)
TOL_BAIRROS = 6.0
TOL_LIMITE = 8.0
TOL_FLOOD = 20.0  # Sentinel-2 pixels are 10 m; edge uncertainty is of the same order
SLIVER_M2 = 2500.0  # drop flood slivers smaller than 50 x 50 m
TOL_SVG = 12.0
SVG_WIDTH = 1000  # viewBox width in user units

# Display-name overrides. IBGE writes "Ilha das Graças"; the Prefeitura's own
# Plano Municipal de Saude 2022-2025 (Diretoria de Geoprocessamento) writes
# "Ilha das Garças". Keep the IBGE code as the stable id. [confirm with Prefeitura]
NAME_OVERRIDE = {"4304606018": "Ilha das Garças"}

to_utm = Transformer.from_crs("EPSG:4674", "EPSG:31982", always_xy=True).transform
to_utm_from_wgs = Transformer.from_crs("EPSG:4326", "EPSG:31982", always_xy=True).transform
to_wgs = Transformer.from_crs("EPSG:31982", "EPSG:4326", always_xy=True).transform


def read_zip_shp(zip_path, stem):
    with zipfile.ZipFile(zip_path) as z:
        r = shapefile.Reader(
            shp=io.BytesIO(z.read(stem + ".shp")),
            shx=io.BytesIO(z.read(stem + ".shx")),
            dbf=io.BytesIO(z.read(stem + ".dbf")),
            encoding="utf-8",
        )
        return [(sr.record.as_dict(), shape(sr.shape.__geo_interface__)) for sr in r.iterShapeRecords()]


def read_gpkg_layer(path, table, bbox):
    """Geometries of a GeoPackage layer (EPSG:4326) whose R-tree box touches bbox=(minx,miny,maxx,maxy)."""
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    cols = [r[1] for r in con.execute(f'pragma table_info("{table}")')]
    gi = cols.index("geom")
    q = (f'select t.geom from "{table}" t join "rtree_{table}_geom" r on r.id = t.fid '
         "where r.maxx >= ? and r.minx <= ? and r.maxy >= ? and r.miny <= ?")
    out = []
    for (blob,) in con.execute(q, (bbox[0], bbox[2], bbox[1], bbox[3])):
        esz = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(blob[3] >> 1) & 7]  # GPKG header envelope size
        out.append(make_valid(shapely.from_wkb(bytes(blob[8 + esz:]))))
    con.close()
    return out


def round_geom(geom, nd=5):
    """Round coordinates, drop consecutive duplicates; return GeoJSON-like mapping."""

    def rnd_ring(ring):
        out = []
        for x, y in ring:
            p = (round(x, nd), round(y, nd))
            if not out or out[-1] != p:
                out.append(p)
        if out and out[0] != out[-1]:
            out.append(out[0])
        return out

    def rnd_poly(p):
        ext = rnd_ring(p.exterior.coords)
        holes = [rnd_ring(i.coords) for i in p.interiors]
        return [ext] + [h for h in holes if len(h) >= 4]

    if geom.geom_type == "Polygon":
        return {"type": "Polygon", "coordinates": [[list(c) for c in r] for r in rnd_poly(geom)]}
    polys = [[[list(c) for c in r] for r in rnd_poly(p)] for p in geom.geoms]
    return {"type": "MultiPolygon", "coordinates": polys}


def write_geojson(path, features):
    fc = {"type": "FeatureCollection", "features": features}
    txt = json.dumps(fc, ensure_ascii=False, separators=(",", ":"))
    with open(path, "w", encoding="utf-8") as f:
        f.write(txt)
    raw = len(txt.encode("utf-8"))
    gz = len(gzip.compress(txt.encode("utf-8"), 9))
    print(f"  wrote {os.path.relpath(path)}  raw={raw} B  gzip={gz} B")
    return raw, gz


def hausdorff_m(a, b):
    return a.hausdorff_distance(b)  # inputs already in metres


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flood-gpkg", help="cheias_rhguaiba_2024_db_v12.gpkg from Zenodo 10.5281/zenodo.13227745 (CC BY 4.0)")
    ap.add_argument("--crosscheck", help="optional GeoJSON (EPSG:4326) of the GeoCanoas inundação_mancha layer, used only for an IoU check")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    # ---------- bairros ----------
    recs = read_zip_shp(
        os.path.join(DATA, "canoas-bairros-ibge-censo2022", "RS_bairros_CD2022.zip"), "RS_bairros_CD2022"
    )
    can = sorted([(d, g) for d, g in recs if d["CD_MUN"] == CD_MUN], key=lambda x: x[0]["CD_BAIRRO"])
    assert len(can) == 18, len(can)
    ids = [d["CD_BAIRRO"] for d, _ in can]
    names = [NAME_OVERRIDE.get(d["CD_BAIRRO"], d["NM_BAIRRO"]) for d, _ in can]
    utm = [transform(to_utm, g) for _, g in can]
    assert all(g.is_valid for g in utm)
    print("coverage valid (source):", coverage_is_valid(utm).all() if hasattr(coverage_is_valid(utm), "all") else coverage_is_valid(utm))

    simp = list(coverage_simplify(utm, TOL_BAIRROS))
    feats = []
    for cd, nm, g in zip(ids, names, simp):
        gw = transform(to_wgs, g)
        feats.append(
            {"type": "Feature", "properties": {"id": cd, "name": nm}, "geometry": round_geom(gw, 5)}
        )
    write_geojson(os.path.join(OUT, "canoas-bairros.geojson"), feats)

    # QA on the rounded output
    chk = [transform(to_utm_from_wgs, shape(f["geometry"])) for f in feats]
    print("  output valid:", all(g.is_valid for g in chk), "| vertices:",
          sum(len(p.exterior.coords) + sum(len(i.coords) for i in p.interiors)
              for g in chk for p in (g.geoms if g.geom_type == "MultiPolygon" else [g])))
    worst = max(hausdorff_m(a, b) for a, b in zip(utm, chk))
    print(f"  max Hausdorff vs source: {worst:.1f} m")
    area_src = sum(g.area for g in utm)
    area_out = sum(g.area for g in chk)
    print(f"  total area source={area_src/1e6:.3f} km2 output={area_out/1e6:.3f} km2 ({(area_out/area_src-1)*100:+.3f}%)")
    ov = 0.0
    for i in range(len(chk)):
        for j in range(i + 1, len(chk)):
            ov += chk[i].intersection(chk[j]).area
    print(f"  overlap between bairros: {ov:.1f} m2")
    gaps = unary_union(chk)
    print("  union type:", gaps.geom_type, "| interior holes (gaps):",
          sum(len(p.interiors) for p in (gaps.geoms if gaps.geom_type == 'MultiPolygon' else [gaps])))

    # ---------- limite (official MMD 2025) ----------
    muni = read_zip_shp(
        os.path.join(DATA, "rs-municipios-ibge-2025-fullres-source", "RS_Municipios_2025.zip"), "RS_Municipios_2025"
    )
    mg = [g for d, g in muni if d["CD_MUN"] == CD_MUN][0]
    mg_utm = transform(to_utm, mg)
    lim = mg_utm.simplify(TOL_LIMITE, preserve_topology=True)
    lim_w = transform(to_wgs, lim)
    write_geojson(
        os.path.join(OUT, "canoas-limite.geojson"),
        [{"type": "Feature", "properties": {"id": CD_MUN, "name": "Canoas"}, "geometry": round_geom(lim_w, 5)}],
    )
    lim_chk = transform(to_utm_from_wgs, shape(json.load(open(os.path.join(OUT, "canoas-limite.geojson")))["features"][0]["geometry"]))
    print(f"  limite valid={lim_chk.is_valid} Hausdorff vs MMD2025={hausdorff_m(mg_utm, lim_chk):.1f} m area={lim_chk.area/1e6:.2f} km2 (IBGE AREA_KM2 = 130.774)")
    uni = unary_union(utm)
    print(f"  bairros(2022) vs municipio(2025): Hausdorff={hausdorff_m(uni, mg_utm):.1f} m | muni-not-in-bairros={mg_utm.difference(uni).area:.0f} m2 | bairros-outside-muni={uni.difference(mg_utm).area:.0f} m2")

    # ---------- SVG ----------
    svg_geoms = list(coverage_simplify(utm, TOL_SVG))
    minx, miny, maxx, maxy = unary_union(svg_geoms).bounds
    s = SVG_WIDTH / (maxx - minx)
    H = round((maxy - miny) * s)

    def pt(x, y):
        return (round((x - minx) * s, 1), round((maxy - y) * s, 1))

    def ring_d(coords):
        pts = [pt(x, y) for x, y in coords][:-1]
        # drop consecutive duplicates after rounding
        clean = [pts[0]]
        for p in pts[1:]:
            if p != clean[-1]:
                clean.append(p)
        if len(clean) < 3:
            return ""
        d = f"M{clean[0][0]:g} {clean[0][1]:g}"
        px, py = clean[0]
        rel = []
        for x, y in clean[1:]:
            rel.append(f"{round(x - px, 1):g} {round(y - py, 1):g}")
            px, py = x, y
        return d + "l" + " ".join(rel).replace(" -", "-") + "z"

    paths = []
    for cd, nm, g in zip(ids, names, svg_geoms):
        polys = g.geoms if g.geom_type == "MultiPolygon" else [g]
        d = "".join(ring_d(p.exterior.coords) + "".join(ring_d(i.coords) for i in p.interiors) for p in polys)
        paths.append(f'<path id="b-{cd}" data-name="{escape(nm, quote=True)}" d="{d}"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SVG_WIDTH} {H}" '
        f'fill="transparent" stroke="currentColor" stroke-width="1" stroke-linejoin="round">\n'
        + "\n".join(paths)
        + "\n</svg>\n"
    )
    p = os.path.join(OUT, "canoas-bairros.svg")
    open(p, "w", encoding="utf-8").write(svg)
    print(f"  wrote {os.path.relpath(p)}  raw={len(svg.encode())} B  gzip={len(gzip.compress(svg.encode(), 9))} B  viewBox 0 0 {SVG_WIDTH} {H}  (EPSG:31982, north up)")

    # ---------- flood ----------
    if args.flood_gpkg:
        from shapely.geometry import MultiPolygon

        polys = read_gpkg_layer(args.flood_gpkg, "analise_ada_inundacao_20240506", mg.bounds)
        fl_w = unary_union(polys).intersection(mg)  # mg is in lon/lat (SIRGAS ~ WGS84)
        fl = transform(to_utm_from_wgs, fl_w)
        clipped = fl.buffer(0)
        simp_fl = clipped.simplify(TOL_FLOOD, preserve_topology=True)
        parts = [q for q in (simp_fl.geoms if simp_fl.geom_type == "MultiPolygon" else [simp_fl]) if q.area >= SLIVER_M2]
        simp_fl = MultiPolygon(parts)
        out_w = transform(to_wgs, simp_fl)
        write_geojson(
            os.path.join(OUT, "canoas-cheia-2024.geojson"),
            [{
                "type": "Feature",
                "properties": {"data": "2024-05-06/08", "fonte": "UFRGS, Possantti et al. 2024 (CC BY 4.0)"},
                "geometry": round_geom(out_w, 5),
            }],
        )
        print(f"  flood in Canoas: clipped {clipped.area/1e6:.2f} km2 -> output {simp_fl.area/1e6:.2f} km2 | {clipped.area/mg_utm.area*100:.1f}% of municipality | features in bbox: {len(polys)}")
        if args.crosscheck:
            gc = unary_union([make_valid(shape(f["geometry"])) for f in json.load(open(args.crosscheck, encoding="utf-8"))["features"]]).intersection(mg)
            gcu = transform(to_utm_from_wgs, gc)
            print(f"  cross-check vs GeoCanoas: GeoCanoas {gcu.area/1e6:.2f} km2, IoU {simp_fl.intersection(gcu).area / simp_fl.union(gcu).area:.3f}")
        print("  per bairro (share flooded):")
        for cd, nm, g in zip(ids, names, utm):
            a = g.intersection(simp_fl).area
            print(f"    {cd} {nm:28s} {a/1e6:6.2f} km2  {a/g.area*100:5.1f}%")

if __name__ == "__main__":
    sys.exit(main())
