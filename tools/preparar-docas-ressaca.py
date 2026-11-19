"""Monta folhas de ressaca a partir de dez pinturas-chave (Pillow, NumPy e OpenCV).
Uso: python tools/preparar-docas-ressaca.py
"""
import math
from itertools import islice
from pathlib import Path

import cv2 as cv
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/source-art/docas-ressaca'
OUT=ROOT/'assets/sprites/docas-ressaca'
L=Image.Resampling.LANCZOS


def byte(a):
    return np.uint8(np.rint(np.clip(a,0,255)))


def source(name, creature=False):
    rgb=np.asarray(Image.open(SRC/(name+'.webp')).convert('RGB'),dtype=np.float32)
    top=rgb.max(axis=2)
    alpha=np.clip((top-(9 if creature else 12))*(4.8 if creature else 2.2),0,255)
    rgb=np.clip(rgb * (255/np.maximum(alpha,45))[...,None],0,255)
    img=Image.fromarray(byte(np.dstack((rgb,alpha))))
    return img.crop(img.getchannel('A').point(lambda v:255 if v>18 else 0).getbbox())


def plane(img):
    a=np.array(img,dtype=np.float32)/255
    a[:,:,:3]*=a[:,:,3:4]
    return a


def align(img,size,anchor,bounds, creature=False):
    f=min(bounds[0]/img.width,bounds[1]/img.height)
    img=img.resize((round(img.width*f),round(img.height*f)),L)
    if creature:
        # Locate the base, not the bounding-box center (the tip reaches right).
        foot=np.asarray(img.getchannel('A'))[-max(4,img.height//13):].sum(axis=0)
        root=round(np.average(np.arange(img.width),weights=foot))
    else:root=img.width//2
    canvas=Image.new('RGBA',size)
    canvas.paste(img,(anchor[0]-root,anchor[1]-img.height))
    return plane(canvas)


def morph(poses,count,knots,limit=25):
    height,width=poses[0].shape[:2]
    yy,xx=np.mgrid[:height,:width].astype(np.float32)
    grid=np.stack((xx,yy),axis=2)
    dis=cv.DISOpticalFlow_create(cv.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0)
    def gray(v):return cv.GaussianBlur(byte(v[:,:,3]*147+v[:,:,:3].max(axis=2)*108),(5,5),0)
    def flow(a,b):return np.clip(cv.GaussianBlur(dis.calc(gray(a),gray(b),None),(0,0),2),-limit,limit)
    fields=[]
    for a,b in zip(poses,poses[1:]+poses[:1]):fields.append((flow(a,b),flow(b,a)))
    for i in range(count):
        q=i/count
        j=next(k-1 for k in range(1,len(knots)) if q<knots[k])
        t=(q-knots[j])/(knots[j+1]-knots[j]);t=t*t*(3-2*t)
        f,g=fields[j]
        a=cv.remap(poses[j],grid-f*t,None,cv.INTER_LINEAR)
        b=cv.remap(poses[(j+1)%len(poses)],grid-g*(1-t),None,cv.INTER_LINEAR)
        yield a*(1-t)+b*t


def put(atlas, frame, i, slots):
    h,w=frame.shape[:2]
    alpha=frame[:,:,3:4]
    rgb=frame[:,:,:3]/np.maximum(alpha,.00001)
    atlas.paste(Image.fromarray(byte(np.concatenate((rgb,alpha),axis=2)*255)),(i%slots*w,i//slots*h))


def write(name,size,count,columns,frames):
    w,h=size
    atlas=Image.new('RGBA',(w*columns,h*math.ceil(count/columns)))
    for i,f in enumerate(frames):put(atlas,f,i,columns)
    atlas.save(OUT/(name+'.webp'),lossless=True,quality=80,method=5)


def chapters(prefix,names,size,count,columns,frames):
    frames=iter(frames)
    for name in names:
        write(f'{prefix}-{name}',size,count,columns,islice(frames,count))


def tentacle():
    size=(192,160)
    with Image.open(ROOT/'assets/sprites/docas-costa-oeste/tentaculo.png') as atlas:
        # Reuse the quiet iconic pose, registered to the common waterline.
        quiet=atlas.crop((0,0,354,302)).resize((177,151),L)
    base=Image.new('RGBA',size)
    base.paste(quiet,(2,7))
    root=plane(base)
    poses=[root]+[align(source('tentaculo-'+n,True),size,(72,153),b,True)
        for n,b in [('emerge',(138,125)),('dobra',(146,126)),('alcance',(158,135)),('recolhe',(139,112))]]
    # Preserve the waterline and lower root byte-for-byte even while the
    # generated silhouettes are retimed and bent at the upper joints.
    blend=np.clip((np.arange(size[1],dtype=np.float32)-111)/31,0,1)[:,None,None]
    blend=blend*blend*(3-2*blend)
    poses=[p*(1-blend)+root*blend for p in poses]
    y,x=np.mgrid[:size[1],:size[0]].astype(np.float32)
    def frames():
        for i,f in enumerate(morph(poses,60,[0,.17,.38,.60,.81,1],35)):
            p=i/60
            # The body pushes out, stretches on the reach, then sinks a
            # little on the recoil. The deformation dies at the waterline.
            rise=10*math.sin(2*math.pi*p)-5*math.sin(4*math.pi*p)
            sy=y+rise*np.clip((136-y)/108,0,1)**1.4
            warped=cv.remap(f,x,sy,cv.INTER_LINEAR)
            yield warped*(1-blend)+root*blend
    chapters('tentaculo',('emerge','dobra','alcance','recolhe'),size,15,5,frames())


def waves():
    size=(224,104)
    poses=[align(source('onda-'+n),size,(114,78),b) for n,b in [
        ('forma',(180,61)),('crista',(189,74)),('quebra',(204,77)),('refluxo',(206,32))]]
    chapters('onda',('forma','crista','quebra','refluxo'),size,12,6,morph(poses,48,[0,.31,.54,.80,1],20))


def contact(name):
    size=(144,96);w,h=size
    im=align(source('navio-'+name),size,(72,74),(122,72))
    y,x=np.mgrid[:h,:w].astype(np.float32)
    def frames():
        for i in range(24):
            p=i/23
            wide=.68+p*.38;rise=.61+math.sin(math.pi*p)*.39
            sx=(x-72)/wide+72-p*9
            sy=(y-74)/rise+74+p*11+np.sin(x*.07)*p*4
            f=cv.remap(im,sx,sy,cv.INTER_LINEAR)
            yield f*math.sin(math.pi*p)**.8
    write(name,size,24,6,frames())


if __name__=='__main__':
    cv.setNumThreads(2)
    OUT.mkdir(parents=True,exist_ok=True)
    waves();tentacle();contact('proa');contact('popa')
