#!/usr/bin/env python3
"""Image QA for the three reference-registered atlases (Pillow + NumPy)."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/sprites/docas-encaixe/manifest.json').read_text())
assert len(m['sheets'])==3 and len(m['frames'])==30
for sheet in m['sheets']:
    im=Image.open(root/sheet['src'])
    assert im.mode=='RGBA' and list(im.size)==sheet['size']
    pixels=np.array(im);a=pixels[:,:,3]
    assert not a[:4,:].any() and not a[-4:,:].any()
    assert not a[:,:4].any() and not a[:,-4:].any()
    assert not pixels[:,:,:3][a==0].any(), 'invisible RGB must be clean'
    for name,p in m['frames'].items():
        if sheet['id']!='docas_encaixe_'+p['sheet']: continue
        x,y,w,h=p['rect'];frame=a[y:y+h,x:x+w]
        assert frame.max()>200 and frame.min()==0, name+': real art and transparency'
print('Encaixe: alpha, margens, RGB invisível e 30 frames não vazios OK.')
