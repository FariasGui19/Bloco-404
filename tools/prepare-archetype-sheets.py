#!/usr/bin/env python3
"""Prepare the six supplied JPEG sheets with simulated checkerboard backgrounds.
Usage: PYTHONPATH=<pillow-and-numpy> python tools/prepare-archetype-sheets.py <upload-dir>
The result is approximate: neutral bright pixels in effects may be lost. Original
transparent, consistently aligned frames remain preferable for production.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

source = Path(sys.argv[1])
out = Path('assets/sprites/player')
sheets = {
 'dominio-lvl1': 'Gemini_Generated_Image_2wjbls2wjbls2wjb.jpg',
 'dominio-q': 'Gemini_Generated_Image_sbefg4sbefg4sbef(1).jpg',
 'dominio-r': 'Gemini_Generated_Image_9t1qmx9t1qmx9t1q.jpg',
 'mare-lvl1': 'Gemini_Generated_Image_iuen86iuen86iuen.jpg',
 'mare-q': 'Gemini_Generated_Image_p3di9p3di9p3di9p.jpg',
 'mare-r': 'Gemini_Generated_Image_swew5hswew5hswew.jpg',
 '10x-lvl1': 'Gemini_Generated_Image_wa5gwnwa5gwnwa5g.jpg',
 '10x-q': 'Gemini_Generated_Image_oknf9foknf9foknf.jpg',
 '10x-r': 'Gemini_Generated_Image_g5nhvsg5nhvsg5nh.jpg',
}
for name, filename in sheets.items():
    a = np.asarray(Image.open(source / filename).convert('RGBA')).copy()
    rgb = a[:, :, :3].astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    # JPEG has a baked-in grey checkerboard, not an alpha channel. Bright,
    # nearly neutral colors are background; dark armor and colored VFX stay.
    chroma = 65 if name.startswith('10x') else 16
    a[:, :, 3][(mn >= 145) & (mx - mn <= chroma)] = 0
    # Maré sheets contain black cell separators. Blank just those columns/rows.
    if name.startswith('mare'):
        for x in (299, 599, 899): a[:, max(0,x-2):x+2, 3] = 0
        a[446:450, :, 3] = 0
    Image.fromarray(a).save(out / f'player-{name}.png', optimize=True)
