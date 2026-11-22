"""Gera dez folhas pequenas de efeitos pixelados para os dois dioramas.
Requer Pillow; cada folha tem oito quadros de 32x32, sem antialiasing.
Os personagens e cenários vêm das folhas/tiles já usados no mapa.
"""
from PIL import Image, ImageDraw
import math, os
out='assets/sprites/enseada-fpv-lote1'
os.makedirs(out, exist_ok=True)
N=8; W=32
names=['mar','onda','ondulacao','vapor','bolhas','chuva','respingo','mao','brilho','cascata']
for name in names:
    sheet=Image.new('RGBA',(W*N,W))
    for k in range(N):
        im=Image.new('RGBA',(W,W)); d=ImageDraw.Draw(im); f=k/N
        if name=='mar':
            for j in range(4):
                y=4+j*8; x=(j*13+k*2)%32
                d.line([(x-8,y),(x-4,y),(x-2,y-1),(x+4,y-1)],fill=(145,231,218,125),width=1)
                d.line([(x+10,y+3),(x+17,y+3)],fill=(43,142,150,110),width=1)
        elif name=='onda':
            y=15+round(2*math.sin(f*math.tau)); d.line([(1,y+2),(5,y+2),(7,y),(19,y),(22,y-1),(29,y-1)], fill=(194,249,232,230),width=2);d.line([(6,y+4),(18,y+4)],fill=(103,204,196,190))
        elif name=='ondulacao':
            r=3+k*1.5; d.arc((16-r,16-r*.27,16+r,16+r*.27),0,350,fill=(205,255,238,int(225*(1-f))),width=1)
        elif name=='vapor':
            for i in range(4):
                y=28-i*7-k; x=14+round(math.sin(i*1.5+f*math.tau)*2); size=2+i//2
                if y>0: d.rectangle((x,y,x+size,y+size),fill=(227,248,226,max(15,100-i*20)))
        elif name=='bolhas':
            for i in range(3):
                y=(28-i*9-k*2)%32; x=7+i*9; d.rectangle((x,y,x+2+i%2,y+2+i%2),outline=(193,255,244,210)); d.point((x+1,y+1),fill=(230,255,255,150))
        elif name=='chuva':
            for i in range(4):
                x=(i*9+3)%32; y=(i*13+k*4)%32;d.line((x,y,x-1,y+4),fill=(204,240,247,185),width=1)
        elif name=='respingo':
            r=1+k; y=22
            if k<5:
                d.line((16-r,y-2-k//2,16-r-1,y-3-k//2),fill=(225,255,248,220));d.line((16+r,y-2-k//2,17+r,y-3-k//2),fill=(225,255,248,220))
            d.line((16-r,y,16+r,y),fill=(183,240,231,int(220*(1-f))))
        elif name=='mao':
            # Luva e manga em blocos, sem curvas vetoriais; deslocada por quadro.
            y=round(6*math.sin(f*math.pi));
            d.polygon([(14,31),(14,24-y),(10,19-y),(9,14-y),(11,13-y),(14,17-y),(13,8-y),(15,7-y),(17,15-y),(17,5-y),(19,5-y),(20,15-y),(21,8-y),(23,8-y),(23,19-y),(21,26-y),(22,31)],fill='#332b32')
            d.polygon([(15,31),(15,24-y),(11,19-y),(10,15-y),(11,15-y),(15,20-y),(14,9-y),(15,9-y),(18,17-y),(18,6-y),(19,6-y),(20,19-y),(22,10-y),(22,19-y),(20,26-y),(21,31)],fill='#efc49e')
            d.rectangle((14,28,22,31),fill='#477d79');d.line((14,28,22,28),fill='#a5e1c4',width=1)
        elif name=='brilho':
            r=1+int(2*math.sin(f*math.pi));d.line((16-r*2,16,16+r*2,16),fill=(231,255,236,200));d.line((16,16-r*2,16,16+r*2),fill=(231,255,236,200))
        elif name=='cascata':
            for i in range(5):
                x=4+i*5;y=(i*7+k*4)%32;d.line((x,y,x,y+5+i%3),fill=(190,255,240,190),width=1)
        sheet.alpha_composite(im,(k*W,0))
    sheet.save(f'{out}/{name}.png',optimize=True)
