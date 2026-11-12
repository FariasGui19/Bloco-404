# -*- coding: utf-8 -*-
"""Prepara os sprites isométricos exclusivos da Sala de Missão — Motor Bio-Forja.

Entrada:  assets/source-art/sala-bio/*.png  (gerados sobre chave #FF00FF)
Saída:    assets/sprites/sala-bio/*.png     (RGBA limpo, sem halo magenta)
Uso:      python3 tools/preparar-sala-bio.py
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, label

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets')
SRC = os.path.join(BASE, 'source-art', 'sala-bio')
DST = os.path.join(BASE, 'sprites', 'sala-bio')


def borda_conexa(mask):
    labels, _ = label(mask)
    if labels.max() == 0:
        return np.zeros_like(mask, dtype=bool)
    borda = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    return np.isin(labels, borda[borda != 0])


def remover_magenta(img, componente_ordem=0):
    """Remove o fundo #FF00FF conectado à borda e neutraliza halo magenta."""
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # Chave magenta: R e B muito acima de G (inclusive frestas internas entre arcos/costelas,
    # já que a paleta Bio-Forja é bronze/ferro/ciano/esmeralda e não possui roxo/magenta).
    mag_forte = (r > g + 42) & (b > g + 42) & (r > 78) & (b > 78)
    mag_suave = (r > g + 30) & (b > g + 30) & (r > 70) & (b > 70)
    fundo = borda_conexa(mag_suave) | mag_forte

    # Alpha suave na transição de 1-2px da borda.
    pureza_mag = np.clip((np.minimum(r, b) - g - 28.0) / 95.0, 0.0, 1.0)
    alpha = np.where(fundo, 0.0, 255.0 * (1.0 - 0.85 * pureza_mag)).astype(np.float32)

    # Mantém apenas o componente principal desejado (0 = maior, 1 = segundo maior...).
    solidos, n_comp = label(alpha > 40)
    if n_comp > 0:
        tamanhos = np.bincount(solidos.ravel())
        tamanhos[0] = 0
        ordem = [i for i in np.argsort(-tamanhos) if tamanhos[i] > 500]
        if ordem:
            escolhido = ordem[min(componente_ordem, len(ordem) - 1)]
            manter = solidos == escolhido
            # Preserva partículas coladas a até 3px do componente escolhido
            manter = binary_dilation(manter, iterations=2) & (alpha > 16)
            alpha = np.where(manter, alpha, 0.0)

    # Despill de magenta em qualquer borda interna/externa sem alterar ciano/bronze.
    borda_obj = binary_dilation(alpha < 245, iterations=3) & (alpha > 0)
    excesso = borda_obj & (r > g + 16) & (b > g + 16)
    teto = np.maximum(g + 8.0, 0.32 * (r + b))
    rgb[..., 0] = np.where(excesso, np.minimum(r, teto), r)
    rgb[..., 2] = np.where(excesso, np.minimum(b, teto), b)

    rgba = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha, 0, 255)]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def recortar_alpha(img, margem=6):
    a = np.array(img)[..., 3]
    ys, xs = np.where(a > 10)
    if len(xs) == 0:
        return img
    x0 = max(0, int(xs.min()) - margem)
    y0 = max(0, int(ys.min()) - margem)
    x1 = min(img.width, int(xs.max()) + 1 + margem)
    y1 = min(img.height, int(ys.max()) + 1 + margem)
    return img.crop((x0, y0, x1, y1))


def reduzir_premultiplicado(img, largura_max):
    if img.width <= largura_max:
        return img
    escala = largura_max / float(img.width)
    nw = max(1, int(round(img.width * escala)))
    nh = max(1, int(round(img.height * escala)))
    arr = np.array(img).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    pre = np.dstack([arr[..., :3] * a, arr[..., 3]]).astype(np.uint8)
    red = np.array(Image.fromarray(pre, 'RGBA').resize((nw, nh), Image.Resampling.LANCZOS)).astype(np.float32)
    ar = red[..., 3:4] / 255.0
    rgb = np.where(ar > 1e-3, red[..., :3] / np.maximum(ar, 1e-3), 0.0)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(red[..., 3], 0, 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def salvar(img, nome, largura_max=640, margem=6):
    os.makedirs(DST, exist_ok=True)
    limpo = reduzir_premultiplicado(recortar_alpha(img, margem=margem), largura_max)
    caminho = os.path.join(DST, nome)
    limpo.save(caminho, optimize=True)
    kb = os.path.getsize(caminho) / 1024.0
    print(f'OK  {nome:28s} {limpo.width:4d}x{limpo.height:<4d}  ({kb:5.1f} KB)')


def main():
    # 1. Pisos isométricos 2:1 (placa forjada + grade bioluminescente)
    salvar(remover_magenta(Image.open(os.path.join(SRC, 'piso-placa.png'))),
           'piso-placa.png', largura_max=256, margem=2)
    salvar(remover_magenta(Image.open(os.path.join(SRC, 'piso-grade.png'))),
           'piso-grade.png', largura_max=256, margem=2)

    # 2. Paredes Bio-Forja:
    #    - canto norte simétrico (parede-painel inteiro)
    #    - ala reta de tubos (metade direita de parede-painel, eixo +2:+1)
    #    - painel com tanque bioluminescente (parede-tanque espelhada para eixo +2:+1)
    painel_src = Image.open(os.path.join(SRC, 'parede-painel.png'))
    painel_rgba = remover_magenta(painel_src)
    salvar(painel_rgba, 'parede-canto.png', largura_max=620, margem=4)

    ala_direita = painel_rgba.crop((736, 0, painel_rgba.width, painel_rgba.height))
    salvar(ala_direita, 'parede-tubos.png', largura_max=360, margem=4)

    tanque_src = Image.open(os.path.join(SRC, 'parede-tanque.png')).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    salvar(remover_magenta(tanque_src), 'parede-tanque.png', largura_max=360, margem=4)

    # 3. Eclusa da Doca A1 (espelhada para assentar na parede oeste x=0, eixo -2:+1)
    porta_src = Image.open(os.path.join(SRC, 'porta-eclusa.png')).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    salvar(remover_magenta(porta_src), 'porta-eclusa.png', largura_max=380, margem=4)

    # 4. Peça-heroína: Banco de Reconstrução isométrico
    salvar(remover_magenta(Image.open(os.path.join(SRC, 'banco-reconstrucao.png'))),
           'banco-reconstrucao.png', largura_max=520, margem=6)

    # 5. Portão alinhado na parede divisória (eixo -2:+1) + pilares de contenção
    salvar(remover_magenta(Image.open(os.path.join(SRC, 'grade-contencao.png'))),
           'grade-contencao.png', largura_max=520, margem=6)

    pilares_src = Image.open(os.path.join(SRC, 'pilar-contencao.png'))
    # Componente 0 (maior) = pilar central alto; Componente 2 = pilar com domo sensor
    salvar(remover_magenta(pilares_src, componente_ordem=0), 'pilar-contencao.png', largura_max=260, margem=4)
    salvar(remover_magenta(pilares_src, componente_ordem=2), 'pilar-sensor.png', largura_max=240, margem=4)

    # 6. Incubadora biomecânica (isolando uma única cápsula limpa)
    incubadora_src = Image.open(os.path.join(SRC, 'incubadora-eco.png'))
    salvar(remover_magenta(incubadora_src, componente_ordem=0), 'incubadora-eco.png', largura_max=300, margem=4)


if __name__ == '__main__':
    sys.exit(main())
