#!/usr/bin/env python3
"""Prepara a arte do Códex: fundo atmosférico e ícones do menu.

A folha de ícones chega com fundo magenta chapado em grade 4 × 2. O script
remove o magenta com alpha real, recorta cada ícone pelo conteúdo, centraliza
em um quadrado e grava PNGs de 128 px usados pela interface (64 px em tela,
metade exata, para manter o pixel nítido).

Uso: python3 tools/preparar-codex-ui.py
Requer Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-art/ui'
OUT = ROOT / 'assets/sprites/ui'
ICONS_OUT = OUT / 'codex'

ICON_COLS, ICON_ROWS = 4, 2
# Ordem de leitura da folha: linha 1 (abas e vitais) e linha 2 (status e fechar).
ICON_NAMES = [
    'missoes', 'progressao', 'inventario', 'vitais',
    'vida', 'energia', 'xp', 'fechar',
]
ICON_SIZE = 128
PAD = 3  # margem mínima em pixels para não tocar a borda do botão


def remove_magenta(rgb):
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
    return np.dstack([np.clip(out, 0, 255).astype(np.uint8), (alpha * 255).round().astype(np.uint8)])


def prepare_icons():
    src = SOURCE / 'codex-icones.png'
    rgba = remove_magenta(np.asarray(Image.open(src).convert('RGB')))
    h, w = rgba.shape[:2]
    ICONS_OUT.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, name in enumerate(ICON_NAMES):
        col, row = index % ICON_COLS, index // ICON_COLS
        x0, x1 = round(col * w / ICON_COLS), round((col + 1) * w / ICON_COLS)
        y0, y1 = round(row * h / ICON_ROWS), round((row + 1) * h / ICON_ROWS)
        cell = rgba[y0:y1, x0:x1]
        mask = cell[:, :, 3] > 12
        ys, xs = np.where(mask)
        if not len(ys):
            raise SystemExit(f'ícone {name} vazio — revisar a folha de origem')
        icon = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
        side = max(icon.width, icon.height)
        square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        square.alpha_composite(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
        inner = ICON_SIZE - PAD * 2
        scale = inner / max(square.width, square.height)
        square = square.resize((max(1, round(square.width * scale)), max(1, round(square.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(square, ((ICON_SIZE - square.width) // 2, (ICON_SIZE - square.height) // 2))
        target = ICONS_OUT / f'icone-{name}.png'
        canvas.save(target, optimize=True)
        saved.append(target.relative_to(ROOT))
    return saved


def prepare_emblem():
    """Emblema do cabeçalho: arte única, recortada e centralizada em 128 px."""
    src = SOURCE / 'codex-emblema.png'
    rgba = remove_magenta(np.asarray(Image.open(src).convert('RGB')))
    mask = rgba[:, :, 3] > 12
    ys, xs = np.where(mask)
    if not len(ys):
        raise SystemExit('emblema vazio — revisar a arte de origem')
    crop = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = crop.shape[:2]
    side = max(w, h)
    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    canvas[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = crop
    ICONS_OUT.mkdir(parents=True, exist_ok=True)
    target = ICONS_OUT / 'icone-emblema.png'
    Image.fromarray(canvas, 'RGBA').resize((ICON_SIZE, ICON_SIZE), Image.NEAREST).save(target, optimize=True)
    return target.relative_to(ROOT)


def prepare_background():
    src = SOURCE / 'codex-fundo.png'
    image = Image.open(src).convert('RGB')
    if image.width > 1600:
        image = image.resize((1600, round(image.height * 1600 / image.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'codex-fundo.png'
    image.save(target, optimize=True)
    return target.relative_to(ROOT)


if __name__ == '__main__':
    icons = prepare_icons()
    emblem = prepare_emblem()
    background = prepare_background()
    print(f'{len(icons)} ícones em {ICONS_OUT.relative_to(ROOT)}')
    for icon in icons:
        print(' -', icon)
    print('emblema:', emblem)
    print('fundo:', background)
