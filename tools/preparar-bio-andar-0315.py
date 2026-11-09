#!/usr/bin/env python3
"""Recorta as folhas originais 0.3.15 e elimina fundo magenta. Requer Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent

def prepare(source, expected, regions, cell_size, dest):
    im=Image.open(root/source).convert('RGB')
    if im.size != expected: raise ValueError(f'{source}: tamanho inesperado {im.size}')
    cw,ch=cell_size
    out=Image.new('RGBA',(cw*len(regions),ch))
    for i, (left,right) in enumerate(regions):
        cell=im.crop((left,0,right,im.height)).convert('RGBA')
        px=cell.load()
        for y in range(cell.height):
            for x in range(cell.width):
                r,g,b,a=px[x,y]
                if r>150 and b>140 and r>g*1.5 and b>g*1.35: px[x,y]=(0,0,0,0)
        snapshot=cell.copy().load()
        for y in range(1,cell.height-1):
            for x in range(1,cell.width-1):
                r,g,b,a=snapshot[x,y]
                if a and r>g+18 and b>g+18 and any(snapshot[x+dx,y+dy][3]==0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):
                    px[x,y]=(g,g,g,a)
        box=cell.getchannel('A').getbbox()
        if not box or box[3]-box[1] < ch*.75: raise ValueError(f'{source} quadro {i}: {box}')
        fig=cell.crop(box)
        if fig.width>cw or fig.height>ch-10: raise ValueError(f'Figura não cabe: {fig.size}')
        out.alpha_composite(fig,(i*cw+(cw-fig.width)//2,ch-10-fig.height))
    out.save(root/dest,optimize=True)

prepare('assets/source-art/bio-andar-lateral-0315.png',(2064,512),[(0,516),(516,1032),(1032,1548),(1548,2064)],(516,512),'assets/sprites/player/bio-andar-lateral-0315.png')
# Linhas pretas da geração removidas: os pixels de divisória 342–344,
# 686–688 e 1030–1032 não são alpha. Quadro extremo direito está cortado.
prepare('assets/source-art/bio-andar-costas-0315.png',(1372,784),[(0,342),(345,686),(690,1030),(345,686)],(350,784),'assets/sprites/player/bio-andar-costas-0315.png')
