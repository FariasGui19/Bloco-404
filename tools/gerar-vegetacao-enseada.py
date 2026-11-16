#!/usr/bin/env python3
"""Gera a vegetação da Enseada a partir da densidade verde da arte.

Em vez de tentar recortar cada copa (a mata da arte é um aglomerado contínuo
que o rotulador fragmenta), o mapa é dividido numa grade de 56x56 px e cada
célula com verde suficiente vira uma planta. Isso reproduz a DISTRIBUIÇÃO da
mata da referência — onde ela é densa e onde ela abre clareira — sem depender
de um recorte perfeito.

Projeção do motor:
    px = 737.5 + 16 * (x - y)      py = -152.75 + 8 * (x + y)
"""
import numpy as np
from PIL import Image

FONTE = 'assets/source-art/reparo-norte-10/referencia-mestre.png'
SAIDA = 'js/data/enseada-vegetacao.js'
CEL = 40           # px de arte por planta
LIMIAR = 0.46      # fração mínima de verde na célula


def mundo(px, py):
    a = (px - 737.5) / 16.0
    b = (py + 152.75) / 8.0
    return round((a + b) / 2, 2), round((b - a) / 2, 2)


def main():
    im = np.asarray(Image.open(FONTE).convert('RGB')).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    # Gramado do campo é verde CLARO e amarelado; a mata é verde mais escuro.
    gramado = (g > 118) & (g > b + 62) & (r > 118) & (g > r + 8) & (r < 205)
    verde = (g > 55) & (g > r + 12) & (g > b + 30) & ~gramado

    H, W = verde.shape
    itens = []
    for y0 in range(0, H, CEL):
        for x0 in range(0, W, CEL):
            bloco = verde[y0:y0 + CEL, x0:x0 + CEL]
            if bloco.size == 0:
                continue
            densidade = bloco.mean()
            if densidade < LIMIAR:
                continue
            # Só nasce mata onde o chão da arte é grama: a referência não tem
            # palmeira plantada na areia da praia.
            if gramado[y0:y0 + CEL, x0:x0 + CEL].mean() < 0.05:
                continue
            # pé da planta na base do bloco, no meio dele
            x, y = mundo(x0 + CEL / 2, y0 + CEL * 0.92)
            largura = int(np.clip(100 + densidade * 190, 100, 290))
            itens.append((x, y, largura, round(densidade, 2)))
    itens.sort(key=lambda t: (t[1], t[0]))
    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write('// GERADO por tools/gerar-vegetacao-enseada.py — não edite à mão.\n')
        f.write('// [x, y, larguraPx, densidade] lidos da arte de referência.\n')
        f.write('export const VEGETACAO = [\n')
        for x, y, largura, d in itens:
            f.write(f'  [{x}, {y}, {largura}, {d}],\n')
        f.write('];\n')
    print(f'{SAIDA}: {len(itens)} plantas')


if __name__ == '__main__':
    main()
