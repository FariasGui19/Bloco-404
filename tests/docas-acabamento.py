from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
base=root/'assets/sprites/docas-acabamento'
for name in ['cabana','promontorio']:
 a=np.array(Image.open(base/(name+'.png')).convert('RGBA'))
 assert (a[:,:,3]==0).sum()>a.shape[0]*a.shape[1]*.05, name+' clean silhouette'
 assert np.all(a[a[:,:,3]==0,:3]==0), name+' invisible RGB clean'
 rgb=a[:,:,:3].astype(int);opaque=a[:,:,3]>200
 assert not np.any(opaque&(rgb[:,:,1]>150)&(rgb[:,:,1]>np.maximum(rgb[:,:,0],rgb[:,:,2])+80)),name+' no green key spill'
 assert a.shape[1]>=492 and a.shape[0]>=352,name+' at least four source pixels per displayed pixel'
a=np.array(Image.open(base/'solo-costeiro.png'))
assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]),'repeat has matching borders'
assert len(np.unique(a.reshape(-1,3),axis=0))>1000,'detailed material, not a flat fill'
print('Acabamento: keyed silhouettes, clean invisible RGB, native resolution and seamless ground material OK.')
