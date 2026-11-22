from pathlib import Path
import json,importlib.util
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];base=root/'assets/sprites/docas-oeste-pontual'
m=json.loads((base/'manifest.json').read_text());atlas=Image.open(base/'atlas.png').convert('RGBA');a=np.array(atlas)
assert np.all(a[a[:,:,3]==0,:3]==0),'no invisible chroma RGB'
rgb=a[:,:,:3].astype(int);assert not np.any((a[:,:,3]>200)&(rgb[:,:,1]>150)&(rgb[:,:,1]>np.maximum(rgb[:,:,0],rgb[:,:,2])+80)),'no green background'
out=Image.new('RGBA',m['sourceSize']);coverage=np.zeros((m['sourceSize'][1],m['sourceSize'][0]),dtype=int)
for name,f in m['frames'].items():
 x,y,w,h=f['rect'];left,top,right,bottom=f['sourceBox'];assert (w,h)==(right-left,bottom-top)
 part=atlas.crop((x,y,x+w,y+h));out.alpha_composite(part,(left,top))
 coverage[top:bottom,left:right]+=(np.array(part)[:,:,3]>0)
 assert not a[y-1,x:x+w,3].any() and not a[y+h,x:x+w,3].any(),'transparent gutters'
assert coverage.max()==1,'each painted pixel belongs to exactly one depth layer'
r=np.array(out);assert not r[-1,:,3].any(),'no rectangular cropped bottom edge'
assert np.count_nonzero((r[:,:,3]>0)&(r[:,:,3]<255))>500,'soft shoreline'
assert np.count_nonzero(r[:300,:,3]==0)>100000,'sky/gaps stay transparent, not painted ocean'
print('Oeste pontual: clean alpha/chroma, exclusive masks, exact bbox sizes, gutters and soft shoreline OK.')
# Byte-identical native pixels outside the shared rear-cabin overlap.
from PIL import ImageDraw,ImageFilter
original=np.array(Image.open(root/'assets/sprites/docas-fidelidade/fundos-enraizados.png').convert('RGBA'))
masked=np.array(Image.open(base/'fundos-preservados.png').convert('RGBA'));h,w=original.shape[:2]
region=Image.new('L',(w,h));ImageDraw.Draw(region).polygon([((x-374)*w/480,(y-142)*h/258) for x,y in m['scope']],fill=255)
margin=np.array(region.filter(ImageFilter.MaxFilter(9)))>0
assert np.array_equal(original[~margin],masked[~margin]),'shared rear-cabin pixels outside edited nook are byte-identical'
print('Shared rear-cabin image: native pixels outside the local mask preserved exactly.')
