"""Pixel-level asset regression (Pillow/NumPy). No browser or GPU needed."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'assets/sprites/docas-tentaculo-02'
manifest=json.loads((P/'manifest.json').read_text())
limbs=[]
for name,info in manifest['sheets'].items():
    im=Image.open(P/f'{name}.webp').convert('RGBA')
    w,h=info['w'],info['h']
    assert im.size==(w*info['columns'],h*((info['frames']+info['columns']-1)//info['columns']))
    poses=[]
    for f in range(info['frames']):
        x,y=f%info['columns']*w,f//info['columns']*h
        a=np.array(im.crop((x,y,x+w,y+h)))
        assert a[:,:,3].max()>0
        poses.append(a)
        if name.startswith('tentaculo-'):
            # The moving curl stays inside its cell. Root line at y=282.
            assert a[0,:,3].max()==0 and a[:,0,3].max()==0 and a[:,-1,3].max()==0
            assert a[283:,:,3].max()==0
            solid=a[:,:,3]>50
            rgb=a[:,:,:3].astype(int)
            assert np.max((rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2]))[solid])<=2
    assert any(not np.array_equal(poses[0],p) for p in poses[1:]),name+' must animate'
    if name.startswith('tentaculo-'):limbs.extend(poses)
# No jump at the end-to-start seam compared to normal consecutive motion.
changes=[np.abs(limbs[(i+1)%60].astype(float)-limbs[i]).mean() for i in range(60)]
assert changes[-1]<max(changes[:-1])*1.25
ship=ROOT/'assets/sprites/docas-cascos'
base=Image.open(ship/'enseada-cais-pesqueiro.png').convert('RGBA')
atlas=Image.open(ship/'enseada-cais-pesqueiro-folha.png').convert('RGBA')
assert atlas.size==(base.width*8,base.height)
first=np.array(base)
for f in range(8):
    pose=np.array(atlas.crop((f*base.width,0,(f+1)*base.width,base.height)))
    assert np.array_equal(first[:,:620],pose[:,:620]),'dock must never bob with vessel'
    if f==4:assert not np.array_equal(first[:,720:],pose[:,720:]),'ship must bob independently'
print('Pixels: dez folhas animadas, alfa limpo, curl sem cortes, laço contínuo e cais imóvel nas oito poses.')
