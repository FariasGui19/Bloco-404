#!/usr/bin/env python3
"""Prepara dez pinturas geradas para a vila/costa das Docas (Pillow e NumPy).
Não gera animações, não muda planta, colisão, portas ou o relógio do jogo.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/source-art/docas-vila-04'
OUT=ROOT/'assets/sprites/docas-vila-04'
# Coast props preserve exact existing 2x frame/foot registration.
COAST={'palmeiras':(434,524),'cristais':(418,338),'promontorio':(306,318),'quebra-mar':(394,204)}
NAMES=['cabana-oeste','galpao','cabana-leste','arvores-secas','palmeiras','cristais','cerca','promontorio','quebra-mar','carga']


def key(path):
    a=np.array(Image.open(path).convert('RGBA'))
    rgb=a[:,:,:3].astype(float)
    corner=rgb[0,0]
    if corner[1]>180 and corner[1]>corner[0]*1.5:
        excess=rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])
        alpha=np.where(rgb[:,:,1]>85,np.clip((100-excess)/60,0,1),1)
        edge=alpha<.99
        # Despill only partially keyed pixels; do not desaturate palm foliage.
        a[:,:,1]=np.where(edge,np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2])),a[:,:,1])
    else:
        # One painter returned a flat plum backdrop rather than green.
        # Distance key also clears the openings between porch railings.
        dist=np.max(np.abs(rgb-corner),axis=2)
        alpha=np.clip((dist-20)/25,0,1)
    a[:,:,3]=(a[:,:,3].astype(float)*alpha).astype('uint8')
    a[a[:,:,3]==0]=0
    im=Image.fromarray(a)
    bbox=im.getchannel('A').point(lambda x:255 if x>26 else 0).getbbox()
    if not bbox:raise ValueError(path)
    return im.crop(bbox),list(bbox),corner.astype(int).tolist()


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    entries={}
    for name in NAMES:
        im,box,bg=key(SRC/f'{name}.png')
        original=im.size
        if name in COAST:
            # Register to the existing local boxes, like the previous ship pass.
            im=im.resize(COAST[name],Image.Resampling.LANCZOS)
        else:
            im.thumbnail((768,768),Image.Resampling.LANCZOS)
        # Trim invisible RGB after filtering; preserve real alpha on fine details.
        a=np.array(im);a[a[:,:,3]==0]=0
        Image.fromarray(a).save(OUT/f'{name}.png',optimize=True)
        entries[name]={'file':f'{name}.png','size':list(im.size),'sourceCrop':box,'sourceObjectSize':list(original),'keyColor':bg,'coastFrame':name in COAST}
        print(name,original,'→',im.size)
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'provenance':'Dez pinturas geradas separadamente a partir da referência; recorte e registro com alfa. Peças estáticas, sem folhas novas de animação.','pieces':entries},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':main()
