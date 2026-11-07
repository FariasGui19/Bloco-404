#!/usr/bin/env python3
"""Isola cachoeira e rochedos da folha RGBA do usuário, sem o fundo.
Uso: python tools/preparar-costa-rochosa.py assets/source-art/coastal/praia.png
Dependências: Pillow, NumPy, SciPy. As caixas referem-se à folha 1536x1024.
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import label

image = Image.open(sys.argv[1]).convert('RGBA')
if image.size != (1536, 1024):
    raise ValueError('Esperada folha 1536x1024')
pixels = np.array(image)
labels, _ = label(pixels[:, :, 3] > 30)
# Caixa e semente pertencem à peça desejada, não aos desenhos vizinhos.
regions = [((400, 620, 665, 885), (500, 700)), ((1303, 163, 1524, 334), None),
           ((1180, 160, 1301, 297), None), ((1193, 307, 1336, 456), None)]
atlas = Image.new('RGBA', (256 * len(regions), 256))
for index, (box, seed) in enumerate(regions):
    x0, y0, x1, y1 = box
    if seed:
        component = labels[seed[1], seed[0]]
    else:
        counts = np.bincount(labels[y0:y1, x0:x1].ravel())
        counts[0] = 0
        component = counts.argmax()
    if not component:
        raise ValueError(f'Peça {index} não encontrada')
    isolated = pixels.copy()
    isolated[:, :, 3][labels != component] = 0
    part = Image.fromarray(isolated).crop(box)
    part = part.crop(part.getbbox())
    part.thumbnail((244, 244), Image.Resampling.LANCZOS)
    atlas.alpha_composite(part, (index * 256 + (256 - part.width) // 2, 252 - part.height))
atlas.save('assets/sprites/objects/costa-rochosa.png', optimize=True)
