#!/usr/bin/env python3
"""Baía de Quarentena — lote 13: leitura de espaço, objetivo e resposta.

Nove folhas nesta leva (a décima, `caixa-estado`, ficou pendente no limite de
geração): duas texturas (passarela e cabo), três props brancos recortados
(poste, seta e quadro de missão) e quatro tiras animadas (marcador de objetivo,
pulso do farol, onda de interação e estados do terminal).

Os props vêm em cartão branco puro; as tiras aditivas vêm em breu. O recorte é
por inundação a partir da borda, então o papel claro *dentro* do quadro de
missão não é comido junto com o fundo.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/mare-missao-lote13"
TEX = ROOT / "assets/textures/mare-missao-lote13"
SPR = ROOT / "assets/sprites/mare-missao-lote13"

TEXTURES = {"trilha-tabua": 56, "cabo-guia": 40}

# name -> (lado final)
SPRITES = {"poste-sinalizador": 192, "seta-chao": 192, "placa-missao": 192}

# name -> (quadros, lado do canvas, âncora, fundo)
STRIPS = {
    "marcador-objetivo": (4, 160, "center", "luma"),
    "farol-pulso": (6, 192, "center", "luma"),
    "interacao-onda": (6, 192, "center", "luma"),
    "terminal-estados": (4, 192, "bottom", "branco"),
}


def luma(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def flood_clear(image, is_class):
    """Apaga o alpha do que é da classe e está ligado à borda da imagem."""
    px = image.load()
    width, height = image.size
    seen = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        r, g, b, a = px[x, y]
        if a == 0 or not is_class(r, g, b):
            continue
        px[x, y] = (r, g, b, 0)
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))


def clear_background(image, mode):
    image = image.convert("RGBA")
    px = image.load()
    if mode == "luma":
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0 if luma(r, g, b) < 30 else 255)
        # O gerador também separa as células com filetes brancos: o breu já saiu
        # pela luminância, e o branco sai pela borda para não virar linha.
        flood_clear(image, lambda r, g, b: min(r, g, b) > 236)
        return image
    # Cartão branco: só o branco ligado à borda sai, para não abrir buraco no
    # papel claro do quadro de missão nem no teclado do terminal.
    flood_clear(image, lambda r, g, b: min(r, g, b) > 238)
    return image


def spans_of_ink(image, wanted, min_ratio=0.05):
    alpha = image.getchannel("A")
    width, height = image.size
    cols = [sum(1 for y in range(0, height, 2) if alpha.getpixel((x, y)) > 8) for x in range(width)]
    peak = max(cols) or 1
    on = [c > peak * min_ratio for c in cols]
    runs, start = [], None
    for i, flag in enumerate(on):
        if flag and start is None:
            start = i
        elif not flag and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, width - 1))
    runs = [r for r in runs if r[1] - r[0] >= 4]
    if 3 <= len(runs) < wanted:
        # Menos desenhos do que células pedidas: completa com células vazias no
        # fim. Repartir por igual cortaria um anel ao meio — foi o que aconteceu
        # com o pulso do farol na primeira passada.
        runs = runs + [(0, 1)] * (wanted - len(runs))
        return runs
    if len(runs) < wanted:
        step = width / wanted
        return [(int(i * step), int((i + 1) * step) - 1) for i in range(wanted)]
    while len(runs) > wanted:
        gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
        _, i = min(gaps)
        runs[i] = (runs[i][0], runs[i + 1][1])
        del runs[i + 1]
    return runs


def fit_canvas(piece, side, anchor, limit=0.94):
    box = piece.getbbox() or (0, 0, 1, 1)
    piece = piece.crop(box)
    scale = (side * limit) / max(piece.size)
    if scale < 1:
        piece = piece.resize(
            (max(1, round(piece.width * scale)), max(1, round(piece.height * scale))),
            Image.Resampling.NEAREST,
        )
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    margin = int((side - side * limit) // 2)
    x = (side - piece.width) // 2
    y = side - piece.height - margin if anchor == "bottom" else (side - piece.height) // 2
    canvas.paste(piece, (int(x), int(max(0, y))), piece)
    return canvas


def prepare_texture(name, colors):
    image = Image.open(SRC / f"{name}.png").convert("RGB")
    square = min(image.size)
    image = image.crop(
        (
            (image.width - square) // 2,
            (image.height - square) // 2,
            (image.width + square) // 2,
            (image.height + square) // 2,
        )
    )
    image = image.resize((256, 256), Image.Resampling.LANCZOS)
    image = image.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    image.save(TEX / f"{name}.png", optimize=True)
    print(f"textura {name} 256x256")


def prepare_sprite(name, side):
    image = clear_background(Image.open(SRC / f"{name}.png"), "branco")
    image = fit_canvas(image, side, "bottom", limit=1.0)
    image.putalpha(image.getchannel("A").filter(ImageFilter.MinFilter(3)))
    image.save(SPR / f"{name}.png", optimize=True)
    print(f"prop {name} {image.width}x{image.height}")


def prepare_strip(name, cells, side, anchor, mode):
    source = clear_background(Image.open(SRC / f"{name}.png"), mode)
    spans = spans_of_ink(source, cells)
    if len(spans) != cells:
        raise SystemExit(f"{name}: esperava {cells} células, achei {len(spans)}")
    for index, (x0, x1) in enumerate(spans):
        piece = source.crop((x0, 0, x1 + 1, source.height))
        fit_canvas(piece, side, anchor).save(SPR / f"{name}-{index}.png", optimize=True)
    print(f"tira {name}: {cells} quadros {side}x{side} (âncora {anchor})")


if __name__ == "__main__":
    TEX.mkdir(parents=True, exist_ok=True)
    SPR.mkdir(parents=True, exist_ok=True)
    for name, colors in TEXTURES.items():
        prepare_texture(name, colors)
    for name, side in SPRITES.items():
        prepare_sprite(name, side)
    for name, (cells, side, anchor, mode) in STRIPS.items():
        prepare_strip(name, cells, side, anchor, mode)
    print(f"OK: {len(TEXTURES)} texturas, {len(SPRITES)} props, {len(STRIPS)} tiras")
