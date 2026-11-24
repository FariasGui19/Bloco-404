#!/usr/bin/env python3
"""Setor Limiar — lote 11: trilha, sinalização e luz.

Dez folhas: quatro texturas tileáveis (trilha, ponte, água, runa) e seis sprites
de cenário (placa, estandarte, lanterna, estátua, caixote, pilar). Algumas folhas
saem com duas cópias do objeto; o fatiador por projeção de tinta pega a primeira
cópia e descarta o resto.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/setor-limiar-lote11"
TEX = ROOT / "assets/textures/setor-limiar-lote11"
SPR = ROOT / "assets/sprites/setor-limiar-lote11"

TEXTURES = ("piso-trilha", "ponte-madeira", "agua-limiar", "runa-brilho")
SPRITES = (
    "placa-limiar",
    "estandarte-limiar",
    "lanterna-limiar",
    "estatua-limiar",
    "caixote-limiar",
    "pilar-runa-arte",
)


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


def first_copy(image):
    """Recorta a primeira cópia quando a folha traz o objeto repetido."""
    width, height = image.size
    alpha = image.getchannel("A")
    columns = [any(alpha.getpixel((x, y)) > 16 for y in range(height)) for x in range(width)]
    spans = runs(columns, max(8, width // 60))
    if len(spans) <= 1:
        return image
    x0, x1 = spans[0]
    piece = image.crop((x0, 0, x1 + 1, height))
    box = piece.getbbox()
    return piece.crop(box) if box else piece


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
    image = shrink(first_copy(key_magenta(Image.open(SRC / f"{name}.png"))))
    image.save(SPR / f"{name}.png", optimize=True)
    print(f"prop {name} {image.width}x{image.height}")


if __name__ == "__main__":
    TEX.mkdir(parents=True, exist_ok=True)
    SPR.mkdir(parents=True, exist_ok=True)
    for name in TEXTURES:
        prepare_texture(name)
    for name in SPRITES:
        prepare_sprite(name)
    print("OK: 4 texturas, 6 sprites")
