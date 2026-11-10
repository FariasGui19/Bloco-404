#!/usr/bin/env python3
"""Prepara as folhas de caminhada frente/costas da Forma Veloz (Núcleo 10X).

As folhas chegam do gerador com fundo magenta chapado e quadros fora de eixo.
Este script:
  1. recorta a faixa útil (descarta tiras extras que o gerador às vezes anexa);
  2. remove o magenta com alpha real e despill nas bordas;
  3. normaliza escala, apoio dos pés e centro da cabeça em células iguais;
  4. grava PNGs de 4 quadros por direção em assets/sprites/player/.

Uso: python3 tools/preparar-veloz-caminhada.py
Requer Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-art/proximas-animacoes'
OUT = ROOT / 'assets/sprites/player'

COLS = 4
CELL = 256
# Mesmo apoio usado pelas folhas laterais já existentes (pés em ~208 de 256).
BASELINE = 208
TARGET_HEIGHT = 182
CENTER_X = CELL // 2

SHEETS = {
    'player-10x-veloz-andar-frente': {
        'source': 'veloz-andar-frente.png',
        # A primeira faixa é a sequência; as seguintes são miniaturas extras.
        'band': (0, 440),
        'head_band': 0.34,
    },
    'player-10x-veloz-andar-costas': {
        'source': 'veloz-andar-costas.png',
        'band': None,
        'head_band': 0.30,
    },
}


def remove_magenta(rgb):
    """Converte magenta chapado em alpha e suaviza a franja colorida."""
    a = rgb.astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    bleed = np.minimum(r, b) - g           # quanto o pixel puxa para magenta
    alpha = np.ones(r.shape, dtype=np.float32)
    alpha[bleed >= 70] = 0.0
    edge = (bleed > 10) & (bleed < 70)
    alpha[edge] = (70 - bleed[edge]) / 60.0
    out = a.copy()
    # Sem despill, o contorno preto fica com halo rosa ao reduzir a escala.
    out[:, :, 0] = r - np.clip(bleed, 0, None)
    out[:, :, 2] = b - np.clip(bleed, 0, None)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return np.dstack([out, (alpha * 255).round().astype(np.uint8)])


def content_mask(rgba):
    return rgba[:, :, 3] > 8


def crop_band(rgba, band):
    if band is None:
        return rgba
    return rgba[band[0]:min(band[1], rgba.shape[0])]


def frame_boxes(rgba):
    """Células iguais por coluna; caixa justa do conteúdo em cada uma."""
    h, w = rgba.shape[:2]
    mask = content_mask(rgba)
    boxes = []
    for col in range(COLS):
        x0, x1 = round(col * w / COLS), round((col + 1) * w / COLS)
        cell = mask[:, x0:x1]
        ys, xs = np.where(cell)
        if not len(ys):
            raise SystemExit(f'quadro {col} vazio — revisar a folha de origem')
        boxes.append((x0 + xs.min(), ys.min(), x0 + xs.max() + 1, ys.max() + 1))
    return boxes


def head_center_x(rgba, box, head_band):
    """Centro horizontal da cabeça/crina, estável mesmo com cauda assimétrica."""
    x0, y0, x1, y1 = box
    h = y1 - y0
    head = content_mask(rgba)[y0:y0 + max(1, int(h * head_band)), x0:x1]
    xs = np.where(head)[1]
    return x0 + (xs.mean() if len(xs) else (x1 - x0) / 2)


def main():
    for name, cfg in SHEETS.items():
        src = SOURCE / cfg['source']
        rgba = np.asarray(Image.open(src).convert('RGB'))
        rgba = crop_band(remove_magenta(rgba), cfg['band'])
        boxes = frame_boxes(rgba)
        heights = [b[3] - b[1] for b in boxes]
        scale = TARGET_HEIGHT / float(np.median(heights))

        sheet = Image.new('RGBA', (CELL * COLS, CELL), (0, 0, 0, 0))
        for col, box in enumerate(boxes):
            x0, y0, x1, y1 = box
            head_x = head_center_x(rgba, box, cfg['head_band'])
            frame = Image.fromarray(rgba[y0:y1, x0:x1])
            w, h = (max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale)))
            frame = frame.resize((w, h), Image.LANCZOS)
            dx = round(CENTER_X - (head_x - x0) * scale)
            dy = BASELINE - h
            sheet.alpha_composite(frame, (col * CELL + dx, dy))
        target = OUT / f'{name}.png'
        sheet.save(target, optimize=True)
        print(f'{target.relative_to(ROOT)} → {sheet.width}×{sheet.height}, '
              f'escala {scale:.3f}, alturas {heights}')


if __name__ == '__main__':
    main()
