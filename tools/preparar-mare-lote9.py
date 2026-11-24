#!/usr/bin/env python3
"""Maré Cromática — lote 9: três texturas de material e sete props.

Fontes em assets/source-art/mare-missao-lote9 (pintadas em 1408 px). As texturas
viram tiles PSX de 256 px; os props são chaveados do magenta, recortados antes da
redução, reduzidos com NEAREST para 192 px e recebem erosão de 2 px no alfa.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/mare-missao-lote9"
TEX = ROOT / "assets/textures/mare-missao-lote9"
SPR = ROOT / "assets/sprites/mare-missao-lote9"

TEXTURES = ("metal-corroido", "lona-encardida", "pedra-molhada")
SPRITES = (
    "lanterna-querosene",
    "bote-salva-vidas",
    "guincho-manual",
    "cristal-drusa",
    "peixe-morto",
    "bandeira-sinal",
    "cogumelo-sal",
)


def is_magenta(r, g, b):
    return r > 200 and b > 200 and g < 70


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
    image = Image.open(SRC / f"{name}.png").convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            if is_magenta(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)
    bounds = image.getbbox()
    if bounds:
        image = image.crop(bounds)
    scale = 192 / max(image.size)
    if scale < 1:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.NEAREST,
        )
    image.putalpha(image.getchannel("A").filter(ImageFilter.MinFilter(5)))
    bounds = image.getbbox()
    if bounds:
        image = image.crop(bounds)
    image.save(SPR / f"{name}.png", optimize=True)
    print(f"prop {name} {image.width}x{image.height}")


if __name__ == "__main__":
    TEX.mkdir(parents=True, exist_ok=True)
    SPR.mkdir(parents=True, exist_ok=True)
    for name in TEXTURES:
        prepare_texture(name)
    for name in SPRITES:
        prepare_sprite(name)
    print("OK: 3 texturas, 7 props")
