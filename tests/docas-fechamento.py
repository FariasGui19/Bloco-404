#!/usr/bin/env python3
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/sprites/docas-fechamento/manifest.json').read_text())
a=np.array(Image.open(root/'assets/sprites/docas-fechamento/atlas.png'))
assert a.shape[2]==4 and [a.shape[1],a.shape[0]]==m['size']
assert not a[:8,:,3].any() and not a[-8:,:,3].any()
assert not a[:,:8,3].any() and not a[:,-8:,3].any()
assert not a[:,:,:3][a[:,:,3]==0].any()
for name,f in m['frames'].items():
    x,y,w,h=f['rect'];piece=a[y:y+h,x:x+w];alpha=piece[:,:,3]
    assert alpha.max()==255 and alpha.min()==0
    assert .2<float((alpha>200).mean())<.9, name+': not an opaque keyed rectangle'
    rgb=piece[:,:,:3].astype(float)
    green=(rgb[:,:,1]>145)&(rgb[:,:,1]>rgb[:,:,0]*1.6)&(rgb[:,:,1]>rgb[:,:,2]*1.6)&(alpha>200)
    assert float(green.mean())<.002, name+': chroma spill'
# Regression for the L-mode flood fill: the cropped hut must not include the
# entire original green background as a newly filled dark opaque rectangle.
f=m['frames']['casinha-esquerda'];assert f['sourceCrop'][0]>50 and f['sourceCrop'][1]>20
print('Fechamento: gutters/alpha/RGB invisível, três silhuetas sem retângulo opaco e sem chroma verde OK.')
