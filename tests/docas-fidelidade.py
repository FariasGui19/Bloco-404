from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
base=root/'assets/sprites/docas-fidelidade'
for name in ['abrigo-oeste','fundos-enraizados','costa-sudeste','acesso-cais','mar']:
 a=np.array(Image.open(base/(name+'.png')).convert('RGBA'));rgb=a[:,:,:3].astype(int);alpha=a[:,:,3]
 assert np.mean(alpha==0)>.04,name+' nonrectangular silhouette'
 assert np.all(a[alpha==0,:3]==0),name+' transparent RGB clean'
 assert not np.any((alpha>200)&(rgb[:,:,1]>150)&(rgb[:,:,1]>np.maximum(rgb[:,:,0],rgb[:,:,2])+80)),name+' no chroma green'
 if name=='mar':
  for y in [0,200]:
   for x in [0,400]:
    f=alpha[y:y+200,x:x+400]
    assert not f[0].any() and not f[-1].any() and not f[:,0].any() and not f[:,-1].any(),'soft ocean patch boundaries'
    assert ((f>0)&(f<255)).sum()>1000,'feathered rather than opaque rectangles'
a=np.array(Image.open(base/'solo.png'));assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]),'authored sand repeat joins'
print('Fidelidade: clean silhouettes/chroma, invisible RGB, four feathered ocean frames and matching soil edges OK.')
