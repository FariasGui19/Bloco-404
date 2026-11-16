#!/usr/bin/env python3
"""Recorta uma região da arte de referência com grade fina rotulada.

Uso: grid-ref.py x0 y0 x1 y1 escala saida.png [passo]
Serve para LER coordenadas exatas do pôster antes de posicionar props.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

x0, y0, x1, y1 = (int(v) for v in sys.argv[1:5])
esc = float(sys.argv[5])
out = sys.argv[6]
pas = int(sys.argv[7]) if len(sys.argv) > 7 else 20
MARGEM = 34

ref = Image.open('assets/source-art/reparo-norte-10/referencia-mestre.png').convert('RGB')
crop = ref.crop((x0, y0, x1, y1))
w, h = int(crop.width * esc), int(crop.height * esc)
crop = crop.resize((w, h), Image.LANCZOS)

img = Image.new('RGB', (w + MARGEM, h + MARGEM), (20, 20, 20))
img.paste(crop, (MARGEM, MARGEM))
d = ImageDraw.Draw(img, 'RGBA')
try:
    fonte = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
except Exception:
    fonte = ImageFont.load_default()

for gx in range(x0 - x0 % pas, x1 + 1, pas):
    px = MARGEM + (gx - x0) * esc
    forte = gx % (pas * 5) == 0
    d.line([(px, MARGEM), (px, MARGEM + h)], fill=(255, 0, 255, 140 if forte else 55), width=1)
    if forte:
        d.text((px + 2, 4), str(gx), fill=(255, 255, 0), font=fonte)
        d.text((px + 2, MARGEM + h + 6), str(gx), fill=(255, 255, 0), font=fonte)
for gy in range(y0 - y0 % pas, y1 + 1, pas):
    py = MARGEM + (gy - y0) * esc
    forte = gy % (pas * 5) == 0
    d.line([(MARGEM, py), (MARGEM + w, py)], fill=(255, 0, 255, 140 if forte else 55), width=1)
    if forte:
        d.text((2, py + 1), str(gy), fill=(255, 255, 0), font=fonte)
img.save(out)
print(out, img.size)
