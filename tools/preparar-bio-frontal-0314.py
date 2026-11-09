#!/usr/bin/env python3
"""Extrai a primeira sequência frontal da folha gerada (Pillow necessário)."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
source = Image.open(root/'assets/source-art/bio-caminhada-frente-0314.png').convert('RGB')
if source.size != (896, 1195): raise ValueError('Formato alterado; conferir a folha')
out = Image.new('RGBA', (224*4, 512))
for col in range(4):
    crop = source.crop((col*224, 0, (col+1)*224, 597)).convert('RGBA')
    px = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r,g,b,a = px[x,y]
            if r>150 and b>140 and r>g*1.5 and b>g*1.35: px[x,y] = (0,0,0,0)
    # Neutraliza contaminação magenta nas franjas antialias, somente em
    # pixels vizinhos ao fundo: o traje não contém magenta.
    snapshot = crop.copy().load()
    for y in range(1, crop.height-1):
        for x in range(1, crop.width-1):
            r,g,b,a = snapshot[x,y]
            if not a or r <= g+18 or b <= g+18: continue
            if any(snapshot[x+dx,y+dy][3] == 0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):
                px[x,y] = (g,g,g,a)
    box = crop.getchannel('A').getbbox()
    if not box or box[0] == 0 or box[2] == crop.width or not 450 <= box[3]-box[1] <= 480:
        raise ValueError(f'Quadro {col} cortado ou fora da escala: {box}')
    fig = crop.crop(box)
    out.alpha_composite(fig, (col*224+(224-fig.width)//2, 502-fig.height))
out.save(root/'assets/sprites/player/bio-frente-andar-0314.png', optimize=True)
