#!/usr/bin/env python3
"""Corta fundo magenta e cria folhas leves procedurais a partir das 10 artes.
Os quadros são transformações de uma única imagem, não quadros desenhados à mão.
Requer Pillow. Saída determinística com 8 quadros de 160x160.
"""
from PIL import Image
from collections import deque
from pathlib import Path
import math
p=Path('assets/sprites/travessia-lote1')
nomes=['rocha','naufragio','boia','oleo','redemoinho','tentaculo','olhos','sombra','espuma','peixe']
for name in nomes:
 im=Image.open(p/f'origem-{name}.png').convert('RGBA');w,h=im.size;px=im.load()
 def fundo(c):
  r,g,b,_=c
  return r>185 and b>150 and g<100 and r>g*1.7 and b>g*1.6
 seen=bytearray(w*h);q=deque()
 for x in range(w):q.extend(((x,0),(x,h-1)))
 for y in range(h):q.extend(((0,y),(w-1,y)))
 while q:
  x,y=q.popleft();idx=y*w+x
  if seen[idx]:continue
  seen[idx]=1
  if not fundo(px[x,y]):continue
  px[x,y]=(0,0,0,0)
  if x:q.append((x-1,y))
  if x+1<w:q.append((x+1,y))
  if y:q.append((x,y-1))
  if y+1<h:q.append((x,y+1))
 # Também remove magenta puro preso em lacunas fechadas da arte.
 for y in range(h):
  for x in range(w):
   r,g,b,a=px[x,y]
   if a and r>246 and b>220 and g<25:px[x,y]=(0,0,0,0)
 box=im.getbbox()
 if not box:raise ValueError(name)
 im=im.crop(box);im.thumbnail((130,130),Image.Resampling.LANCZOS)
 im.save(p/f'{name}.png',optimize=True)
 sheet=Image.new('RGBA',(160*8,160))
 for i in range(8):
  a=math.sin(i*math.tau/8)
  # Oscilação suave para boias/tentáculos, rotação lenta para o vórtice;
  # demais imagens respiram/deslocam, sem alterar a âncora central.
  deg={'redemoinho':i*45,'tentaculo':a*5,'boia':a*3,'peixe':a*2,'oleo':a*2,'espuma':a*2}.get(name,a*.8)
  frame=im.rotate(deg,Image.Resampling.BICUBIC,expand=True)
  dst=Image.new('RGBA',(160,160));dst.alpha_composite(frame,((160-frame.width)//2,(160-frame.height)//2+round(a*2)))
  sheet.alpha_composite(dst,(160*i,0))
 sheet.save(p/f'{name}-folha.png',optimize=True)
 print(name)
