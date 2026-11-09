#!/usr/bin/env python3
"""Recortes validados das duas gerações 0.3.16. Requer Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent

def clean(cell):
    cell=cell.convert('RGBA');p=cell.load()
    for y in range(cell.height):
        for x in range(cell.width):
            r,g,b,a=p[x,y]
            if r>150 and b>140 and r>g*1.5 and b>g*1.35: p[x,y]=(0,0,0,0)
    old=cell.copy().load()
    for y in range(1,cell.height-1):
        for x in range(1,cell.width-1):
            r,g,b,a=old[x,y]
            if a and r>g+18 and b>g+18 and any(old[x+dx,y+dy][3]==0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): p[x,y]=(g,g,g,a)
    return cell

walk=Image.open(root/'assets/source-art/dominio-caminhada-0316.png').convert('RGB')
assert walk.size==(1195,896)
out=Image.new('RGBA',(300*4,448))
for i in range(4):
    a=round(i*1195/4);b=round((i+1)*1195/4)
    cell=clean(walk.crop((a,0,b,448)));box=cell.getchannel('A').getbbox()
    if not box or box[3]-box[1]<380: raise ValueError(f'Passo inválido {i}: {box}')
    fig=cell.crop(box);out.alpha_composite(fig,(i*300+(300-fig.width)//2,438-fig.height))
out.save(root/'assets/sprites/player/dominio-andar-frente-0316.png',optimize=True)

attack=Image.open(root/'assets/source-art/dominio-ataque-0316.png').convert('RGB')
assert attack.size==(1376,768)
# A segunda e a terceira espada ultrapassam a grade regular. Separar nos
# intervalos reais, sem cortar as pontas, com a cabeça alinhada no mesmo eixo.
regions=[(0,330,180),(330,688,510),(688,1100,900),(1100,1376,1220)]
out=Image.new('RGBA',(450*4,768))
for i,(left,right,head) in enumerate(regions):
    cell=clean(attack.crop((left,0,right,768)));box=cell.getchannel('A').getbbox()
    if not box or box[3]-box[1]<550: raise ValueError(f'Ataque inválido {i}: {box}')
    dx=225-(head-left)
    if dx<0 or dx+cell.width>450: raise ValueError(f'Quadro não cabe {i}: {dx}')
    out.alpha_composite(cell,(i*450+dx,0))
out.save(root/'assets/sprites/player/dominio-ataque-lateral-0316.png',optimize=True)
