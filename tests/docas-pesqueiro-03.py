"""Asset/pixel regression for the old bow removal and 10 new sheets."""
from pathlib import Path
import hashlib
import runpy
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'assets/sprites/docas-pesqueiro-03'
manifest=json.loads((P/'manifest.json').read_text())
assert len(manifest['sheets'])==10
frames=[]
for name,info in manifest['sheets'].items():
    im=Image.open(P/f'{name}.webp').convert('RGBA')
    w,h,c,n=info['w'],info['h'],info['columns'],info['frames']
    assert im.size==(w*c,h*((n+c-1)//c))
    poses=[]
    for f in range(n):
        x,y=f%c*w,f//c*h
        a=np.array(im.crop((x,y,x+w,y+h)))
        assert a[:,:,3].max()>0
        poses.append(a)
        if name.startswith('casco-'):
            assert a[0,:,3].max()==0 and a[-1,:,3].max()==0,'padding prevents smoke/hull clipping'
            # Rigid hull silhouette must not bob in the atlas, only in runtime.
            if poses:assert np.array_equal(a[440:,:,3],poses[0][440:,:,3])
    assert any(not np.array_equal(poses[0],p) for p in poses[1:]),name+' animates'
    if name.startswith('casco-'):frames.extend(poses)
changes=[np.abs(frames[(i+1)%48].astype(float)-frames[i]).mean() for i in range(48)]
assert changes[-1]<=max(changes[:-1])*1.3,'no cycle seam'
deck=Image.open(ROOT/'assets/sprites/docas-cais-sul/deck.png').convert('RGBA')
assert deck.size==(670,392)
a=np.array(deck)
assert a[190,10,3]==0 and a[250,65,3]==0,'old bow outside deck floor is transparent'
assert a[180,75,3]>240,'boards reconstructed only inside existing deck footprint'
r=np.array(Image.open(ROOT/'assets/sprites/docas-cais-sul/reflexos.png'))
assert r[:400,:,3].max()==0,'no residual masts/railings in reflection layer'
paths=[ROOT/'assets/sprites/docas-cais-sul'/f'{n}.png' for n in ['deck','reflexos']]
before=[hashlib.sha256(p.read_bytes()).digest() for p in paths]
runpy.run_path(str(ROOT/'tools/limpar-residuo-cais.py'))['limpar']()
assert before==[hashlib.sha256(p.read_bytes()).digest() for p in paths],'cleanup must be idempotent'
print('Pixels: proa antiga removida, tábuas preservadas, reflexos limpos, dez folhas animadas e laço contínuo.')
