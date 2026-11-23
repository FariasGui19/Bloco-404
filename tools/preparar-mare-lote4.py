"""Prepare the ten original sheets; remove magenta only from billboard props."""
from pathlib import Path
from PIL import Image, ImageFilter
src=Path('assets/source-art/mare-missao-lote4'); dst=Path('assets/sprites/mare-missao-lote4'); dst.mkdir(parents=True,exist_ok=True)
textures=set()
for p in sorted(src.glob('*.png')):
    im=Image.open(p).convert('RGBA')
    if p.stem not in textures:
        pixels=im.load()
        for y in range(im.height):
            for x in range(im.width):
                r,g,b,a=pixels[x,y]
                if r>70 and b>65 and g<min(r,b)*.85: pixels[x,y]=(0,0,0,0)
    im.thumbnail((128,128) if p.stem in textures else (192,192),Image.Resampling.NEAREST)
    if p.stem not in textures:
        # Remove the last keyed edge pixel without blurring the PSX silhouette.
        im.putalpha(im.getchannel('A').filter(ImageFilter.MinFilter(3)))
    # Tight, foot-anchored silhouettes: no invisible lower margin at runtime.
    bbox=im.getbbox()
    if bbox: im=im.crop(bbox)
    im.save(dst/p.name,optimize=True)
