"""Prepara os módulos de margem e a plataforma Bio; requer Pillow e NumPy."""
from pathlib import Path
import numpy as np
from PIL import Image

src=Path('assets/source-art/estacao-bio')
out=Path('assets/sprites/estacao-bio')
out.mkdir(parents=True,exist_ok=True)

def clean(image):
    rgb=np.asarray(image.convert('RGB'),dtype=np.float32).copy()
    excess=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]
    alpha=np.clip((65-excess)/35,0,1)
    fringe=(excess>12)&(alpha>0)&(alpha<1)
    rgb[fringe,0]=np.minimum(rgb[fringe,0],rgb[fringe,1]+12)
    rgb[fringe,2]=np.minimum(rgb[fringe,2],rgb[fringe,1]+12)
    result=Image.fromarray(np.dstack((rgb.astype(np.uint8),(alpha*255).astype(np.uint8))))
    box=result.getbbox()
    if not box: raise ValueError('peça vazia')
    result=result.crop(box)
    result.thumbnail((640,640),Image.Resampling.LANCZOS)
    return result

sheet=Image.open(src/'margens-folha.png'); w,h=sheet.size
for i,name in enumerate(('canto', 'cano', 'ruina', 'mureta')):
    col,row=i%2,i//2
    clean(sheet.crop((col*w//2,row*h//2,(col+1)*w//2,(row+1)*h//2))).save(out/f'margem-{name}.png',optimize=True)
clean(Image.open(src/'passarela-tecnica.png')).save(out/'plataforma-tecnica.png',optimize=True)
