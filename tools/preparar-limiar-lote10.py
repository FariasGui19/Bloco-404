#!/usr/bin/env python3
"""Setor Limiar / Maré — lote 10.

Dez folhas pintadas viram:
  * seis texturas tileáveis de 256 px (piso, parede, musgo, grade, tatuagem, véu);
  * dois sprites de cenário (vegetação e totem) com fundo magenta;
  * duas tiras de animação de inimigo (afogado e guardião), fatiadas por
    projeção de tinta: cada célula é recortada, reduzida em NEAREST e erodida.

O fatiamento não depende de grade fixa: encontra as colunas e linhas vazias do
magenta, então funciona com uma tira de quatro ou com uma folha 4x2.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/setor-limiar-lote10"
TEX = ROOT / "assets/textures/setor-limiar-lote10"
SPR = ROOT / "assets/sprites/setor-limiar-lote10"
MAR = ROOT / "assets/sprites/mare-missao-lote10"

TEXTURES = (
    "piso-ruina",
    "parede-ruina",
    "musgo-limiar",
    "grade-limiar",
    "tatuagem-traco",
    "ruptura-veu",
)
SPRITES = ("vegetacao-limiar", "totem-limiar")
SHEETS = ("afogado", "guardiao")


def is_magenta(r, g, b):
    return r > 200 and b > 200 and g < 70


def key_magenta(image):
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            if is_magenta(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)
    return image


def runs(flags, min_gap):
    """Faixas contínuas de True, tolerando buracos menores que min_gap."""
    spans, start, gap = [], None, 0
    for i, on in enumerate(flags):
        if on:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, i - gap))
                start, gap = None, 0
    if start is not None:
        spans.append((start, len(flags) - 1 - gap))
    return spans


def slice_sheet(image):
    width, height = image.size
    alpha = image.getchannel("A")
    columns = [any(alpha.getpixel((x, y)) > 16 for y in range(height)) for x in range(width)]
    cells = []
    for x0, x1 in runs(columns, max(6, width // 90)):
        band = alpha.crop((x0, 0, x1 + 1, height))
        rows = [
            any(band.getpixel((x, y)) > 16 for x in range(band.width))
            for y in range(height)
        ]
        for y0, y1 in runs(rows, max(6, height // 90)):
            piece = image.crop((x0, y0, x1 + 1, y1 + 1))
            box = piece.getbbox()
            if box:
                cells.append((y0, x0, piece.crop(box)))
    # ordem de leitura: primeiro as linhas, depois as colunas
    cells.sort(key=lambda c: (round(c[0] / max(1, height // 8)), c[1]))
    return [c[2] for c in cells]


def shrink(piece, limit=192):
    scale = limit / max(piece.size)
    if scale < 1:
        piece = piece.resize(
            (max(1, round(piece.width * scale)), max(1, round(piece.height * scale))),
            Image.Resampling.NEAREST,
        )
    piece.putalpha(piece.getchannel("A").filter(ImageFilter.MinFilter(5)))
    box = piece.getbbox()
    return piece.crop(box) if box else piece


def prepare_texture(name):
    image = Image.open(SRC / f"{name}.png").convert("RGB")
    side = min(image.size)
    image = image.crop(
        (
            (image.width - side) // 2,
            (image.height - side) // 2,
            (image.width + side) // 2,
            (image.height + side) // 2,
        )
    )
    image = image.resize((256, 256), Image.Resampling.LANCZOS)
    image = image.quantize(colors=56, method=Image.Quantize.MEDIANCUT).convert("RGB")
    image.save(TEX / f"{name}.png", optimize=True)
    print(f"textura {name} 256x256")


def prepare_sprite(name):
    image = shrink(key_magenta(Image.open(SRC / f"{name}.png")))
    image.save(SPR / f"{name}.png", optimize=True)
    print(f"prop {name} {image.width}x{image.height}")


def prepare_sheet(name, keep=None):
    sheet = slice_sheet(key_magenta(Image.open(SRC / f"{name}-sheet.png")))
    if keep:
        sheet = sheet[:keep]
    for i, piece in enumerate(sheet):
        frame = shrink(piece)
        frame.save(MAR / f"{name}-{i}.png", optimize=True)
        print(f"frame {name}-{i} {frame.width}x{frame.height}")
    return len(sheet)


if __name__ == "__main__":
    for folder in (TEX, SPR, MAR):
        folder.mkdir(parents=True, exist_ok=True)
    for name in TEXTURES:
        prepare_texture(name)
    for name in SPRITES:
        prepare_sprite(name)
    total = prepare_sheet("afogado", keep=4) + prepare_sheet("guardiao", keep=4)
    print(f"OK: {len(TEXTURES)} texturas, {len(SPRITES)} sprites, {total} frames")
