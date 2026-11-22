from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
root=Path(__file__).resolve().parents[1];src=root/'assets/source-art/docas-interiores-lote4';out=root/'assets/sprites/docas-interiores-lote4';out.mkdir(parents=True,exist_ok=True);records=[]
for path in sorted(src.glob('*.png')):
 a=np.array(Image.open(path).convert('RGBA'));rgb=a[:,:,:3].astype(float)
 # Magenta matte, preserving black cables and the dark puddle.
 excess=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1];alpha=np.clip((60-excess)/25,0,1)
 a[:,:,3]=(a[:,:,3]*alpha).astype('uint8');partial=alpha<.99
 for ch in [0,2]:a[:,:,ch]=np.where(partial,np.minimum(a[:,:,ch],a[:,:,1]),a[:,:,ch])
 a[a[:,:,3]==0]=0;im=Image.fromarray(a);box=im.getchannel('A').point(lambda n:255 if n>20 else 0).getbbox();assert box,path
 im=im.crop(box);im.thumbnail((512,512),Image.Resampling.LANCZOS);im.save(out/path.name,optimize=True)
 records.append({'id':path.stem,'size':im.size,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
assert len(records)==10
(out/'manifest.json').write_text(json.dumps({'batch':4,'count':10,'assets':records},indent=2)+'\n')
