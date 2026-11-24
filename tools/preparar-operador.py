#!/usr/bin/env python3
"""Prepara a arte do operador civil (ficha + Tripo c4343c10) para o jogo.

Texturas 256x256 com NearestFilter para o rig 3D; retratos 192x192 e um
dossiê vertical para o HUD. O cabelo é recortado da própria ficha (nuca), então
mantém o mesmo tom e o mesmo desenho de cachos do modelo.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/operador"
TEX = ROOT / "assets/textures/operador"
SPR = ROOT / "assets/sprites/operador"
SHEET = SRC / "ficha-operador.png"

TEXTURES = {
    "tatuagem-manga": "tatuagem-manga.png",
    "tecido-regata": "tecido-regata.png",
    "tecido-carga": "tecido-carga.png",
    "pele-operador": "pele-operador.png",
}
PORTRAITS = {
    "operador-neutro": "operador-neutro.png",
    "operador-alerta": "operador-alerta.png",
    "operador-ferido": "operador-ferido.png",
    "operador-cansado": "operador-cansado.png",
}


def quantize(im: Image.Image, colors: int) -> Image.Image:
    return im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")


def prepare_texture(name: str, source: Path) -> None:
    im = Image.open(source).convert("RGB")
    side = min(im.size)
    im = im.crop(((im.width - side) // 2, (im.height - side) // 2,
                  (im.width + side) // 2, (im.height + side) // 2))
    im = im.resize((256, 256), Image.Resampling.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.92)
    im = ImageEnhance.Contrast(im).enhance(1.04)
    if name == "tatuagem-manga":
        # Recolore a pele do mapa para o mesmo tom do rig e transforma a
        # luminância em tinta preta: sem isso o braço vira um padrão dourado.
        lum = im.convert("L")
        base = Image.new("RGB", im.size, (136, 92, 64))
        ink = Image.new("RGB", im.size, (38, 46, 48))
        # Só a linha escura vira tinta; o resto é pele lisa. Com máscara
        # contínua o braço inteiro ficava bronzeado e parecia armadura.
        mask = lum.point(lambda v: 255 if v < 118 else 0)
        mask = mask.filter(ImageFilter.GaussianBlur(0.7))
        im = Image.composite(ink, base, mask)
    elif name == "tecido-carga":
        im = im.filter(ImageFilter.GaussianBlur(0.3))
        im = ImageEnhance.Contrast(im).enhance(0.9)
    elif name == "tecido-regata":
        im = im.filter(ImageFilter.GaussianBlur(0.45))
        im = ImageEnhance.Contrast(im).enhance(0.86)
    im = quantize(im, 56)
    if name not in {"tatuagem-manga", "tecido-carga", "tecido-regata"}:
        im = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=35, threshold=2))
    im.save(TEX / f"{name}.png", optimize=True)
    print("textura", name, "256x256")


def prepare_hair() -> None:
    # Nuca da ficha: só cachos, sem rosto nem fundo.
    sheet = Image.open(SHEET).convert("RGB")
    crop = sheet.crop((918, 68, 1014, 142)).resize((256, 256), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Color(crop).enhance(0.9)
    crop = ImageEnhance.Contrast(crop).enhance(1.08)
    crop = quantize(crop, 48)
    crop = crop.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
    if SHEET.exists():
        crop.save(SRC / "cabelo-cachos.png", optimize=True)
    crop.save(TEX / "cabelo-cachos.png", optimize=True)
    print("textura cabelo-cachos 256x256 (recorte da ficha)")


def prepare_portrait(name: str, source: Path) -> None:
    im = Image.open(source).convert("RGB")
    # Leve zoom no busto para o rosto ocupar o cartão do HUD.
    w, h = im.size
    im = im.crop((int(w * 0.06), int(h * 0.02), int(w * 0.94), int(h * 0.98)))
    im = ImageOps.fit(im, (192, 192), Image.Resampling.LANCZOS, centering=(0.5, 0.3))
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = quantize(im, 64)
    im.convert("RGBA").save(SPR / f"{name}.png", optimize=True)
    print("retrato", name, "192x192")


def prepare_dossier() -> None:
    im = Image.open(SRC / "operador-dossie.png").convert("RGB")
    # Recorta o fundo chapado usando a cor do canto como referência.
    bg = Image.new("RGB", im.size, im.getpixel((0, 0)))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 16 else 0)
    box = diff.getbbox() or (0, 0, im.width, im.height)
    pad = 18
    box = (max(0, box[0] - pad), max(0, box[1] - pad),
           min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    im = im.crop(box)
    im.thumbnail((520, 900), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (im.width, im.height + 20), (18, 22, 25))
    canvas.paste(im, (0, 10))
    canvas = quantize(canvas, 96)
    canvas.convert("RGBA").save(SPR / "operador-dossie.png", optimize=True)
    print("dossie", canvas.size)


def main() -> None:
    TEX.mkdir(parents=True, exist_ok=True)
    SPR.mkdir(parents=True, exist_ok=True)
    force = "--fallback" in sys.argv
    for name, source in TEXTURES.items():
        path = SRC / source
        if not path.exists() or force:
            print("fallback", name)
            Image.new("RGB", (256, 256), (150, 120, 95)).save(TEX / f"{name}.png")
            continue
        prepare_texture(name, path)
    if SHEET.exists():
        prepare_hair()
    else:
        print("fallback cabelo-cachos")
    for name, source in PORTRAITS.items():
        path = SRC / source
        if path.exists():
            prepare_portrait(name, path)
        else:
            print("fallback retrato", name)
    if (SRC / "operador-dossie.png").exists():
        prepare_dossier()
    print("OK:", len(TEXTURES) + 1, "texturas,", len(PORTRAITS), "retratos, 1 dossie")


if __name__ == "__main__":
    main()
