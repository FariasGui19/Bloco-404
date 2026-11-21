#!/usr/bin/env python3
"""Rebuild new finishing assets; leaves the lighthouse/portal and old atlases intact."""
from pathlib import Path
import importlib.util
import numpy as np
from PIL import Image, ImageOps, ImageEnhance
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('keyer',root/'tools/preparar-docas-fechamento.py')
k=importlib.util.module_from_spec(spec);spec.loader.exec_module(k)
src=root/'assets/source-art/docas-acabamento';out=root/'assets/sprites/docas-acabamento';out.mkdir(parents=True,exist_ok=True)
def save_rgba(im,path):
 a=np.array(im);a[a[:,:,3]==0]=0;Image.fromarray(a).save(path,optimize=True)
im,_=k.key(src/'promontorio.png');im.thumbnail((960,500),Image.Resampling.LANCZOS);im=ImageEnhance.Color(im).enhance(.85);im=ImageEnhance.Brightness(im).enhance(.79);save_rgba(im,out/'promontorio.png')
im,_=k.key(src/'cabana.png',True);im.thumbnail((700,520),Image.Resampling.LANCZOS);save_rgba(im,out/'cabana.png')
# Mirrored four-quadrant repeat: opposite edges match exactly. Small native
# stones, never stretch one tiny source patch across the whole coastal floor.
im=Image.open(src/'solo-costeiro.png').convert('RGB').resize((256,256),Image.Resampling.LANCZOS)
im=ImageEnhance.Color(im).enhance(.8);im=ImageEnhance.Brightness(im).enhance(.84)
tile=Image.new('RGB',(512,512));tile.paste(im,(0,0));tile.paste(ImageOps.mirror(im),(256,0));tile.paste(ImageOps.flip(im),(0,256));tile.paste(ImageOps.flip(ImageOps.mirror(im)),(256,256));tile.save(out/'solo-costeiro.png',optimize=True)
print('Three new finishing sprites; old atlases untouched.')
