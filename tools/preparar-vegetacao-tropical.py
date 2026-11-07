#!/usr/bin/env python3
"""Recorta peças independentes da folha tropical RGBA fornecida.
Uso: python tools/preparar-vegetacao-tropical.py caminho/folha.png
Requer Pillow. Mantém alpha; caixas manuais evitam peças vizinhas.
"""
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGBA')
# Folhagem, palmeira, árvore, árvore florida, ruína e pedras; caixas na folha 1536x1024.
boxes = [(16,203,223,353), (226,203,416,360), (232,369,416,634),
         (11,367,223,631), (803,383,988,629), (1001,357,1190,632),
         (1166,633,1349,787), (238,650,417,796)]
cell_w, cell_h = 256, 320
atlas = Image.new('RGBA', (cell_w * len(boxes), cell_h))
for i, box in enumerate(boxes):
    part = src.crop(box)
    part.thumbnail((cell_w-12, cell_h-12), Image.Resampling.LANCZOS)
    atlas.alpha_composite(part, (i*cell_w + (cell_w-part.width)//2, cell_h-part.height-4))
atlas.save('assets/sprites/objects/vegetacao-tropical.png', optimize=True)
