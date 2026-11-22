"""Prepare the ten original Maré lot 6 sheets.

Props are keyed from the flat magenta studio background and trimmed to their
alpha bounds. Wall/floor textures stay opaque and become 64 px tiles.
"""
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path('assets/source-art/mare-missao-lote6')
DST = Path('assets/sprites/mare-missao-lote6')
DST.mkdir(parents=True, exist_ok=True)
TEXTURES = {'parede-azulejo', 'parede-ferrugem', 'chao-grade'}


def is_key(r, g, b):
    return r > 70 and b > 65 and g < min(r, b) * 0.85


for path in sorted(SRC.glob('*.png')):
    image = Image.open(path).convert('RGBA')
    name = path.stem
    if name in TEXTURES:
        image = image.resize((64, 64), Image.Resampling.NEAREST)
        image.save(DST / path.name, optimize=True)
        print(f'{name}: texture 64x64')
        continue
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if is_key(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)
    image.thumbnail((192, 192), Image.Resampling.NEAREST)
    image.putalpha(image.getchannel('A').filter(ImageFilter.MinFilter(3)))
    bounds = image.getbbox()
    if bounds:
        image = image.crop(bounds)
    image.save(DST / path.name, optimize=True)
    print(f'{name}: {image.width}x{image.height}')
