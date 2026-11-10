#!/usr/bin/env python3
"""Ferramentas de recorte para a arte dos arquétipos (Bio-Forja e Maré).

O gerador devolve RGB com fundo magenta chapado, os quadros em faixas e uma
linha de grade em volta de cada coluna. Todo preparador do Bio passa por aqui:

  * `remove_magenta` — magenta → alpha real, com despill nas bordas (sem halo);
  * `content_bands`  — onde há figura, eixo a eixo (linha/coluna);
  * `fit_bands`     — junta faixas até sobrar o número de quadros prometido;
  * `tight`         — recorta o miolo da figura dentro de uma faixa;
  * `compose`       — células iguais com pés na base e nada invadindo vizinho.

É importado por `preparar-bio-ultimate.py`, `preparar-bio-acoes.py` e
`preparar-mare-ultimate.py`. Todos usam as mesmas regras de célula (320 px,
pés em 276) para os corpos ficarem do mesmo tamanho em jogo.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Cada arquétipo guarda as fontes na própria pasta (bio/ e mare/); o destino é
# sempre assets/sprites/player porque é de lá que o jogo carrega.
SOURCE_BIO = ROOT / 'assets/source-art/bio'
SOURCE_MARE = ROOT / 'assets/source-art/mare'
SOURCE = SOURCE_BIO
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


def disc_mask(frame, feather=.06):
    """Fecha um quadro de efeito em disco, com borda suave.

    Alguns geradores desenham o efeito preenchendo a célula (o túnel do vórtice
    do Maré, por exemplo). Em jogo isso viraria um retângulo de água. O disco
    inscreve o efeito na elipse da célula e dissolve a borda, então o desenho
    lê como redemoinho em volta do corpo.
    """
    h, w = frame.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    # Elipse inscrita, levemente maior que a altura (o efeito precisa cobrir o corpo).
    nx = (xs - w / 2) / (w / 2)
    ny = (ys - h / 2) / (h / 2)
    dist = np.sqrt(nx * nx + ny * ny)
    borda = 1 - feather
    alpha = np.clip((1 - dist) / feather, 0, 1)
    out = frame.copy()
    out[:, :, 3] = (frame[:, :, 3].astype(np.float32) * alpha).round().astype(np.uint8)
    return out


def compose(frames, out_name, cell=CELL, baseline=BASELINE, target_height=230, limite=None, out_dir=None, body_height=None):
    """Células iguais: altura normalizada, pés na base, corpo centralizado.

    A altura de referência é a do quadro MENOS decorado (o corpo), não a média:
    quando um quadro tem cachoeira ou túnel de efeito em volta, a média inflava
    a arte e o personagem encolhia em relação aos outros arquétipos.

    `body_height` fixa a altura do CORPO em pixels (a caixa da figura sem o
    efeito). O Maré já tem caminhada medida em 142 px em jogo; a Ultimate tem
    que devolver o mesmo corpo, então a escala sai de `body_height / altura`.
    """
    heights = [f.shape[0] for f in frames]
    altura_corpo = float(min(heights))
    if body_height:
        # O quadro de referência é o mais "limpo" (menor bbox): a altura dele é
        # praticamente só corpo, então a escala vem daí.
        scale = body_height / altura_corpo
    if not body_height:
        scale = target_height / altura_corpo
    # Efeitos muito altos não podem estourar a célula: o limite manda mais que
    # a altura do corpo, mas avisamos quando isso acontece.
    if max(heights) * scale > cell - 8:
        scale = (cell - 8) / float(max(heights))
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
    target = (out_dir or OUT) / f'{out_name}.png'
    sheet.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)} → {sheet.width}×{sheet.height}, '
          f'escala {scale:.3f}, {len(frames)} quadros')
    return target


def load_frames(file_name, count, alpha_min=8, source=None):
    """Abre uma folha-fonte e devolve os `count` quadros recortados.

    `source` permite apontar outra pasta de fontes (Maré usa `mare/`), sem
    duplicar o recorte: magenta, faixas de grade e células são os mesmos.
    """
    pasta = source or SOURCE
    rgba = remove_magenta(np.asarray(Image.open(pasta / file_name).convert('RGB')))
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
