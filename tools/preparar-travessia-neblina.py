#!/usr/bin/env python3
"""Prepara o barco de arte original e reduz a textura marítima; requer Pillow."""
from PIL import Image
from collections import deque
from pathlib import Path
p=Path('assets/sprites/travessia-neblina')
im=Image.open(p/'origem-barco.png').convert('RGBA');w,h=im.size;px=im.load()
def magenta(c):
    r,g,b,_=c
    return r>130 and b>115 and g<115 and r>g*1.6 and b>g*1.5
q=deque();seen=bytearray(w*h)
for x in range(w): q.extend(((x,0),(x,h-1)))
for y in range(h): q.extend(((0,y),(w-1,y)))
while q:
    x,y=q.popleft();i=y*w+x
    if seen[i]:continue
    seen[i]=1
    if not magenta(px[x,y]):continue
    px[x,y]=(0,0,0,0)
    if x:q.append((x-1,y))
    if x+1<w:q.append((x+1,y))
    if y:q.append((x,y-1))
    if y+1<h:q.append((x,y+1))
im=im.crop(im.getbbox());im.thumbnail((256,128),Image.Resampling.LANCZOS);im.save(p/'barco.png',optimize=True)
