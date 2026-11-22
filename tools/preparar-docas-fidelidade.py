#!/usr/bin/env python3
"""Key reference-guided new sprites without modifying protected atlases."""
from pathlib import Path
import importlib.util,json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('keyer',ROOT/'tools/preparar-docas-fechamento.py');k=importlib.util.module_from_spec(spec);spec.loader.exec_module(k)
SRC=ROOT/'assets/source-art/docas-fidelidade';OUT=ROOT/'assets/sprites/docas-fidelidade';OUT.mkdir(parents=True,exist_ok=True)
manifest={}
for name in ['abrigo-oeste','fundos-enraizados','costa-sudeste','acesso-cais']:
 # Open porch holes must remain transparent. Unlike a closed cottage, its
 # openings really do show the scenery behind the railing.
 im,box=k.key(SRC/(name+'.png'),False)
 im.thumbnail((1440,850),Image.Resampling.LANCZOS)
 a=np.array(im)
 if name=='fundos-enraizados':
  # Remove clipped stump at left and feather root-bank/rock boundary, not trees.
  h,w=a.shape[:2];fade=np.minimum(np.clip((np.arange(w)-35)/35,0,1),np.clip((w-1-np.arange(w))/20,0,1));a[:,:,3]=(a[:,:,3]*fade[None,:]).astype('uint8')
 a[a[:,:,3]==0]=0;Image.fromarray(a).save(OUT/(name+'.png'),optimize=True)
 manifest[name]={'size':list(im.size),'sourceCrop':box,'sourceSha256':hashlib.sha256((SRC/(name+'.png')).read_bytes()).hexdigest()}
# Sample full-resolution authored sand/stone, never magnify a 24px patch.
im=Image.open(SRC/'costa-sudeste.png').convert('RGB').crop((820,185,1012,273))
from PIL import ImageOps
soil=Image.new('RGB',(384,176));soil.paste(im,(0,0));soil.paste(ImageOps.mirror(im),(192,0));soil.paste(ImageOps.flip(im),(0,88));soil.paste(ImageOps.flip(ImageOps.mirror(im)),(192,88));soil.save(OUT/'solo.png',optimize=True)
# One soft-edged ocean patch authored separately from terrain: retained native
# resolution, no green key, no opaque rectangular edges. World placement is
# deterministic and animation shares faseRessaca with the preserved dock.
im=Image.open(SRC/'mar-fosforescente.png').convert('RGB')
patches=[(0,400,400,600),(920,400,1320,600),(350,500,750,700),(700,0,1100,200)]
atlas=Image.new('RGBA',(800,400))
for i,box in enumerate(patches):
 rgb=np.array(im.crop(box).resize((400,200),Image.Resampling.LANCZOS));h,w=rgb.shape[:2];yy,xx=np.mgrid[:h,:w]
 # Purple mineral reflections, not a blanket blue-white foam overlay.
 blue=rgb[:,:,2].astype(float);select=blue>rgb[:,:,1]*1.1
 rgb[:,:,0]=np.where(select,np.maximum(rgb[:,:,0],blue*.87),rgb[:,:,0]).astype('uint8')
 rgb[:,:,1]=np.where(select,rgb[:,:,1]*.78,rgb[:,:,1]).astype('uint8')
 r=((xx/(w-1)-.5)/.5)**2+((yy/(h-1)-.5)/.5)**2
 edge=np.clip((1-r)/.65,0,1);edge=edge*edge*(3-2*edge)
 light=np.clip((rgb.max(axis=2).astype(float)-40)/110,0,1)
 a=np.dstack([rgb,(edge*light*255).astype('uint8')]);a[a[:,:,3]==0]=0
 atlas.alpha_composite(Image.fromarray(a),(i%2*400,i//2*200))
atlas.save(OUT/'mar.png',optimize=True)

manifest['mar-fosforescente']={'sourceSha256':hashlib.sha256((SRC/'mar-fosforescente.png').read_bytes()).hexdigest(),'atlasSize':[800,400],'frames':4}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Five generated sources, six outputs; protected atlases unchanged.')
