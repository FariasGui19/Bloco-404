#!/usr/bin/env python3
"""Prepara as vistas restantes do Domínio; requer Pillow."""
from PIL import Image
from pathlib import Path
root = Path(__file__).resolve().parent.parent

def clean(image):
    im = image.convert('RGBA')
    p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a = p[x,y]
            if r > 150 and b > 130 and r > g*1.5 and b > g*1.35:
                p[x,y] = (0,0,0,0)
    old = im.copy().load()
    for y in range(1, im.height-1):
        for x in range(1, im.width-1):
            r,g,b,a = old[x,y]
            if a and r>g+18 and b>g+18 and any(old[x+dx,y+dy][3]==0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):
                p[x,y] = (g,g,g,a)
    return im

# Regiões manuais: as mãos e os pés não respeitam necessariamente a grade.
def prepare(source, dest, regions, target_height):
    image = Image.open(root/'assets/source-art'/source)
    out = Image.new('RGBA',(440*4,700))
    for i,(l,t,r,b) in enumerate(regions):
        cell = clean(image.crop((l,t,r,b)))
        box = cell.getchannel('A').getbbox()
        if not box or box[3]-box[1] < 300: raise ValueError((source,i,box))
        fig = cell.crop(box)
        scale = target_height / (b-t)
        fig = fig.resize((round(fig.width*scale),round(fig.height*scale)),Image.Resampling.LANCZOS)
        if fig.width > 440 or fig.height > 680: raise ValueError((source,i,fig.size))
        out.alpha_composite(fig,(i*440+(440-fig.width)//2,680-fig.height))
    out.save(root/'assets/sprites/player'/dest,optimize=True)

prepare('dominio-lateral-0317.png','dominio-andar-lateral-0317.png',[(0,0,387,768),(387,0,670,768),(670,0,1060,768),(1060,0,1376,768)],700)
prepare('dominio-costas-0317.png','dominio-andar-costas-0317.png',[(0,0,344,768),(344,0,688,768),(688,0,1032,768),(1032,0,1376,768)],700)
prepare('dominio-ataque-frente-0317.png','dominio-ataque-frente-0317.png',[(0,0,364,720),(364,0,728,720),(728,0,1092,720),(1092,0,1456,720)],700)
prepare('dominio-ataque-costas-0317.png','dominio-ataque-costas-0317.png',[(0,0,299,448),(299,0,598,448),(598,0,925,448),(925,0,1195,448)],700)
