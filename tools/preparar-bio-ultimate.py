#!/usr/bin/env python3
"""Prepara as folhas de execução da Ultimate do MOTOR BIO-FORJA.

O módulo Bio é o único cujo corpo é HUMANO e cujo F depende da ferramenta
instalada: a Ultimate nível 1 substitui a base do módulo. São cinco folhas,
uma por Ultimate possível:

    forja_dome  → base do módulo      PULSO DA FORJA VIVA
    serra       → lâmina_de_forja     CORTE DE RECONFIGURAÇÃO
    martelo     → punho_de_impacto    MARTELO DE FORJA
    cabos       → gancho_magnetico    REDE DE ANCORAGEM
    propulsores → asa_de_impulso      QUEBRA-LIMITE CINÉTICO

O gerador devolve RGB com fundo magenta chapado, quadros em faixas e a linha
de grade desenhada em volta de cada coluna. Este script:

  1. remove o magenta com alpha real e despill nas bordas;
  2. recorta em GRADE (o gerador distribui as poses em colunas iguais) com
     recuo nas bordas, porque a linha da grade não é arte;
  3. normaliza altura, apoio dos pés e centro do corpo em células iguais;
  4. nunca deixa um quadro sangrar na célula vizinha;
  5. grava PNGs RGBA de 256 px por célula em assets/sprites/player/.

Uso: python3 tools/preparar-bio-ultimate.py
Requer Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-art/bio'
OUT = ROOT / 'assets/sprites/player'

CELL = 320
# Pés apoiados em 276 de 320: sobra chão para a onda de choque e a poeira.
BASELINE = 276
# Altura útil da figura dentro da célula (a mesma leitura do corpo em jogo).
TARGET_HEIGHT = 230


def remove_magenta(rgb):
    """Magenta chapado -> alpha real, com despill para não sobrar halo rosa."""
    a = rgb.astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    bleed = np.minimum(r, b) - g
    alpha = np.ones(r.shape, dtype=np.float32)
    alpha[bleed >= 70] = 0.0
    edge = (bleed > 10) & (bleed < 70)
    alpha[edge] = (70 - bleed[edge]) / 60.0
    out = a.copy()
    out[:, :, 0] = r - np.clip(bleed, 0, None)
    out[:, :, 2] = b - np.clip(bleed, 0, None)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return np.dstack([out, (alpha * 255).round().astype(np.uint8)])


def content_bands(mask, axis, min_share=.004, max_gap=6):
    """Faixas contínuas com conteúdo no eixo pedido (0 = linhas, 1 = colunas)."""
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
    """Junta faixas próximas quando a moldura de grade parte a figura.

    O gerador desenha a linha em volta de cada coluna; ela vira uma faixa
    própria e parte o quadro no meio (o punho de impacto aparece com um fiapo
    de 4 px ao lado). Aqui as faixas mais próximas se juntam até sobrar o
    número de quadros que a folha promete.
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


def tight(rgba, box):
    x0, y0, x1, y1 = box
    patch = rgba[y0:y1, x0:x1]
    ys, xs = np.where(patch[:, :, 3] > 8)
    if not len(xs):
        raise SystemExit('quadro vazio dentro da folha')
    return patch[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def compose(frames, out_name):
    """Células iguais: altura normalizada, pés na base, corpo centralizado."""
    heights = [f.shape[0] for f in frames]
    scale = TARGET_HEIGHT / float(np.median(heights))
    sheet = Image.new('RGBA', (CELL * len(frames), CELL), (0, 0, 0, 0))
    limite = CELL - 16
    for col, frame in enumerate(frames):
        h, w = frame.shape[:2]
        escala_local = scale
        # A cúpula e os cabos alargam o quadro: nada de invadir a célula vizinha.
        if round(w * escala_local) > limite:
            escala_local = limite / float(w)
        nw, nh = max(1, round(w * escala_local)), max(1, round(h * escala_local))
        art = Image.fromarray(frame).resize((nw, nh), Image.LANCZOS)
        dx = CELL // 2 - nw // 2
        dy = BASELINE - nh
        sheet.alpha_composite(art, (col * CELL + dx, dy))
    target = OUT / f'{out_name}.png'
    sheet.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)} → {sheet.width}×{sheet.height}, '
          f'escala {scale:.3f}, {len(frames)} quadros')


# Cada folha aponta a fonte e o nome final. Todas têm quatro quadros em uma
# linha, recortados por conteúdo (nada de grade fixa).
SHEETS = [
    # Base do módulo: a cúpula de raízes e engrenagens (PULSO DA FORJA VIVA).
    {'file': 'bio-ultimate.png', 'prefix': 'player-bio-ult-forja-dome', 'inset': 8},
    # Lâmina: a serra instável que cresce e corta (CORTE DE RECONFIGURAÇÃO).
    {'file': 'bio-ult-lamina.png', 'prefix': 'player-bio-ult-serra', 'inset': 10},
    # Punho: o braço vira marreta e abre cratera (MARTELO DE FORJA).
    {'file': 'bio-ult-punho.png', 'prefix': 'player-bio-ult-martelo', 'inset': 10},
    # Gancho: quatro cabos e a rede de ancoragem (REDE DE ANCORAGEM).
    {'file': 'bio-ult-gancho.png', 'prefix': 'player-bio-ult-cabos', 'inset': 10},
    # Asa: propulsores abrem e o corpo avança (QUEBRA-LIMITE CINÉTICO).
    {'file': 'bio-ult-asa.png', 'prefix': 'player-bio-ult-propulsores', 'inset': 10},
]


def main():
    for cfg in SHEETS:
        rgba = remove_magenta(np.asarray(Image.open(SOURCE / cfg['file']).convert('RGB')))
        mask = rgba[:, :, 3] > 8
        rows = content_bands(mask, 1)
        if not rows:
            raise SystemExit(f"{cfg['file']}: sem conteúdo")
        y0, y1 = rows[0]
        band = mask[y0:y1]
        # Recorte por conteúdo, com ajuste de quantidade: a moldura de grade
        # não vira quadro próprio nem parte a figura.
        colunas = content_bands(band, 0)
        # A linha de grade vira faixa de 3-5 px: não é figura. Descartar antes
        # de ajustar evita juntar dois quadros de verdade num só.
        minimo = band.shape[1] * .02
        colunas = [c for c in colunas if (c[1] - c[0]) >= minimo] or colunas
        colunas = fit_bands(colunas, 4, band.sum(axis=0))
        # As figuras podem começar acima da faixa (cabelo/ponta da lâmina):
        # a linha de recorte usa a imagem inteira em altura.
        pics = [tight(rgba, (x0, 0, x1, rgba.shape[0])) for x0, x1 in colunas]
        compose(pics, cfg['prefix'])


if __name__ == '__main__':
    main()
