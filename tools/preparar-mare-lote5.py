"""Prepare the ten original Maré lot 5 sheets.

Billboard props are keyed from the flat magenta studio background, the last
keyed edge pixel is removed without blurring the silhouette, and the result is
trimmed to its alpha bounds. `piso-metal` is a texture: it is kept opaque and
resampled to the 64 px tile used by the mission renderer.
"""
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path('assets/source-art/mare-missao-lote5')
DST = Path('assets/sprites/mare-missao-lote5')
DST.mkdir(parents=True, exist_ok=True)
TEXTURES = {'piso-metal'}


def is_key(r, g, b):
    return r > 70 and b > 65 and g < min(r, b) * 0.85


for path in sorted(SRC.glob('*.png')):
    image = Image.open(path).convert('RGBA')
    name = path.stem
    if name == 'porta-recompilacao':
        # The source model returned a three-panel study; the middle panel is
        # the complete door, so publish that one instead of a collage.
        third = image.width // 3
        image = image.crop((third, 0, third * 2, image.height))
    if name in TEXTURES:
        image = image.resize((64, 64), Image.Resampling.NEAREST)
        image.save(DST / path.name, optimize=True)
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
