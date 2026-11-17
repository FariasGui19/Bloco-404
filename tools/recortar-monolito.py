#!/usr/bin/env python3
"""Recorta o Monólito de Eco vertical da própria arte de referência.

O pôster desenha o monólito como uma laje alta de pedra, com uma gema azul
no terço superior, plantada direto na clareira — não sobre a base/pedestal
largo do sprite antigo (`echo-monolith-dais.png`). Recortar a arte garante a
mesma paleta e a mesma proporção do resto do mapa, como já se fez com o
espelho de arquétipos.

Saída: assets/sprites/enseada-lote2/monolito-eco-vertical.png
Uso: .venv/bin/python tools/recortar-monolito.py
"""
from PIL import Image
import numpy as np
from scipy import ndimage

RAIZ = '/home/user/Bloco-404'
CAIXA = (686, 296, 756, 420)  # x0, y0, x1, y1 no pôster


def main():
    full = Image.open(f'{RAIZ}/assets/source-art/reparo-norte-10/referencia-mestre.png').convert('RGB')
    crop = full.crop(CAIXA)
    a = np.asarray(crop).astype(int)

    # O monólito é pedra (cinza, pouca saturação) com uma gema ciano e um
    # halo do mesmo tom na base. Tudo o que é verde/oliva ou areia é cenário.
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    verde = (g > r + 12) & (g > b + 12)
    areia = (r > 150) & (g > 130) & (b < 150) & (r > b + 30)
    pedra = (np.abs(r - g) < 42) & (np.abs(g - b) < 46) & (r > 60)
    ciano = (b > 120) & (b > r + 25) & (g > r)
    objeto = (pedra | ciano) & ~verde & ~areia
    objeto = ndimage.binary_closing(objeto, iterations=2)
    objeto = ndimage.binary_fill_holes(objeto)
    # Mantém só o componente do monólito.
    lab, k = ndimage.label(objeto)
    if k > 1:
        sizes = ndimage.sum(objeto, lab, range(1, k + 1))
        objeto = lab == (int(np.argmax(sizes)) + 1)

    alpha = (objeto * 255).astype(np.uint8)
    alpha = ndimage.gaussian_filter(alpha.astype(float), 0.6).astype(np.uint8)

    out = np.dstack([np.asarray(crop), alpha])
    img = Image.fromarray(out, 'RGBA')
    img = img.crop(img.getbbox())
    img.save(f'{RAIZ}/assets/sprites/enseada-lote2/monolito-eco-vertical.png')

    bg = Image.new('RGBA', img.size, (70, 140, 120, 255))
    bg.alpha_composite(img)
    bg.convert('RGB').resize((img.width * 3, img.height * 3), Image.LANCZOS).save('/tmp/mono_cut.png')
    print('ok', img.size)


if __name__ == '__main__':
    main()
