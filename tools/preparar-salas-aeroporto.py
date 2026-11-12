# -*- coding: utf-8 -*-
"""Prepara as artes das Salas de Missão e do Aeroporto (IA -> jogo).

Entrada:  assets/source-art/salas/*.png, assets/source-art/aeroporto/*.png
Saída:    assets/sprites/salas/*.png,  assets/sprites/aeroporto/*.png
Uso:      python3 tools/preparar-salas-aeroporto.py

As artes foram geradas com moldura magenta #FF00FF no entorno e um "vazio"
preto ao redor do objeto. A remoção de fundo apaga componentes conectados
às bordas que sejam magenta OU escuros (o interior do objeto é preservado
por não estar conectado à borda). Faíscas/partículas isoladas fora do
objeto (componentes minúsculos de alpha) também são descartadas.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import label, gaussian_filter

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets')


def borda_conexa(mask):
    labels, _ = label(mask)
    if labels.max() == 0:
        return np.zeros_like(mask, dtype=bool)
    borda = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    return np.isin(labels, borda[borda != 0])


def remover_fundo(img, feather=1.1, lum_max=34, despeckle=140):
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mn = rgb.min(axis=2)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    magenta = (r > g + 35) & (b > g + 15) & (r > 40) & (b > 25) & ((r - mn) > 25)
    escuro = lum < lum_max
    fundo = borda_conexa(magenta | escuro)
    alpha = np.where(fundo, 0.0, 255.0).astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=feather)
    # Despeckle: mantém só componentes de alpha grandes (o objeto).
    if despeckle:
        solidos, _ = label(alpha > 60)
        if solidos.max() > 0:
            tamanhos = np.bincount(solidos.ravel())
            tamanhos[0] = 0
            maior = tamanhos.max()
            for comp in range(1, len(tamanhos)):
                if tamanhos[comp] < min(despeckle, maior * 0.002 + 60):
                    alpha[solidos == comp] = 0.0
    alpha = np.clip(alpha, 0, 255)
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')


def recorte_alpha(img, margem=10):
    a = np.array(img)[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return img
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - margem); y0 = max(0, y0 - margem)
    x1 = min(img.width - 1, x1 + margem); y1 = min(img.height - 1, y1 + margem)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def salvar(img, destino):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    img.save(destino)
    print(f'OK  {os.path.relpath(destino, os.path.join(BASE, "..")):44s} {img.width}x{img.height}')


def sprite(src, dst, margem=12):
    img = Image.open(src)
    salvar(recorte_alpha(remover_fundo(img), margem), dst)


def main():
    SRC_SALAS = os.path.join(BASE, 'source-art', 'salas')
    DST_SALAS = os.path.join(BASE, 'sprites', 'salas')
    SRC_AERO = os.path.join(BASE, 'source-art', 'aeroporto')
    DST_AERO = os.path.join(BASE, 'sprites', 'aeroporto')

    # Salas de missão: máquina da Bio-Forja + os três portões de barreira.
    for nome in ['maquina-bio', 'grade-bio', 'lacre-dominio', 'fluxo-mare', 'malha-nucleo']:
        sprite(os.path.join(SRC_SALAS, f'{nome}.png'),
               os.path.join(DST_SALAS, f'{nome}.png'), margem=12)

    # Aeroporto: cenografia nova.
    for nome in ['painel-partidas', 'carrinho-bagagem', 'totem-holo', 'planta-aliena']:
        sprite(os.path.join(SRC_AERO, f'{nome}.png'),
               os.path.join(DST_AERO, f'{nome}.png'), margem=12)


if __name__ == '__main__':
    sys.exit(main())
