"""Extrai duas folhas estáticas Bio. Requer Pillow e NumPy; executar na raiz."""
from pathlib import Path
import numpy as np
from PIL import Image

src=Path('assets/source-art/estacao-bio'); out=Path('assets/sprites/estacao-bio')
out.mkdir(parents=True,exist_ok=True)

def save_cell(image, box, name):
    rgb=np.asarray(image.crop(box).convert('RGB'),dtype=np.float32).copy()
    excess=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]
    alpha=np.clip((65-excess)/35,0,1)
    fringe=(excess>12)&(alpha>0)&(alpha<1)
    rgb[fringe,0]=np.minimum(rgb[fringe,0],rgb[fringe,1]+12)
    rgb[fringe,2]=np.minimum(rgb[fringe,2],rgb[fringe,1]+12)
    result=Image.fromarray(np.dstack((rgb.astype(np.uint8),(alpha*255).astype(np.uint8))))
    bbox=result.getbbox()
    if not bbox: raise ValueError(f'quadro vazio: {name}')
    result=result.crop(bbox); result.thumbnail((384,384),Image.Resampling.LANCZOS)
    result.save(out/f'{name}.png',optimize=True)

# A geração produziu 4x2 em vez de 2x2. Escolhemos somente o primeiro e o último
# de cada linha como pares de estados, sem alegar quadros intermediários animados.
image=Image.open(src/'maquinas-reparo-folha.png'); w,h=image.size
for name,col,row in [('reparo-condutor-quebrado',0,0),('reparo-condutor-ativo',3,0),('reparo-regulador-quebrado',0,1),('reparo-regulador-ativo',3,1)]:
    save_cell(image,(col*w//4,row*h//2,(col+1)*w//4,(row+1)*h//2),name)
# A segunda folha tem linhas pretas no meio: excluir alguns pixels das bordas das células.
image=Image.open(src/'vegetacao-industrial-folha.png'); w,h=image.size
for i,name in enumerate(('bio-mato-cano','bio-mato-ventilacao','bio-mato-barris','bio-mato-fissura')):
    col,row=i%2,i//2
    save_cell(image,(col*w//2+5,row*h//2+5,(col+1)*w//2-5,(row+1)*h//2-5),name)
