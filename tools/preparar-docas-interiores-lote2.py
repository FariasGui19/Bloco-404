#!/usr/bin/env python3
"""Process exactly ten generated interior assets, retaining originals.
Pillow + NumPy. Two model outputs repeated the same prop; select the left
copy before keying, never put duplicate views into a gameplay sprite.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source-art/docas-interiores-lote2'
OUT=ROOT/'assets/sprites/docas-interiores-lote2'
NAMES=['cama-pescador','estante-pesca','barris-salmoura','bau-marinheiro',
       'cama-vigia','radio-vigia','arquivo-vigia','rack-crt','bancada-eletrica','carrinho-ferramentas']
OUT.mkdir(parents=True,exist_ok=True)
manifest=[]
for name in NAMES:
    source=SOURCE/f'{name}.png'
    im=Image.open(source).convert('RGBA')
    selection=(0,0,im.width//2,im.height) if name in ['estante-pesca','rack-crt'] else (0,0,im.width,im.height)
    a=np.array(im.crop(selection));rgb=a[:,:,:3].astype(float)
    excess=rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])
    alpha=np.clip((100-excess)/70,0,1)
    partial=alpha<.99
    a[:,:,1]=np.where(partial,np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2])),a[:,:,1])
    a[:,:,3]=(a[:,:,3]*alpha).astype('uint8');a[a[:,:,3]==0]=0
    im=Image.fromarray(a)
    box=im.getchannel('A').point(lambda n:255 if n>12 else 0).getbbox()
    if box is None:raise ValueError(name)
    im=im.crop(box);im.thumbnail((512,512),Image.Resampling.LANCZOS)
    im.save(OUT/f'{name}.png',optimize=True)
    manifest.append({'id':name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'selection':selection,'crop':box,'size':im.size})
    print(name,im.size)
(OUT/'manifest.json').write_text(json.dumps({'batch':2,'count':len(NAMES),'assets':manifest},indent=2)+'\n')
