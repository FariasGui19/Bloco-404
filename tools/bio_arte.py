#!/usr/bin/env python3
"""Ferramentas de recorte para a arte do MOTOR BIO-FORJA.

O gerador devolve RGB com fundo magenta chapado, os quadros em faixas e uma
linha de grade em volta de cada coluna. Todo preparador do Bio passa por aqui:

  * `remove_magenta` — magenta → alpha real, com despill nas bordas (sem halo);
  * `content_bands`  — onde há figura, eixo a eixo (linha/coluna);
  * `fit_bands`     — junta faixas até sobrar o número de quadros prometido;
  * `tight`         — recorta o miolo da figura dentro de uma faixa;
  * `compose`       — células iguais com pés na base e nada invadindo vizinho.

É importado por `preparar-bio-ultimate.py` (as cinco execuções do F) e por
`preparar-bio-acoes.py` (ataque nas quatro direções e o propulsor do Q).
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-art/bio'
OUT = ROOT / 'assets/sprites/player'

# Célula padrão da arte do Bio: quadrada, 320 px, pés apoiados em 276 — sobra
# chão para onda de choque, poeira e o rastro dos propulsores.
CELL = 320
BASELINE = 276


def remove_magenta(rgb, limiar=70, halo=10):
    """Magenta chapado -> alpha real, com despill para não sobrar halo rosa."""
    a = rgb.astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    bleed = np.minimum(r, b) - g
    alpha = np.ones(r.shape, dtype=np.float32)
    alpha[bleed >= limiar] = 0.0
    edge = (bleed > halo) & (bleed < limiar)
    alpha[edge] = (limiar - bleed[edge]) / float(limiar - halo)
    out = a.copy()
    out[:, :, 0] = r - np.clip(bleed, 0, None)
    out[:, :, 2] = b - np.clip(bleed, 0, None)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return np.dstack([out, (alpha * 255).round().astype(np.uint8)])


def content_bands(mask, axis, min_share=.004, max_gap=6):
    """Faixas contínuas com conteúdo no eixo pedido (0 = colunas, 1 = linhas)."""
    profile = mask.sum(axis=axis)
    limit = max(2, profile.max() * min_share)
    occupied = np.where(profile > limit)[0]
    if not len(occupied):
        return []
    bands, start, last = [], occupied[0], occupied[0]
    for index in occupied[1:]:
        if index - last > max_gap:
            bands.append((int(start), int(last) + 1))
            start = index
        last = index
    bands.append((int(start), int(last) + 1))
    return bands


def fit_bands(bands, expected, profile):
    """Ajusta a quantidade de faixas ao número de quadros da folha.

    A linha de grade do gerador vira faixa própria e parte a figura; faixas
    próximas se juntam. Se faltar faixa (duas figuras coladas), a maior é
    dividida no ponto mais vazio do perfil.
    """
    bands = [list(b) for b in bands]
    while len(bands) > expected:
        gaps = [bands[i + 1][0] - bands[i][1] for i in range(len(bands) - 1)]
        index = int(np.argmin(gaps))
        bands[index] = [bands[index][0], bands[index + 1][1]]
        del bands[index + 1]
    while len(bands) < expected:
        larguras = [b[1] - b[0] for b in bands]
        index = int(np.argmax(larguras))
        x0, x1 = bands[index]
        meio0, meio1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
        corte = meio0 + int(np.argmin(profile[meio0:meio1])) if meio1 > meio0 else (x0 + x1) // 2
        bands[index:index + 1] = [[x0, corte], [corte, x1]]
    return [tuple(b) for b in bands]


def tight(rgba, box, alpha_min=8):
    x0, y0, x1, y1 = box
    patch = rgba[y0:y1, x0:x1]
    ys, xs = np.where(patch[:, :, 3] > alpha_min)
    if not len(xs):
        raise SystemExit('quadro vazio dentro da folha')
    return patch[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def compose(frames, out_name, cell=CELL, baseline=BASELINE, target_height=230, limite=None):
    """Células iguais: altura normalizada, pés na base, corpo centralizado."""
    heights = [f.shape[0] for f in frames]
    scale = target_height / float(np.median(heights))
    sheet = Image.new('RGBA', (cell * len(frames), cell), (0, 0, 0, 0))
    limite = limite or cell - 16
    for col, frame in enumerate(frames):
        h, w = frame.shape[:2]
        escala_local = scale
        # Efeitos largos (leque de cabos, cúpula) não podem invadir a vizinha.
        if round(w * escala_local) > limite:
            escala_local = limite / float(w)
        nw, nh = max(1, round(w * escala_local)), max(1, round(h * escala_local))
        art = Image.fromarray(frame).resize((nw, nh), Image.LANCZOS)
        sheet.alpha_composite(art, (col * cell + cell // 2 - nw // 2, baseline - nh))
    target = OUT / f'{out_name}.png'
    sheet.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)} → {sheet.width}×{sheet.height}, '
          f'escala {scale:.3f}, {len(frames)} quadros')
    return target


def load_frames(file_name, count, alpha_min=8):
    """Abre uma folha-fonte e devolve os `count` quadros recortados."""
    rgba = remove_magenta(np.asarray(Image.open(SOURCE / file_name).convert('RGB')))
    mask = rgba[:, :, 3] > alpha_min
    rows = content_bands(mask, 1)
    if not rows:
        raise SystemExit(f'{file_name}: sem conteúdo')
    y0, y1 = rows[0]
    band = mask[y0:y1]
    colunas = content_bands(band, 0)
    minimo = band.shape[1] * .02
    colunas = [c for c in colunas if (c[1] - c[0]) >= minimo] or colunas
    colunas = fit_bands(colunas, count, band.sum(axis=0))
    return [tight(rgba, (x0, 0, x1, rgba.shape[0]), alpha_min) for x0, x1 in colunas]
