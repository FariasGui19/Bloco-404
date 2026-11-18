#!/usr/bin/env python3
"""Prepara quatro texturas e seis objetos estáticos das Docas. Requer Pillow."""
from pathlib import Path
from collections import deque
from PIL import Image
P=Path('assets/sprites/docas-lote5')
textures={'areia','terra','pedras','falesia'}
for original in sorted(P.glob('origem-*.png')):
    name=original.stem.removeprefix('origem-')
    im=Image.open(original).convert('RGBA')
    if name in textures:
        im=im.resize((256,256),Image.Resampling.LANCZOS)
    else:
        pix=im.load();w,h=im.size;seen=bytearray(w*h)
        queue=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
        while queue:
            x,y=queue.popleft();idx=y*w+x
            if seen[idx]:continue
            seen[idx]=1;r,g,b,a=pix[x,y]
            if not (g>140 and g>r*1.8 and g>b*1.7):continue
            pix[x,y]=(0,0,0,0)
            if x:queue.append((x-1,y))
            if x+1<w:queue.append((x+1,y))
            if y:queue.append((x,y-1))
            if y+1<h:queue.append((x,y+1))
        for y in range(h):
            for x in range(w):
                r,g,b,a=pix[x,y]
                if a and g>235 and r<30 and b<30:pix[x,y]=(0,0,0,0)
        box=im.getbbox()
        if not box:raise ValueError(name)
        im=im.crop(box);im.thumbnail((256,256),Image.Resampling.LANCZOS)
    im.save(P/f'{name}.png',optimize=True)
    print(name,im.size)
