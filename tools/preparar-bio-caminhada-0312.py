#!/usr/bin/env python3
"""Recorta a geração irregular em quatro direções; requer Pillow.
A imagem original é 8×3 irregular, não a grade pedida. Seleção explícita
impede que um quadro frontal seja usado como lateral ou traseiro.
"""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'assets/source-art/bio-caminhada-0312.png').convert('RGB')
if source.size != (1376, 768):
    raise ValueError('Dimensões inesperadas; revisar recortes')
# Limites manuais de cada personagem, obtidos da imagem original.
rows = [
    [(0, 15, 145), (0, 160, 295), (0, 400, 535), (0, 545, 680)],
    [(0, 695, 845), (1, 5, 150), (1, 155, 305), (1, 380, 535)],
    [(1, 700, 840), (1, 850, 995), (1, 1075, 1215), (1, 1225, 1365)],
    [(2, 8, 155), (2, 695, 845), (2, 855, 1005), (2, 8, 155)],
]
cellw, cellh = 172, 256
out = Image.new('RGBA', (cellw * 4, cellh * 4))
for row, specs in enumerate(rows):
    for col, (sy, x0, x1) in enumerate(specs):
        crop = source.crop((x0, sy * 256, x1, (sy + 1) * 256)).convert('RGBA')
        pixels = crop.load()
        for y in range(crop.height):
            for x in range(crop.width):
                r,g,b,a = pixels[x,y]
                # Fundo magenta vivo; uma pequena franja é removida, sem tocar
                # cores cinza, pele, dourado ou ciano do traje.
                if r > 140 and b > 125 and r > g * 1.5 and b > g * 1.35:
                    pixels[x,y] = (0,0,0,0)
        bbox = crop.getchannel('A').getbbox()
        if not bbox or bbox[2]-bbox[0] < 45 or bbox[3]-bbox[1] < 170:
            raise ValueError(f'Quadro inválido {row},{col}: {bbox}')
        figure = crop.crop(bbox)
        if figure.width > cellw or figure.height > cellh - 5:
            raise ValueError(f'Quadro não cabe {row},{col}: {figure.size}')
        out.alpha_composite(figure, (col * cellw + (cellw - figure.width)//2, row * cellh + cellh - 5 - figure.height))
out.save(root / 'assets/sprites/player/bio-caminhada-0312.png', optimize=True)
