#!/usr/bin/env python3
"""Recorta dez peças do lote 11 para a costa e vila das Docas (Pillow)."""
from pathlib import Path
from collections import deque
from PIL import Image
P=Path('assets/sprites/docas-lote11')
for original in sorted(P.glob('origem-*.png')):
    im=Image.open(original).convert('RGBA'); pix=im.load(); w,h=im.size
    seen=bytearray(w*h); queue=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
    while queue:
        x,y=queue.popleft(); idx=y*w+x
        if seen[idx]:continue
        seen[idx]=1
        r,g,b,a=pix[x,y]
        if not (g>140 and g>r*1.8 and g>b*1.7):continue
        pix[x,y]=(0,0,0,0)
        if x:queue.append((x-1,y))
        if x+1<w:queue.append((x+1,y))
        if y:queue.append((x,y-1))
        if y+1<h:queue.append((x,y+1))
    for y in range(h):
        for x in range(w):
            r,g,b,a=pix[x,y]
            if a and ((g>140 and g>r*1.8 and g>b*1.7) or (original.stem=='origem-correntes' and g>85 and g>r*1.5 and g>b*1.4)):pix[x,y]=(0,0,0,0)
    box=im.getbbox()
    if not box:raise ValueError(original)
    im=im.crop(box);im.thumbnail((512,512),Image.Resampling.LANCZOS)
    name=original.stem.removeprefix('origem-')
    # Remove também resíduos vivos que o filtro de redimensionamento misturou.
    pixels=im.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r,g,b,a=pixels[xx,yy]
            if a and g>140 and g>r*1.8 and g>b*1.7:pixels[xx,yy]=(0,0,0,0)
    im.save(P/(name+'.png'),optimize=True)
    print(name, im.size)
