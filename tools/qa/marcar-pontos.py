#!/usr/bin/env python3
"""Marca pontos medidos sobre a arte de referência, para conferência visual.

Uso: marcar-pontos.py "x,y,nome" "x,y,nome" ... --box=x0,y0,x1,y1 --esc=2.5 --out=/tmp/f.png
Serve para VERIFICAR cada pé/centro antes de gravar coordenadas no mapa: o
ponto aparece como cruz com o nome, então dá para checar se está na base do
objeto e não no meio dele.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

RAIZ = '/home/user/Bloco-404'
ref = Image.open(f'{RAIZ}/assets/source-art/reparo-norte-10/referencia-mestre.png').convert('RGB')

pontos, box, esc, out = [], None, 2.0, '/tmp/pontos.png'
for a in sys.argv[1:]:
    if a.startswith('--box='):
        box = tuple(int(v) for v in a[6:].split(','))
    elif a.startswith('--esc='):
        esc = float(a[6:])
    elif a.startswith('--out='):
        out = a[6:]
    else:
        x, y, nome = a.split(',', 2)
        pontos.append((float(x), float(y), nome))

if box is None:
    xs = [p[0] for p in pontos]
    ys = [p[1] for p in pontos]
    box = (int(min(xs)) - 60, int(min(ys)) - 60, int(max(xs)) + 60, int(max(ys)) + 60)

x0, y0, x1, y1 = box
crop = ref.crop(box)
w, h = int(crop.width * esc), int(crop.height * esc)
crop = crop.resize((w, h), Image.LANCZOS)
M = 20
img = Image.new('RGB', (w + 2 * M, h + 2 * M), (15, 15, 15))
img.paste(crop, (M, M))
d = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
except Exception:
    f = ImageFont.load_default()

for px, py, nome in pontos:
    cx, cy = M + (px - x0) * esc, M + (py - y0) * esc
    d.line([(cx - 11, cy), (cx + 11, cy)], fill=(255, 0, 255), width=2)
    d.line([(cx, cy - 11), (cx, cy + 11)], fill=(255, 0, 255), width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=(255, 255, 0), width=2)
    txt = f'{nome} ({px:.0f},{py:.0f})'
    tw = d.textlength(txt, font=f)
    ty = cy - 20 if cy > y0 * 0 + 30 else cy + 8
    d.rectangle([cx + 6, ty - 2, cx + 12 + tw, ty + 15], fill=(0, 0, 0))
    d.text((cx + 8, ty), txt, fill=(255, 255, 0), font=f)

img.save(out)
print(out, img.size)
