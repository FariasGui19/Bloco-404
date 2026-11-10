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

# Cor de cada ícone. Antes tudo saía no mesmo verde-menta e a interface
# cansava a vista; agora cada função tem sua própria família de cor.
ICON_TINTS = {
    'missoes': '#ffc861',      # âmbar — missões
    'progressao': '#b78cff',   # violeta — progressão
    'inventario': '#ff9a5c',   # laranja — inventário
    'vitais': '#ff7d8f',       # rosa — atributos
    'vida': '#ff5f5f',         # vermelho — vida
    'energia': '#54ccff',      # ciano — energia
    'xp': '#ffd86b',           # dourado — XP
    'fechar': '#c3d3ce',       # neutro — fechar
}
EMBLEM_TINT = '#6bff9e'
ULTIMATE_TINTS = ['#ffb45c', '#ffd465', '#7ce8ff', '#8cff9e']  # ordem do arquivo
ULTIMATE_NAMES = ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma']


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


def tint(rgba, hex_color):
    """Pinta o ícone: sombra escura → cor cheia, com brilho só nos realces.

    O ícone original é quase todo claro; mapear a luminância direto para
    branco deixava tudo pastel. Aqui a cor cheia ocupa a maior parte da
    escala e o branco aparece apenas nos 15% mais claros.
    """
    alvo = np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
    lum = rgba[:, :, :3].max(axis=2).astype(np.float32) / 255.0
    # Corpo do ícone recebe a cor cheia; contorno fica escuro; realce clareia.
    t = np.clip((lum - 0.30) / 0.42, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)  # smoothstep, sem faixas duras
    rgb = alvo * (0.22 + 0.78 * t)[:, :, None]
    brilho = np.clip((lum - 0.80) / 0.20, 0.0, 1.0)
    rgb = rgb + (255.0 - rgb) * (brilho * 0.55)[:, :, None]
    return np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), rgba[:, :, 3]])


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
        canvas = Image.fromarray(tint(np.asarray(canvas), ICON_TINTS.get(name, '#8bf3d8')), 'RGBA')
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
    emblema = Image.fromarray(canvas, 'RGBA').resize((ICON_SIZE, ICON_SIZE), Image.NEAREST)
    emblema = Image.fromarray(tint(np.asarray(emblema), EMBLEM_TINT), 'RGBA')
    emblema.save(target, optimize=True)
    return target.relative_to(ROOT)


def prepare_ultimates():
    """Folha 2 x 2 com os sigilos das Ultimates, uma cor por arquétipo."""
    src = SOURCE / 'codex-ultimates.png'
    if not src.exists():
        return []
    rgba = remove_magenta(np.asarray(Image.open(src).convert('RGB')))
    h, w = rgba.shape[:2]
    ICONS_OUT.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, (nome, cor) in enumerate(zip(ULTIMATE_NAMES, ULTIMATE_TINTS)):
        col, row = index % 2, index // 2
        x0, x1 = round(col * w / 2), round((col + 1) * w / 2)
        y0, y1 = round(row * h / 2), round((row + 1) * h / 2)
        cell = rgba[y0:y1, x0:x1]
        mask = cell[:, :, 3] > 12
        ys, xs = np.where(mask)
        if not len(ys):
            raise SystemExit(f'sigilo {nome} vazio — revisar a folha')
        icon = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
        side = max(icon.width, icon.height)
        square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        square.alpha_composite(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
        inner = ICON_SIZE - PAD * 2
        square = square.resize((inner, inner), Image.LANCZOS)
        canvas = Image.new('RGBA', (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(square, (PAD, PAD))
        canvas = Image.fromarray(tint(np.asarray(canvas), cor), 'RGBA')
        target = ICONS_OUT / f'ultimate-{nome}.png'
        canvas.save(target, optimize=True)
        saved.append(target.relative_to(ROOT))
    return saved


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
    ultimates = prepare_ultimates()
    emblem = prepare_emblem()
    background = prepare_background()
    print(f'{len(icons)} ícones em {ICONS_OUT.relative_to(ROOT)}')
    for icon in icons:
        print(' -', icon)
    for icon in ultimates:
        print(' -', icon)
    print('emblema:', emblem)
    print('fundo:', background)
