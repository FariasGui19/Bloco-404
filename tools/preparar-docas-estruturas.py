#!/usr/bin/env python3
"""Remove o fundo magenta das 10 artes e cria PNGs otimizados."""
from PIL import Image
from pathlib import Path
p=Path('assets/sprites/docas-reconstrucao')
for original in sorted(p.glob('origem-*.png')):
    im=Image.open(original).convert('RGBA')
    pixels=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=pixels[x,y]
            if r>210 and b>160 and g<85 and r>g*2.4 and b>g*2.0: pixels[x,y]=(0,0,0,0)
    bbox=im.getbbox()
    if not bbox: raise ValueError(f'arte vazia: {original}')
    im=im.crop(bbox);im.thumbnail((512,512),Image.Resampling.LANCZOS)
    im.save(p/(original.stem.removeprefix('origem-')+'.png'),optimize=True)
