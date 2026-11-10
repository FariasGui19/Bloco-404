#!/usr/bin/env python3
"""Prepara as folhas direcionais de Maré Astral (Pillow)."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent

def clean(im):
    im = im.convert('RGBA'); pixels=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=pixels[x,y]
            if r>115 and b>90 and r>g*1.5 and b>g*1.3:
                pixels[x,y]=(0,0,0,0)
    old=im.copy().load()
    for y in range(1,im.height-1):
        for x in range(1,im.width-1):
            r,g,b,a=old[x,y]
            if a and r>g+18 and b>g+18 and any(old[x+dx,y+dy][3]==0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):
                pixels[x,y]=(g,g,g,a)
    return im

# Região, centro da cabeça e base: mantêm o corpo estável quando o braço
# ou brilho extrapola a célula. Não normalizar a figura pelo tamanho do efeito.
def prepare(source, dest, regions):
    image=Image.open(root/'assets/source-art'/source)
    assert image.size==(1195,896)
    out=Image.new('RGBA',(460*4,448))
    for i,(left,right,head) in enumerate(regions):
        cell=clean(image.crop((left,0,right,448)))
        box=cell.getchannel('A').getbbox()
        if not box or box[3]-box[1]<300: raise ValueError((source,i,box))
        dx=230-(head-left)
        if dx<0 or dx+cell.width>460: raise ValueError((source,i,dx,cell.width))
        out.alpha_composite(cell,(i*460+dx,0))
    out.save(root/'assets/sprites/player'/dest,optimize=True)
normal=[(0,299,140),(299,598,450),(598,896,745),(896,1195,1048)]
prepare('mare-andar-frente-0318.png','mare-andar-frente-0318.png',normal)
prepare('mare-andar-costas-0318.png','mare-andar-costas-0318.png',normal)
prepare('mare-andar-lateral-0318.png','mare-andar-lateral-0318.png',normal)
prepare('mare-ataque-frente-b-0318.png','mare-ataque-frente-0318.png',normal)
prepare('mare-ataque-costas-c-0318.png','mare-ataque-costas-0318.png',[(0,299,140),(299,598,450),(598,925,745),(925,1195,1048)])
# Início lateral da referência, ao invés da figura frontal gerada no quadro 0.
prepare('mare-ataque-lateral-b-0318.png','mare-ataque-lateral-0318.png',[(975,1195,1048),(299,598,450),(598,975,745),(975,1195,1048)])
