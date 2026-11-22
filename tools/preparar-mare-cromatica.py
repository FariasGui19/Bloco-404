"""Recorta o fundo chroma das artes originais e cria sprites leves.
A folha do infectado é movimento procedural de um só desenho, não frames pintados.
Pillow é necessário. As origens ficam no repositório para regeneração.
"""
from PIL import Image
from collections import deque
from pathlib import Path
import math
p=Path('assets/sprites/mare-cromatica')
for name in ('infectado','nulo','ancora'):
    img=Image.open(p/f'origem-{name}.png').convert('RGBA'); w,h=img.size; px=img.load(); seen=bytearray(w*h); q=deque([(0,0)]); seen[0]=1
    def chroma(c):
        r,g,b,_=c;return r>145 and b>120 and g<100 and r>g*1.7 and b>g*1.6
    while q:
        x,y=q.popleft();px[x,y]=(0,0,0,0)
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<w and 0<=ny<h:
                i=ny*w+nx
                if not seen[i] and chroma(px[nx,ny]):seen[i]=1;q.append((nx,ny))
    # Remover também os vazios magenta entre as barras do reator.
    if name=='ancora':
        for y in range(h):
            for x in range(w):
                if chroma(px[x,y]): px[x,y]=(0,0,0,0)
    box=img.getbbox();img=img.crop(box);img.thumbnail((360,360) if name=='ancora' else (110,140),Image.Resampling.LANCZOS)
    # pixels levemente menores que o personagem no mundo, para evitar 3MB/frame
    if name in ('nulo','ancora'): img.save(p/f'{name}.png',optimize=True);continue
    sheet=Image.new('RGBA',(128*8,160))
    for k in range(8):
        frame=Image.new('RGBA',(128,160)); bob=round(math.sin(k*math.tau/8)*2)
        # Ancoragem fixa; leves oscilações de peso, respiração e passada.
        scale=1+0.025*math.sin(k*math.tau/8)
        body=img.resize((round(img.width*scale),round(img.height*(1-0.015*math.sin(k*math.tau/8)))),Image.Resampling.NEAREST)
        frame.alpha_composite(body,((128-body.width)//2+bob,155-body.height))
        sheet.alpha_composite(frame,(k*128,0))
    sheet.save(p/'infectado-folha.png',optimize=True)
