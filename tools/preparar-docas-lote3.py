#!/usr/bin/env python3
"""Recorta o fundo verde e cria oito quadros procedurais com o pé fixo.
Requer Pillow. Os quadros não são animações desenhadas à mão.
"""
from pathlib import Path
from PIL import Image
from collections import deque
import math

P = Path('assets/sprites/docas-lote3')
NOMES = ('cristal', 'arvore', 'palmeira', 'caixotes', 'barris', 'resina', 'fitas', 'tentaculo', 'esporos', 'rede')
for nome in NOMES:
    im = Image.open(P / f'origem-{nome}.png').convert('RGBA')
    pixels = im.load()
    w, h = im.size
    def verde(c):
        r, g, b, a = c
        return g > 140 and g > r * 1.8 and g > b * 1.7
    vistos = bytearray(w*h)
    fila = deque([(x, y) for x in range(w) for y in (0, h-1)] + [(x, y) for y in range(h) for x in (0, w-1)])
    while fila:
        x, y = fila.popleft()
        i = y*w+x
        if vistos[i]: continue
        vistos[i] = 1
        if not verde(pixels[x,y]): continue
        pixels[x,y] = (0,0,0,0)
        if x: fila.append((x-1,y))
        if x+1<w: fila.append((x+1,y))
        if y: fila.append((x,y-1))
        if y+1<h: fila.append((x,y+1))
    # Verde quase puro só pode ser fundo, mesmo em buracos fechados.
    for y in range(h):
        for x in range(w):
            r,g,b,a = pixels[x,y]
            if a and g>235 and r<30 and b<30: pixels[x,y] = (0,0,0,0)
    bbox = im.getbbox()
    if not bbox: raise ValueError(f'arte vazia: {nome}')
    im = im.crop(bbox)
    im.thumbnail((220,220), Image.Resampling.LANCZOS)
    im.save(P / f'{nome}.png', optimize=True)
    base = Image.new('RGBA',(256,256))
    base.alpha_composite(im, ((256-im.width)//2, 248-im.height))
    folha = Image.new('RGBA',(256*8,256))
    for i in range(8):
        wave=math.sin(i*math.tau/8)
        # Cisalhamento cresce com a altura: raízes/pé permanecem fixos.
        amplitude={'arvore':.025,'palmeira':.035,'tentaculo':.025,'esporos':.012}.get(nome, .006)
        shear=wave*amplitude
        frame=base.transform((256,256), Image.Transform.AFFINE, (1,shear,-248*shear,0,1,0), resample=Image.Resampling.BICUBIC)
        folha.alpha_composite(frame,(256*i,0))
    folha.save(P / f'{nome}-folha.png', optimize=True)
    print(nome, im.size)
