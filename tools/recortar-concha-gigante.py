#!/usr/bin/env python3
"""Recorta a Concha Gigante (Shell Grotto) da própria arte de referência.

A concha do pôster é uma caramujeira bege com a boca escura voltada para a
câmera, cercada de verde — NÃO é a gruta rosa de cristais (`enseada8_gruta`)
nem a caverna de pedra (`enseada4_gruta`). Como a peça tem que ficar idêntica
à arte, o recorte é feito do pôster com máscara positiva de cor (bege/creme da
concha) mais a boca escura, e as exclusões de verde e de areia da praça.

Uso: tools/recortar-concha-gigante.py
Saída: assets/sprites/enseada-lote2/concha-gigante.png
"""
import numpy as np
from PIL import Image
from scipy import ndimage

REF = 'assets/source-art/reparo-norte-10/referencia-mestre.png'
SAIDA = 'assets/sprites/enseada-lote2/concha-gigante.png'
CAIXA = (424, 412, 532, 494)


def main():
    ref = Image.open(REF).convert('RGBA')
    crop = ref.crop(CAIXA)
    a = np.asarray(crop).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Concha: bege/creme claro e a boca em sombra (marrom-escuro neutro).
    bege = (r > 150) & (g > 135) & (b > 105) & (r >= g) & (g >= b) & (abs(r - b) < 95)
    boca = (r > 55) & (r < 135) & (abs(r - b) < 45) & (g >= b - 8) & (g < r + 12)
    nucleo = bege | boca

    # Fora: verde da mata, coral roxo/vermelho e a areia da praça (mais clara
    # e mais amarela que a concha).
    verde = (g > r + 10) & (g > b + 22)
    roxo = (b > r + 20) & (b > g + 10)
    areia = (r > 218) & (g > 190) & (b < 165)
    nucleo &= ~verde & ~roxo & ~areia

    nucleo = ndimage.binary_closing(nucleo, np.ones((5, 5)))
    lab, n = ndimage.label(nucleo)
    if n:
        tamanhos = ndimage.sum(nucleo, lab, range(1, n + 1))
        # A concha é o maior bloco; os seixos e o cascão ao lado entram se
        # estiverem colados nele, senão saem.
        manter = np.zeros_like(nucleo)
        ordem = np.argsort(tamanhos)[::-1]
        manter |= lab == ordem[0] + 1
        for k in ordem[1:6]:
            if tamanhos[k] > 120:
                ys, xs = np.nonzero(lab == k + 1)
                if ys.max() > nucleo.shape[0] * .55:      # seixos da base
                    manter |= lab == k + 1
        nucleo = manter
    nucleo = ndimage.binary_fill_holes(nucleo)
    alfa = np.clip(ndimage.gaussian_filter((nucleo * 255).astype(float), .6), 0, 255).astype(np.uint8)
    crop.putalpha(Image.fromarray(alfa))
    out = crop.crop(crop.getbbox())
    out.save(SAIDA)
    print(f'{SAIDA}: {out.size}')


if __name__ == '__main__':
    main()
