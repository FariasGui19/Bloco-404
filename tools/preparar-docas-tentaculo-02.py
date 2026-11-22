#!/usr/bin/env python3
"""Lote 02: 4 folhas de tentáculo (60 poses) + 6 de água (96 poses).
Uma pintura gerada, deformação por malha ancorada e efeitos procedurais.
Reproduzir com Pillow e NumPy. Não são 156 pinturas independentes.
"""
from pathlib import Path
import json
import math
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/sprites/docas-tentaculo-02'
SRC=ROOT/'assets/source-art/docas-tentaculo-02/tentaculo.png'
TAU=math.tau


def painting():
    a=np.array(Image.open(SRC).convert('RGBA'))
    rgb=a[:,:,:3].astype(float)
    excess=rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])
    a[:,:,3]=(np.clip((100-excess)/75,0,1)*a[:,:,3]).astype('uint8')
    a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]))
    a[a[:,:,3]==0]=0
    im=Image.fromarray(a)
    box=im.getchannel('A').point(lambda x:255 if x>24 else 0).getbbox()
    im=im.crop(box)
    im.thumbnail((258,238),Image.Resampling.LANCZOS)
    # Register the broad submerged root, not the center of the curled tip.
    alpha=np.array(im.getchannel('A'))
    weights=alpha[-max(4,im.height//12):].sum(axis=0)
    root=int(np.average(np.arange(im.width),weights=weights))
    canvas=Image.new('RGBA',(384,320))
    canvas.alpha_composite(im,(144-root,282-im.height))
    return canvas


def limb(im,p):
    # Inverse mesh mapping. Every vertex on/below the root is invariant.
    bend=math.sin(p*TAU)
    stretch=.94-.09*math.cos(p*TAU)
    def source(x,y):
        height=max(0,(282-y)/240)
        if y>=282:return (x,y)
        dx=24*bend*height**1.7+7*math.sin(p*TAU*2+height*3)*height**2
        sy=282+(y-282)/stretch
        return (x-dx,sy)
    mesh=[]
    for y in range(0,320,16):
        for x in range(0,384,16):
            r,b=x+16,y+16
            mesh.append(((x,y,r,b),(*source(x,y),*source(x,b),*source(r,b),*source(r,y))))
    frame=np.array(im.transform(im.size,Image.Transform.MESH,mesh,Image.Resampling.BICUBIC))
    # Bicubic unpremultiplication can reintroduce green in low-alpha edges.
    frame[:,:,1]=np.minimum(frame[:,:,1],np.maximum(frame[:,:,0],frame[:,:,2]))
    frame[frame[:,:,3]==0]=0
    return Image.fromarray(frame)


def water(kind,p):
    im=Image.new('RGBA',(256,128));d=ImageDraw.Draw(im)
    if kind in ['anel','espuma','refluxo']:
        for j in range(3):
            q=(p+j/3)%1
            if kind=='refluxo':q=1-q
            rx,ry=26+q*92,8+q*33
            alpha=int(math.sin(q*math.pi)**1.4*(150 if kind=='espuma' else 95))
            color=(172,215,231,alpha) if kind=='espuma' else (204,74,215,alpha)
            for k in range(9):
                start=k*41+j*13
                d.arc((128-rx,64-ry,128+rx,64+ry),start,start+23,fill=color,width=2 if kind=='espuma' else 1)
    elif kind=='gotas':
        for k in range(27):
            q=(p+k*.071)%1
            x=128+math.sin(k*2.4)*q*85
            y=66-math.sin(q*math.pi)*(18+k%5*7)
            a=int(math.sin(q*math.pi)**2*155)
            d.ellipse((x,y,x+2,y+3),fill=(173,215,234,a))
    else:
        for j in range(17):
            y=30+j*5
            half=(1-j/22)*(22+(j%4)*9)
            cx=128+math.sin(j*1.3+p*TAU)*(7+j*.6)
            a=int((1-j/19)*(48 if kind=='reflexo' else 35))
            d.line((cx-half,y,cx+half,y),fill=(203,63,207,a) if kind=='reflexo' else (99,158,196,a),width=2)
    return im


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    im=painting();im.save(OUT/'tentaculo-repouso.png',optimize=True)
    entries={}
    for chapter,name in enumerate(['emerge','dobra','alcance','recolhe']):
        atlas=Image.new('RGBA',(384*5,320*3))
        for f in range(15):atlas.paste(limb(im,(chapter*15+f)/60),((f%5)*384,(f//5)*320))
        name='tentaculo-'+name
        atlas.save(OUT/f'{name}.webp',lossless=True,method=6)
        entries[name]={'w':384,'h':320,'frames':15,'columns':5,'anchor':[144,282]}
    for kind in ['anel','espuma','reflexo','gotas','refluxo','esteira']:
        atlas=Image.new('RGBA',(256*4,128*4))
        for f in range(16):atlas.paste(water(kind,f/16),((f%4)*256,(f//4)*128))
        name='agua-'+kind
        atlas.save(OUT/f'{name}.webp',lossless=True,method=6)
        entries[name]={'w':256,'h':128,'frames':16,'columns':4,'anchor':[128,64]}
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'provenance':'Uma repintura gerada; 60 poses por malha ancorada e 96 poses procedurais de água.','sheets':entries},indent=2,ensure_ascii=False)+'\n')
    # Review GIF uses the same seven layers and root as the game renderer.
    sheets={name:Image.open(OUT/f'{name}.webp').convert('RGBA') for name in entries}
    preview=[]
    parts=['emerge','dobra','alcance','recolhe']
    for n in range(60):
        scene=Image.new('RGBA',(540,360),(16,28,48,255))
        for kind in ['esteira','reflexo','anel','tentaculo','refluxo','espuma','gotas']:
            if kind=='tentaculo':
                name=f'tentaculo-{parts[n//15]}';f=n%15;x,y=126,18
            else:
                name=f'agua-{kind}';f=int(n/60*16);x,y=142,236
            info=entries[name];w,h,cols=info['w'],info['h'],info['columns']
            cell=sheets[name].crop((f%cols*w,f//cols*h,f%cols*w+w,f//cols*h+h))
            # Match runtime layer transparency.
            opacity={'esteira':.55,'reflexo':.65,'anel':.5,'refluxo':.36,'espuma':.5,'gotas':.6}.get(kind,1)
            cell.putalpha(cell.getchannel('A').point(lambda a:round(a*opacity)))
            scene.alpha_composite(cell,(x,y))
        preview.append(scene.convert('RGB'))
    preview[0].save(ROOT/'docs/docas-tentaculo-02.gif',save_all=True,append_images=preview[1:],duration=107,loop=0,optimize=True)
    print('Lote 02: dez folhas, 156 quadros e GIF de revisão')


if __name__=='__main__':main()
