#!/usr/bin/env python3
"""Key/crop one three-asset batch of interior furniture; no scene repaint.
Run with Pillow and NumPy. Original generated art remains in source-art.
"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
NAMES=['bancada-pescador','mesa-vigia','gerador-crt']
out=ROOT/'assets/sprites/docas-interiores'
out.mkdir(parents=True,exist_ok=True)
for name in NAMES:
    image=Image.open(ROOT/f'assets/source-art/docas-interiores/{name}.png').convert('RGBA')
    a=np.array(image);rgb=a[:,:,:3].astype(float)
    excess=rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])
    alpha=np.clip((100-excess)/70,0,1)
    # Remove green spill only at keyed edges, not the material/CRT colors.
    partial=alpha<.99
    a[:,:,1]=np.where(partial,np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2])),a[:,:,1])
    a[:,:,3]=(a[:,:,3]*alpha).astype('uint8');a[a[:,:,3]==0]=0
    image=Image.fromarray(a)
    bounds=image.getchannel('A').point(lambda n:255 if n>12 else 0).getbbox()
    if not bounds:raise ValueError(f'Empty keyed sprite: {name}')
    image=image.crop(bounds)
    image.thumbnail((512,512),Image.Resampling.LANCZOS)
    image.save(out/f'{name}.png',optimize=True)
    print(name,image.size)
