#!/usr/bin/env python3
"""Prepara texturas e sprites do upgrade PSX da Maré Cromática.

Originais em assets/source-art/mare-upgrade (1024/1408 px). O jogo usa
texturas 256x256 com NearestFilter e sprites recortados com alfa erodido.
Nada aqui é reutilizado de lotes anteriores.
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import shutil

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/mare-upgrade"
TEX = ROOT / "assets/textures/mare-upgrade"
SPR = ROOT / "assets/sprites/mare-upgrade"
TEX.mkdir(parents=True, exist_ok=True)
SPR.mkdir(parents=True, exist_ok=True)

TEXTURES = {
    "madeira-tabuas": "01-madeira-tabuas.png",
    "concreto-limoso": "03-concreto-limoso.png",
    "agua-negra": "04-agua-negra.png",
    "pier-madeira": "05-pier-madeira.png",
    "rocha-basalto": "06-rocha-basalto.png",
    "container-ferrugem": "08-container-marrom.png",
}
SPRITES = {
    "cristal-magenta": ("07-cristal-magenta.png", 300),
    "terminal-baia": ("09-terminal-industrial.png", 360),
    "farol-lanterna": ("10-farol-lanterna.png", 300),
}

def quantize(im, colors=48):
    return im.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")

for out, name in TEXTURES.items():
    im = Image.open(SRC / name).convert("RGB")
    # Enquadramento quadrado e 256 px: tamanho de textura PS1 sem esticar UV.
    side = min(im.size)
    im = im.crop(((im.width - side)//2, (im.height - side)//2, (im.width + side)//2, (im.height + side)//2))
    im = im.resize((256, 256), Image.Resampling.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.86)
    im = ImageEnhance.Contrast(im).enhance(1.16)
    im = quantize(im, 56)
    im.save(TEX / f"{out}.png", optimize=True)
    print("textura", out, "256x256")

def keyed_black(im):
    """Chave de preto com borda suave; preserva o glow magenta."""
    im = im.convert("RGB")
    px = im.load()
    alpha = Image.new("L", im.size, 0)
    ap = alpha.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            m = max(r, g, b)
            if m <= 10:
                a = 0
            elif m < 42:
                a = int((m - 10) / 32 * 110)
            else:
                a = min(255, 120 + int((m - 42) * 1.4))
            ap[x, y] = a
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 22 else 0).getbbox()
    if box:
        out = out.crop(box)
    return out

for out, (name, max_h) in SPRITES.items():
    im = Image.open(SRC / name)
    im = keyed_black(im)
    if im.height > max_h:
        w = round(im.width * max_h / im.height)
        im = im.resize((w, max_h), Image.Resampling.LANCZOS)
    im = quantize(im.convert("RGB"), 64).convert("RGBA") if False else im
    im.save(SPR / f"{out}.png", optimize=True)
    print("sprite", out, im.size)

# Variante de metal ondulado criada a partir da textura de contêiner (sem
# reutilizar arte de lotes anteriores): faixas verticais, ferrugem e rebites.
container = Image.open(TEX / "container-ferrugem.png").convert("RGB")
w, h = container.size
metal = Image.new("RGB", (w, h))
mp = metal.load()
cp = container.load()
for y in range(h):
    for x in range(w):
        r, g, b = cp[x, y]
        ridge = 1.18 if (x // 16) % 3 == 1 else 0.74 if (x // 16) % 3 == 2 else 1.0
        seam = 0.55 if x % 48 < 2 else 1.0
        rust = 1.18 if (x * 7 + y * 3) % 97 < 8 else 1.0
        mp[x, y] = (min(255, int(r * ridge * seam * rust)), min(255, int(g * ridge * seam * 0.82)), min(255, int(b * ridge * seam * 0.72)))
metal = quantize(metal, 48)
metal.save(TEX / "metal-ondulado.png", optimize=True)
print("textura metal-ondulado 256x256")
