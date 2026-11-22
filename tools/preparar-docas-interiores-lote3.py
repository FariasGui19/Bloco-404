#!/usr/bin/env python3
"""Third batch: exactly ten elements; four grounded props, six plane decals.
Sources are retained. The coat output included three views: select only the
central, hooked view. The runner is rotated for its long floor footprint.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/source-art/docas-interiores-lote3'
OUT=ROOT/'assets/sprites/docas-interiores-lote3'
NAMES=['rede-secagem','mesa-refeicao','bau-suprimentos','reserva-agua','esteira-sisal',
       'carta-parede','grelha-piso','capa-parede','lanterna-parede','tubo-valvula']
OUT.mkdir(parents=True,exist_ok=True)
records=[]
for name in NAMES:
    path=SRC/f'{name}.png';im=Image.open(path).convert('RGBA')
    select=(round(im.width*.36),0,round(im.width*.65),im.height) if name=='capa-parede' else (0,0,im.width,im.height)
    a=np.array(im.crop(select));rgb=a[:,:,:3].astype(float)
    excess=rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])
    alpha=np.clip((100-excess)/70,0,1);partial=alpha<.99
    a[:,:,1]=np.where(partial,np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2])),a[:,:,1])
    a[:,:,3]=(a[:,:,3]*alpha).astype('uint8');a[a[:,:,3]==0]=0
    im=Image.fromarray(a);box=im.getchannel('A').point(lambda n:255 if n>12 else 0).getbbox()
    if box is None:raise ValueError(name)
    im=im.crop(box)
    if name=='esteira-sisal':im=im.transpose(Image.Transpose.ROTATE_90)
    im.thumbnail((512,512),Image.Resampling.LANCZOS);im.save(OUT/f'{name}.png',optimize=True)
    records.append({'id':name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'selection':select,'crop':box,'rotation':90 if name=='esteira-sisal' else 0,'size':im.size})
    print(name,im.size)
(OUT/'manifest.json').write_text(json.dumps({'batch':3,'count':10,'assets':records},indent=2)+'\n')
