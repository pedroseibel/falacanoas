# usage: python3 -I sheet.py OUT.png A.svg|Icons.tsx [B.svg ...] -- renders rows per set: 96 px, then 24/16/14 px scaled x4 (nearest), on light and dark
import re, sys, subprocess, pathlib, tempfile
out, files = sys.argv[1], sys.argv[2:]
ORDER = ["c-buraco","c-alaga","c-bocalobo","c-lixo","c-entulho","c-poste","c-arvore","c-calcada","c-esgoto","c-sinal","c-questao","i-clock"]
def symbols(f):
    s = pathlib.Path(f).read_text()
    if f.endswith(".tsx"):
        s = s[s.index("const SYMBOLS = `")+17:]; s = s[:s.index("`;")]
    return {n: (vb, body) for n, vb, body in re.findall(r'<symbol id="([a-z]-[a-z]+)" viewBox="([^"]+)">(.*?)</symbol>', s, re.S)}
tmp = pathlib.Path(tempfile.mkdtemp())
rows = []
for fi, f in enumerate(files):
    syms = symbols(f)
    for theme, fg, bg in (("light", "#0E0F10", "#FAFAFA"), ("dark", "#F3F3F4", "#0A0A0B")):
        tiles = []
        for n in ORDER:
            if n not in syms: continue
            vb, body = syms[n]
            svg = tmp / f"{fi}-{n}.svg"
            svg.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="24" height="24" fill="{fg}" color="{fg}">{body.replace("currentColor", fg)}</svg>')
            parts = []
            big = tmp / f"{fi}-{n}-{theme}-big.png"
            subprocess.run(["magick", "-background", bg, "-density", "400", str(svg), "-resize", "96x96", "-gravity", "center", "-extent", "112x112", str(big)], check=True)
            parts.append(str(big))
            for px in (24, 16, 14):
                p = tmp / f"{fi}-{n}-{theme}-{px}.png"
                subprocess.run(["magick", "-background", bg, "-density", str(72 * px / 24 * 4), str(svg), "-resize", f"{px}x{px}", "-filter", "point", "-scale", "400%", "-gravity", "center", "-background", bg, "-extent", "112x112", str(p)], check=True)
                parts.append(str(p))
            col = tmp / f"{fi}-{n}-{theme}-col.png"
            subprocess.run(["magick", *parts, "-append", str(col)], check=True)
            tiles.append(str(col))
        row = tmp / f"row-{fi}-{theme}.png"
        subprocess.run(["magick", *tiles, "-background", bg, "+append", "-bordercolor", bg, "-border", "8", str(row)], check=True)
        rows.append(str(row))
subprocess.run(["magick", *rows, "-append", out], check=True)
print(out)
