# -*- coding: utf-8 -*-
"""Prepara as artes do Aeroporto Central 2.5D (geradas por IA) para o jogo.

Entrada:  assets/source-art/aeroporto/*.png  (originais gerados)
Saída:    assets/sprites/aeroporto/*.png     (RGBA, fundo transparente)
Uso:      python3 tools/preparar-aeroporto.py

Estratégia por asset:
- Naves (fundo magenta #FF00FF): remove componentes conectados à borda e
  parecidos com magenta; penas nas bordas; cruiser/shuttle são espelhadas
  para apontar para a DIREITA (o jogo vira a nave por `dir`).
- Planetas / vórtice (fundo preto): vórtice vira sprite aditivo (alpha =
  luminância); o planeta anelado tem o preto da moldura removido por
  componentes conectados à borda (o interior escuro do planeta é preservado);
  o planeta vermelho tem o fundo branco removido da mesma forma.
- Todos os assets são recortados pela caixa do canal alpha com uma margem.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import label, gaussian_filter

SRC = os.path.join(os.path.dirname(__file__), '..', 'assets', 'source-art', 'aeroporto')
DST = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites', 'aeroporto')
os.makedirs(DST, exist_ok=True)


def borda_conexa(mask):
    """Retorna a máscara dos componentes conectados às bordas da imagem."""
    labels, _ = label(mask)
    if labels.max() == 0:
        return np.zeros_like(mask, dtype=bool)
    borda = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    return np.isin(labels, borda[borda != 0])


def remover_fundo(img, mask_fundo, feather=1.15):
    """Fundo (conectado às bordas) -> alpha 0, com borda suave."""
    rgba = np.array(img.convert('RGBA')).astype(np.float32)
    fundo = borda_conexa(mask_fundo)
    alpha = rgba[..., 3].copy()
    alpha[fundo] = 0.0
    # Penas as bordas do recorte para não deixar serrilhado/franja dura.
    alpha = gaussian_filter(alpha, sigma=feather)
    alpha = np.clip(alpha, 0, 255)
    rgba[..., 3] = alpha
    return Image.fromarray(rgba.astype(np.uint8), 'RGBA')


def key_preto(img):
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    lum = rgb.max(axis=2)
    return rgb, lum < 46


def key_branco(img):
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    return rgb, (mx > 208) & ((mx - mn) < 46)


def key_magenta(img):
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return rgb, (r > 150) & (b > 150) & (g < 125) & ((r - g) > 60) & ((b - g) > 60)


def recorte_alpha(img, margem=14):
    a = np.array(img)[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return img
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - margem); y0 = max(0, y0 - margem)
    x1 = min(img.width - 1, x1 + margem); y1 = min(img.height - 1, y1 + margem)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def salvar(img, nome):
    destino = os.path.join(DST, nome)
    img.save(destino)
    print(f'OK  {nome:26s} {img.width}x{img.height}')


def vortice_aditivo():
    img = Image.open(os.path.join(SRC, 'portal-vortice.png')).convert('RGB')
    rgb = np.array(img).astype(np.float32)
    # Sprite aditivo: luminância vira alpha; cor original é preservada.
    lum = rgb.max(axis=2) / 255.0
    alpha = np.clip(lum ** 1.06, 0, 1) * 255.0
    rgba = np.dstack([rgb, alpha])
    out = Image.fromarray(rgba.astype(np.uint8), 'RGBA')
    salvar(recorte_alpha(out, 6), 'portal-vortice.png')


def planeta_anelado():
    img = Image.open(os.path.join(SRC, 'planeta-anelado.png')).convert('RGB')
    _, mask = key_preto(img)
    salvar(recorte_alpha(remover_fundo(img, mask, 1.3), 4), 'planeta-anelado.png')


def planeta_vermelho():
    img = Image.open(os.path.join(SRC, 'planeta-vermelho.png')).convert('RGB')
    _, mask = key_branco(img)
    salvar(recorte_alpha(remover_fundo(img, mask, 1.3), 4), 'planeta-vermelho.png')


def nave(nome_src, nome_dst, flip=False):
    img = Image.open(os.path.join(SRC, nome_src)).convert('RGB')
    _, mask = key_magenta(img)
    out = recorte_alpha(remover_fundo(img, mask, 1.0), 8)
    if flip:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    salvar(out, nome_dst)


def main():
    vortice_aditivo()
    planeta_anelado()
    planeta_vermelho()
    # Freighter já aponta para a direita; cruiser e shuttle apontam para a esquerda.
    nave('nave-cargueiro.png', 'nave-cargueiro.png', flip=False)
    nave('nave-cruzador.png', 'nave-cruzador.png', flip=True)
    nave('nave-shuttle.png', 'nave-shuttle.png', flip=True)


if __name__ == '__main__':
    sys.exit(main())
