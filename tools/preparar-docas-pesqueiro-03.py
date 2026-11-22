#!/usr/bin/env python3
"""10 folhas dedicadas ao pesqueiro/mar: 4×12 poses de casco + 6×24 de água.
Pillow, NumPy. Reusa pintura aprovada; cordame, luz, fumaça e água procedurais.
O balanço rígido é feito apenas no runtime, não embutido nos atlas.
"""
from pathlib import Path
import math
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/sprites/docas-pesqueiro-03'
TAU=math.tau
PARTS=['subida','crista','descida','cavado']
FX=['mar-proa','mar-popa','espuma-costado','reflexo-ambar','reflexo-violeta','spray-proa']


def casco(source,p):
    a=np.array(source).astype(float)
    yy,xx=np.mgrid[:568,:610]
    wet=np.clip((yy-390)/178,0,1)
    shimmer=wet*(.5+.5*np.sin(xx/28+yy/20-p*TAU))*.12
    a[:,:,:3]*=1+shimmer[:,:,None]
    warm=(a[:,:,0]>a[:,:,2]*1.3)&(a[:,:,1]>55)&(yy>190)&(yy<395)&(xx>185)&(xx<280)
    a[:,:,:3]*=(1+warm*(.05*math.sin(p*TAU)+.025*math.sin(p*TAU*3)))[:,:,None]
    a=np.uint8(np.clip(a,0,255))
    # Remove green key residue even on the very thin ropes.
    a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]))
    a[a[:,:,3]==0]=0
    # Rigging flex is independent of rigid-body heave/roll applied by runtime.
    for row in range(210):
        shift=round(2.8*math.sin(p*TAU)*max(0,1-row/210)**1.5)
        if shift:
            a[row]=np.roll(a[row],shift,axis=0)
            if shift>0:a[row,:shift]=0
            else:a[row,shift:]=0
    frame=Image.new('RGBA',(640,616))
    frame.alpha_composite(Image.fromarray(a),(15,40))
    smoke=Image.new('RGBA',frame.size);d=ImageDraw.Draw(smoke)
    for j in range(6):
        q=(p+j/6)%1
        x=245-53*q+5*math.sin(q*5+p*TAU)
        y=174-75*q
        r=3+12*q
        alpha=round(math.sin(q*math.pi)*24)
        d.ellipse((x-r*1.6,y-r,x+r*1.6,y+r),fill=(152,142,174,alpha))
    frame.alpha_composite(smoke.filter(ImageFilter.GaussianBlur(1)))
    return frame


def agua(kind,p):
    # Supersample lines, then store compact 256×128 RGBA cells.
    im=Image.new('RGBA',(512,256));d=ImageDraw.Draw(im)
    def line(points,color,width=1):d.line([(round(x*2),round(y*2)) for x,y in points],fill=color,width=width*2)
    if kind.startswith('mar-'):
        offset=0 if kind=='mar-proa' else .35
        for j in range(5):
            q=(p+j/5+offset)%1
            env=math.sin(q*math.pi)**1.2
            pts=[]
            for x in range(8,249,3):
                taper=math.sin((x-8)/241*math.pi)
                y=24+q*72+4*math.sin(x/23+p*TAU+j)*taper
                pts.append((x,y))
            line(pts,(100,178,209,round(env*85)),1)
            line([(x,y+3) for x,y in pts],(43,93,145,round(env*50)),2)
    elif kind=='espuma-costado':
        # Trace the approved hull's actual underside, not a generic ellipse.
        for j in range(3):
            q=(p+j/3)%1
            for k in range(14):
                pts=[]
                for x in range(18+k*40,min(42+k*40,600),2):
                    y=WATERLINE[x]
                    if y<400:continue
                    pts.append((x/610*256,(y-400+3+q*13+2*math.sin(x/25-p*TAU))/200*128))
                if len(pts)>1:line(pts,(167,213,226,round(math.sin(q*math.pi)*125)),1)
    elif kind.startswith('reflexo-'):
        amber=kind.endswith('ambar')
        for j in range(24):
            q=j/24
            cx=128+math.sin(j*1.83-p*TAU)*(6+q*17)
            half=(1-q)*28+8+9*math.sin(j*2.1)**2
            y=12+q*105+2*math.sin(p*TAU+j)
            alpha=round((1-q)*(.72+.28*math.sin(j+p*TAU))*(82 if amber else 65))
            line([(cx-half,y),(cx+half,y)],(255,157,76,alpha) if amber else (191,69,202,alpha),1)
    else:
        for k in range(24):
            q=(p+k*.071)%1
            x=128+math.sin(k*2.4)*q*90
            y=96-math.sin(q*math.pi)*(15+k%6*9)
            alpha=round(math.sin(q*math.pi)**1.5*135)
            line([(x,y),(x+q*2,y+2+q*2)],(182,219,235,alpha),1)
    return im.resize((256,128),Image.Resampling.LANCZOS)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    source=Image.open(ROOT/'assets/sprites/docas-cascos/pesqueiro-repouso.png').convert('RGBA')
    global WATERLINE
    alpha=np.array(source.getchannel('A'))
    WATERLINE=[np.where(alpha[:,x]>80)[0][-1] if np.any(alpha[:,x]>80) else 0 for x in range(610)]
    sheets={}
    for part,name in enumerate(PARTS):
        atlas=Image.new('RGBA',(640*4,616*3))
        for f in range(12):atlas.paste(casco(source,(part*12+f)/48),(f%4*640,f//4*616))
        name='casco-'+name
        atlas.save(OUT/f'{name}.webp',lossless=True,method=6)
        sheets[name]={'w':640,'h':616,'frames':12,'columns':4,'offset':[15,40]}
    for name in FX:
        atlas=Image.new('RGBA',(256*4,128*6))
        for f in range(24):atlas.paste(agua(name,f/24),(f%4*256,f//4*128))
        atlas.save(OUT/f'{name}.webp',lossless=True,method=6)
        sheets[name]={'w':256,'h':128,'frames':24,'columns':4}
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'cycleSeconds':6.4,'provenance':'Pintura aprovada reutilizada. 48 poses de cordame/luz/fumaça e 144 poses de água procedurais; balanço rígido somente no runtime.','sheets':sheets},indent=2,ensure_ascii=False)+'\n')
    print('Pesqueiro 03: dez folhas, 192 quadros, sem alterações ao bote/tentáculo/rota.')


if __name__=='__main__':main()
