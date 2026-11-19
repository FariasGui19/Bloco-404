#!/usr/bin/env python3
"""Usa o pesqueiro aprovado na Enseada; cais imóvel, casco em oito poses.
Pillow. Mantém a caixa da composição antiga e os IDs de interação.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/sprites/docas-cascos'
old=Image.open(ROOT/'assets/sprites/enseada-cais-revisao/cais-barco.png').convert('RGBA')
pier=Image.new('RGBA',old.size)
pier.paste(old.crop((0,0,623,old.height)),(0,0))
# Extend the mooring to the new hull; no visibly cut rope floating in water.
d=ImageDraw.Draw(pier)
points=[]
for j in range(41):
    u=j/40
    points.append((round((1-u)**2*620+2*(1-u)*u*680+u*u*790),round((1-u)**2*407+2*(1-u)*u*493+u*u*548)))
d.line(points,fill=(40,28,48,255),width=9)
d.line(points,fill=(106,71,100,255),width=5)
d.line([(x,y-2) for x,y in points],fill=(154,119,132,220),width=1)
ship=Image.open(OUT/'pesqueiro-repouso.png').convert('RGBA')
ship=ship.resize((460,428),Image.Resampling.LANCZOS)
frames=[]
for i in range(8):
    frame=pier.copy()
    # Only the vessel moves. The dock, stairs and collision do not oscillate.
    bob=round(-2+2*math.cos(i*math.tau/8))
    frame.alpha_composite(ship,(old.width-460,old.height-428+bob))
    frames.append(frame)
box=frames[0].getbbox()
frames=[frame.crop(box) for frame in frames]
w,h=frames[0].size
frames[0].save(OUT/'enseada-cais-pesqueiro.png',optimize=True)
atlas=Image.new('RGBA',(w*8,h))
for i,frame in enumerate(frames):atlas.paste(frame,(i*w,0))
atlas.save(OUT/'enseada-cais-pesqueiro-folha.png',optimize=True)
print('Enseada:',w,h,'8 quadros; cais fixo')
