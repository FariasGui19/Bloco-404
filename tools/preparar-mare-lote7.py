"""Prepare the ten original Maré lot 7 sheets.

Textures become opaque 64 px tiles. Props are keyed from magenta and trimmed;
the drowned man source is a three-pose study, so the centre pose is published.
"""
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path('assets/source-art/mare-missao-lote7')
DST = Path('assets/sprites/mare-missao-lote7')
DST.mkdir(parents=True, exist_ok=True)
TEXTURES = {'parede-concreto-umido', 'parede-azulejo-quebrado', 'chao-concreto-umido', 'chao-agua-rasa', 'teto-metal-escuro'}
WIDE = {'portal-mare', 'porta-pesada'}


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
    if name == 'afogado-mare':
        third = image.width // 3
        image = image.crop((third, 0, third * 2, image.height))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if is_key(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)
    size = 256 if name in WIDE else 192
    image.thumbnail((size, size), Image.Resampling.NEAREST)
    image.putalpha(image.getchannel('A').filter(ImageFilter.MinFilter(3)))
    bounds = image.getbbox()
    if bounds:
        image = image.crop(bounds)
    image.save(DST / path.name, optimize=True)
    print(f'{name}: {image.width}x{image.height}')
