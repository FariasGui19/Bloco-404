#!/usr/bin/env python3
"""Converte os tiles planos da folha de referência, removendo fundo simulado.
Requer Pillow e NumPy. Recebe o caminho do JPG original como argumento.
Os cantos/ondas não são usados até terem encaixe e alpha genuíno validados.
"""
import sys
from PIL import Image
import numpy as np
im = Image.open(sys.argv[1]).convert('RGBA')
a = np.array(im)
rgb = a[:, :, :3].astype('int16')
# JPG com quadrados cinzas e linhas pretas; o piso areia é colorido.
mn = rgb.min(2); mx = rgb.max(2)
a[:, :, 3][(mx - mn < 18) & (mn > 125)] = 0
# Elimina bordas da grade para que não entrem nos recortes.
for x in (315, 631, 947): a[:, x-3:x+3, 3] = 0
for y in (210, 421, 632): a[y-3:y+3, :, 3] = 0
Image.fromarray(a).save('assets/sprites/tiles/beach-novas-artes.png', optimize=True)
