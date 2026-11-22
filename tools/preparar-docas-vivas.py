"""Transforma as dez artes de efeito em atlas de 16 poses (Pillow e NumPy).
Uso: python tools/preparar-docas-vivas.py [pasta com os dez originais PNG/WebP]
Sem argumento usa os originais compactados de assets/source-art/docas-vivas.
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source-art/docas-vivas'
OUT = ROOT / 'assets/sprites/docas-vivas'
NAMES = ('ondulacao','espuma','caustica','nevoa','respingos','ventosa','fumaca','reflexo-ambar','bandeirola','cintila')
W,H,FRAMES,COLS = 160,96,16,4


def as_byte(a):
    return np.rint(np.clip(a,0,255)).astype(np.uint8)


def key(image,name):
    rgb = np.asarray(image.convert('RGB'), dtype=np.float32)
    peak = rgb.max(axis=2)
    if name == 'caustica':
        # O gerador devolveu esta refração em fundo branco. Conserva o traço
        # magenta original, mapeado para valores luminosos no mar noturno.
        r,g,b = rgb.transpose(2,0,1)
        chroma = np.maximum(r,b)-g
        alpha = np.clip(chroma*2.7,0,235)
        rgb = np.stack((160+r*.36,45+g*.28,172+b*.29),axis=2)
    elif name == 'bandeirola':
        alpha = np.clip((peak-7)*13,0,255)
    else:
        alpha = np.clip((peak-8)*(3.15 if name in ('fumaca','ondulacao') else 1.65),0,255)
        rgb = rgb * (255/np.maximum(alpha,26))[...,None]
    out = Image.fromarray(as_byte(np.dstack((rgb,alpha))))
    out = out.crop(out.getchannel('A').point(lambda v:255 if v>18 else 0).getbbox())
    out.thumbnail((W-18,H-16),Image.Resampling.LANCZOS)
    # Author each matte at target effect size; retain transparent padding
    # for texture filtering while the mesh is in motion.
    frame=Image.new('RGBA',(W,H))
    frame.paste(out,((W-out.width)//2,(H-out.height)//2))
    return frame


def mesh(frame,name,k):
    phase = math.tau*k/FRAMES
    horizontal = name in ('ondulacao','espuma','caustica','nevoa','reflexo-ambar')
    def sample(x,y):
        u,v=x/W,y/H
        if name=='bandeirola':
            tail=max(0,(u-.11)/.89)**1.3
            return x+4*tail*math.sin(phase), y+8*tail*math.sin(phase-u*6)
        if name in ('fumaca','respingos'):
            return x+4*(1-v)*math.sin(phase+v*5),y+4*(1-v)*math.cos(phase+u*4)
        if horizontal:
            return x+4*math.sin(phase+v*4),y+3.4*math.sin(phase+u*8)*(1-abs(v-.5))
        breathe=1+.07*math.sin(phase)
        return (x-W/2)*breathe+W/2,(y-H/2)*breathe+H/2
    cells=[]
    for y in range(0,H,8):
        for x in range(0,W,8):
            r,b=x+8,y+8
            cells.append(((x,y,r,b),sum((sample(u,v) for u,v in ((x,y),(x,b),(r,b),(r,y))),())))
    return frame.transform(frame.size,Image.Transform.MESH,cells,Image.Resampling.BICUBIC)


def main(folder):
    OUT.mkdir(parents=True,exist_ok=True)
    for name in NAMES:
        path=next((p for ext in ('.png','.webp') if (p:=folder/(name+ext)).is_file()),None)
        if not path:raise FileNotFoundError(name)
        with Image.open(path) as image:
            sprite=key(image,name)
        atlas=Image.new('RGBA',(W*COLS,H*(FRAMES//COLS)))
        for k in range(FRAMES):
            atlas.paste(mesh(sprite,name,k),(k%COLS*W,k//COLS*H))
        atlas.save(OUT/(name+'.webp'),lossless=True,quality=82,method=5)


if __name__=='__main__':
    main(Path(sys.argv[1]) if len(sys.argv)>1 else SOURCE)
