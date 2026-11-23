#!/usr/bin/env python3
"""Pipeline do upgrade "Maré Cromática — Orla Aberta".

Texturas e sprites próprios da praia/pícar. O script tem fallback procedural
nítido: se um original gerado faltar ou falhar, desenha a textura/silhueta em
PIL para o jogo nunca carregar um buraco.

Uso:
    python3 tools/preparar-mare-coast.py
    python3 tools/preparar-mare-coast.py --force-fallback
"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/mare-coast"
TEX = ROOT / "assets/textures/mare-coast"
SPR = ROOT / "assets/sprites/mare-coast"
TEX.mkdir(parents=True, exist_ok=True)
SPR.mkdir(parents=True, exist_ok=True)

TEXTURES = {
    "areia-molhada": "areia-molhada.png",
    "areia-seca": "areia-seca.png",
    "pedras-praia": "pedras-praia.png",
    "tabuas-pier": "tabuas-pier.png",
    "madeira-cabana": "madeira-cabana.png",
    "telha-ferrugem": "telha-ferrugem.png",
    "rocha-escura": "rocha-escura.png",
    "cristal-cromatico": "cristal-cromatico.png",
    "casco-barco": "casco-barco.png",
    "penhasco-farol": "penhasco-farol.png",
    "espuma-mar": "espuma-mar.png",
    "agua-rasa-caustica": "agua-rasa-caustica.png",
    "parede-concreto-sal": "parede-concreto-sal.png",
    "piso-pier-molhado": "piso-pier-molhado.png",
    "areia-conchas": "areia-conchas.png",
    "parede-azulejo-mar": "parede-azulejo-mar.png",
}

# Cada folha é uma linha com quatro poses; o pipeline recorta em colunas iguais.
# (arquivo, poses, fundo, linhas). O guardião veio em grade 4x2; usamos a
# primeira linha, que traz as quatro poses na ordem correta.
SHEETS = {
    "nulo": ("nulo-sheet.png", ["idle", "walk", "glitch", "lunge"], "black", 1),
    "afogado": ("afogado-sheet.png", ["idle", "walk", "glitch", "lunge"], "white", 1),
    "guardiao": ("guardiao-sheet.png", ["idle", "walk", "glitch", "lunge"], "white", 2),
}
SINGLES = {
    "terminal-recompilacao": "terminal-recompilacao.png",
    "ancora-cromatica": "ancora-cromatica.png",
    "pier-zero": "pier-zero.png",
    "barco-destroco": "barco-destroco.png",
    "nulo-sobrecarga": "nulo-sobrecarga.png",
    "cristal-cluster": "cristal-cluster.png",
    "vegetacao-duna": "vegetacao-duna.png",
    "caranguejo": "caranguejo.png",
    "gaivota": "gaivota.png",
    "peixe": "peixe.png",
    "onda": "onda.png",
}


def rng(seed: str) -> random.Random:
    return random.Random(sum((i + 1) * ord(c) for i, c in enumerate(seed)))


def texture_fallback(name: str) -> Image.Image:
    """Textura procedural 256px, com grão, veios e paleta por material."""
    r = rng(name)
    palette = {
        "areia-molhada": ((10, 22, 24), (46, 48, 35)),
        "areia-seca": ((48, 54, 48), (116, 108, 82)),
        "pedras-praia": ((7, 15, 18), (64, 82, 80)),
        "tabuas-pier": ((24, 24, 21), (105, 93, 68)),
        "madeira-cabana": ((17, 21, 18), (76, 77, 56)),
        "telha-ferrugem": ((27, 16, 13), (142, 74, 35)),
        "rocha-escura": ((5, 10, 14), (66, 80, 82)),
        "cristal-cromatico": ((20, 5, 28), (164, 45, 190)),
        "casco-barco": ((13, 24, 24), (115, 62, 38)),
        "penhasco-farol": ((12, 17, 20), (79, 86, 80)),
        "espuma-mar": ((4, 12, 14), (208, 226, 214)),
        "agua-rasa-caustica": ((5, 16, 20), (74, 142, 148)),
        "parede-concreto-sal": ((28, 32, 30), (132, 136, 124)),
        "piso-pier-molhado": ((10, 14, 13), (94, 86, 64)),
        "areia-conchas": ((28, 30, 26), (150, 142, 116)),
        "parede-azulejo-mar": ((18, 44, 46), (128, 168, 160)),
    }[name]
    im = Image.new("RGB", (256, 256))
    px = im.load()
    lo, hi = palette
    for y in range(256):
        for x in range(256):
            n = r.random() * 0.55 + (math.sin(x * 0.11 + y * 0.07) + 1) * 0.1
            t = min(1, max(0, n))
            px[x, y] = tuple(int(lo[i] + (hi[i] - lo[i]) * t) for i in range(3))
    d = ImageDraw.Draw(im)
    if "areia" in name or name == "pedras-praia":
        for _ in range(22):
            yy = r.randrange(256)
            pts = [(x, yy + math.sin(x * 0.12 + r.random()) * 2) for x in range(0, 257, 8)]
            d.line(pts, fill=hi if r.random() > 0.5 else lo, width=1)
    if name in ("tabuas-pier", "madeira-cabana"):
        step = 31 if name == "tabuas-pier" else 17
        for y in range(0, 256, step):
            d.line((0, y, 255, y), fill=(7, 9, 8), width=2)
            d.line((0, y + 2, 255, y + 2), fill=(86, 80, 58), width=1)
    if name == "telha-ferrugem":
        for x in range(0, 256, 20):
            d.line((x, 0, x, 255), fill=(58, 29, 16), width=2)
            d.line((x + 2, 0, x + 2, 255), fill=(134, 65, 31), width=1)
    if name == "cristal-cromatico":
        for _ in range(34):
            x, y = r.randrange(256), r.randrange(256)
            d.polygon([(x, y - 12), (x + 7, y), (x, y + 12), (x - 5, y)], fill=(216, 64, 234))
    if name in ("rocha-escura", "penhasco-farol"):
        for _ in range(16):
            pts = [(r.randrange(256), r.randrange(256)) for _ in range(5)]
            d.line(pts, fill=(4, 7, 8), width=2)
    if name == "espuma-mar":
        for _ in range(90):
            x, y = r.randrange(256), r.randrange(256)
            d.arc((x - 30, y - 8, x + 30, y + 8), 190, 350, fill=(214, 232, 220), width=1 + r.randrange(2))
            d.ellipse((x, y, x + 2 + r.randrange(5), y + 2 + r.randrange(4)), fill=(226, 240, 228))
    if name == "agua-rasa-caustica":
        for _ in range(46):
            x, y = r.randrange(256), r.randrange(256)
            pts = [(x + i * 6, y + math.sin(i * 0.8 + r.random()) * 5) for i in range(7)]
            d.line(pts, fill=(96, 168, 172), width=1)
    if name == "parede-concreto-sal":
        for _ in range(13):
            x = r.randrange(256)
            d.line((x, 0, x + r.randrange(-6, 7), 255), fill=(118, 120, 108), width=1 + r.randrange(2))
        for _ in range(9):
            x, y = r.randrange(256), r.randrange(40, 256)
            d.line((x, y, x + r.randrange(-14, 15), y + r.randrange(10, 50)), fill=(74, 42, 28), width=2)
    if name == "piso-pier-molhado":
        for y in range(0, 256, 33):
            d.line((0, y, 255, y), fill=(4, 7, 7), width=3)
            d.line((0, y + 3, 255, y + 3), fill=(62, 58, 46), width=1)
        for _ in range(20):
            x, y = r.randrange(256), r.randrange(256)
            d.ellipse((x, y, x + 3, y + 3), fill=(92, 54, 32))
    if name == "areia-conchas":
        for _ in range(70):
            x, y = r.randrange(256), r.randrange(256)
            d.arc((x, y, x + 4 + r.randrange(6), y + 3 + r.randrange(5)), 180, 350, fill=(190, 184, 158), width=1)
    if name == "parede-azulejo-mar":
        for y in range(0, 256, 32):
            d.line((0, y, 255, y), fill=(8, 16, 17), width=2)
        for x in range(0, 256, 32):
            d.line((x, 0, x, 255), fill=(8, 16, 17), width=2)
        for _ in range(12):
            x, y = r.randrange(256), r.randrange(256)
            d.line((x, y, x + r.randrange(-18, 19), y + r.randrange(-18, 19)), fill=(10, 14, 14), width=1)
    return im.filter(ImageFilter.SMOOTH)


def quantize(im: Image.Image, colors: int = 56) -> Image.Image:
    return (
        im.convert("RGB")
        .quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        .convert("RGB")
    )


def key_black(im: Image.Image) -> Image.Image:
    """Chave de preto suave, preservando glow e bordas duras de sprite."""
    im = im.convert("RGB")
    px = im.load()
    alpha = Image.new("L", im.size, 0)
    ap = alpha.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            m = max(r, g, b)
            if m <= 7:
                a = 0
            elif m < 30:
                a = int(255 * (m - 7) / 23)
            else:
                a = 255
            ap[x, y] = a
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def key_white(im: Image.Image) -> Image.Image:
    """Chave de fundo branco: preserva contorno preto e luzes claras do sprite."""
    im = im.convert("RGB")
    px = im.load()
    alpha = Image.new("L", im.size, 255)
    ap = alpha.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            m = min(r, g, b)
            if m >= 242:
                a = 0
            elif m > 224:
                a = int(255 * (242 - m) / 18)
            else:
                a = 255
            ap[x, y] = 0 if a < 40 else a
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def background_is_light(im: Image.Image) -> bool:
    """Amostra as bordas; fundos brancos vão para key_white."""
    im = im.convert("RGB")
    w, h = im.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
           (w // 2, 2), (2, h // 2), (w - 3, h // 2)]
    total = sum(sum(im.getpixel(pt)) / 3 for pt in pts) / len(pts)
    return total > 170


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fallback_figure(kind: str, pose: int) -> Image.Image:
    """Silhuetas de 4 poses, legíveis mesmo sem a arte gerada."""
    w, h = 256, 384
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == "nulo":
        body, glow = (6, 12, 14, 255), (210, 50, 220, 235)
        sway = [0, 8, -12, 22][pose]
        leg = [0, 16, -8, 26][pose]
        d.ellipse((84 + sway, 32, 172 + sway, 104), fill=body)
        d.polygon(
            [(74 + sway, 92), (182 + sway, 92), (204 - sway, 310), (104 + sway, 310)],
            fill=body,
        )
        d.line((106 + sway, 100, 52 + sway, 274), fill=body, width=19)
        d.line((158 + sway, 100, 212 + sway, 270 + leg), fill=body, width=17)
        d.line((118 + sway, 300, 102 - leg, 380), fill=body, width=24)
        d.line((150 + sway, 300, 166 + leg, 380), fill=body, width=22)
        d.line((112 + sway, 58, 150 + sway, 78), fill=glow, width=7)
        for i in range(4):
            y = 120 + i * 44 + (pose == 2) * (i * 7)
            d.line((84 + sway, y, 184 + sway + (pose == 2) * 18, y - 8), fill=(26, 58, 62, 255), width=4)
    elif kind == "afogado":
        body, coat, glow = (15, 18, 15, 255), (112, 99, 46, 255), (36, 176, 188, 255)
        lean = [8, 16, -9, 30][pose]
        d.ellipse((76 + lean, 66, 188 + lean, 168), fill=body)
        d.polygon(
            [(64 + lean, 144), (198 + lean, 128), (222 - lean, 320), (82 + lean, 330)],
            fill=coat,
        )
        d.line((88 + lean, 170, 38 + lean, 300), fill=body, width=24)
        d.line((186 + lean, 166, 236 + lean, 296 + pose * 9), fill=body, width=22)
        d.line((112, 326, 96 - lean, 382), fill=body, width=26)
        d.line((162, 326, 180 + lean, 382), fill=body, width=25)
        d.ellipse((98 + lean, 84, 126 + lean, 112), fill=(2, 4, 3, 255))
        d.ellipse((150 + lean, 82, 178 + lean, 110), fill=(2, 4, 3, 255))
        d.line((110 + lean, 134, 176 + lean, 142), fill=(8, 10, 8, 255), width=5)
        for i in range(6):
            d.line((72 + lean + i * 20, 150, 62 + lean + i * 23, 300), fill=(54, 72, 52, 255), width=2)
        d.arc((100 + lean, 34, 190 + lean, 120), 200, 340, fill=glow, width=3)
    else:
        body, rust, glow = (18, 21, 22, 255), (92, 48, 30, 255), (225, 154, 61, 255)
        d.rectangle((50, 74, 210, 330), fill=body)
        d.ellipse((84, 34, 178, 112), fill=body)
        d.rectangle((32, 126, 74, 318), fill=rust)
        d.rectangle((190, 120, 236, 316), fill=rust)
        d.line((22, 292, 70, 190), fill=rust, width=15)
        d.line((202, 286, 246, 110), fill=rust, width=17)
        d.ellipse((100, 150, 162, 216), fill=glow)
        d.line((110, 330, 92, 382), fill=body, width=34)
        d.line((160, 330, 182, 382), fill=body, width=34)
        for i in range(5):
            d.arc((30 + i * 12, 80 + i * 30, 230 - i * 6, 380), 20, 160, fill=(56, 62, 64, 255), width=3)
    if pose == 2:  # glitch: fatias cromáticas fora do corpo
        shifted = ImageChops.offset(im, 9, 0)
        magenta = Image.new("RGBA", im.size, (215, 40, 225, 0))
        magenta.putalpha(shifted.getchannel("A").point(lambda a: int(a * 0.35)))
        im = Image.alpha_composite(im, magenta)
        d = ImageDraw.Draw(im)
        for y in range(60, 360, 19):
            d.rectangle((20, y, 240, y + 2), fill=(32, 210, 220, 95))
    return im


def fallback_landmark(name: str) -> Image.Image:
    w, h = 256, 384
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if name == "terminal-recompilacao":
        d.rectangle((14, 328, 242, 364), fill=(18, 24, 24, 255))
        d.polygon([(32, 320), (224, 320), (244, 372), (12, 372)], fill=(38, 48, 47, 255))
        d.rectangle((58, 152, 198, 320), fill=(24, 30, 30, 255))
        d.rectangle((72, 176, 184, 250), fill=(20, 82, 78, 255))
        for i in range(5):
            d.line((80, 188 + i * 12, 168 + i * 3, 188 + i * 12), fill=(94, 224, 196, 255), width=2)
        d.line((196, 320, 228, 96), fill=(18, 20, 19, 255), width=6)
        d.line((210, 116, 238, 108), fill=(160, 54, 196, 255), width=3)
        d.ellipse((202, 96, 218, 112), fill=(210, 60, 230, 255))
    elif name == "ancora-cromatica":
        d.line((128, 40, 128, 330), fill=(45, 50, 50, 255), width=22)
        d.line((50, 118, 206, 118), fill=(45, 50, 50, 255), width=18)
        d.arc((44, 130, 212, 330), 0, 180, fill=(45, 50, 50, 255), width=20)
        d.line((44, 230, 18, 196), fill=(60, 64, 62, 255), width=12)
        d.line((212, 230, 238, 196), fill=(60, 64, 62, 255), width=12)
        for i in range(10):
            x = 44 + i * 18
            d.polygon([(x, 150 - (i % 3) * 12), (x + 8, 110), (x + 16, 150)], fill=(196, 42, 208, 255))
        d.ellipse((96, 20, 160, 84), outline=(70, 84, 82, 255), width=9)
    elif name == "pier-zero":
        d.rectangle((20, 150, 54, 360), fill=(56, 42, 29, 255))
        d.rectangle((202, 150, 236, 360), fill=(56, 42, 29, 255))
        d.rectangle((12, 128, 244, 162), fill=(68, 51, 34, 255))
        d.line((128, 158, 128, 244), fill=(98, 75, 42, 255), width=4)
        d.arc((98, 232, 158, 296), 0, 180, fill=(118, 82, 34, 255), width=15)
        d.ellipse((116, 278, 142, 302), fill=(48, 35, 22, 255))
        d.line((54, 162, 202, 168), fill=(112, 95, 62, 255), width=6)
    elif name == "barco-destroco":
        d.polygon([(18, 260), (224, 232), (206, 352), (40, 356)], fill=(48, 38, 31, 255))
        d.polygon([(66, 222), (170, 208), (190, 262), (58, 272)], fill=(57, 47, 38, 255))
        d.rectangle((104, 164, 154, 222), fill=(30, 37, 37, 255))
        d.line((132, 160, 198, 30), fill=(50, 45, 34, 255), width=7)
        d.line((156, 168, 222, 100), fill=(50, 45, 34, 255), width=4)
        d.line((26, 268, 112, 236), fill=(115, 58, 34, 255), width=4)
    elif name == "nulo-sobrecarga":
        d.ellipse((78, 22, 178, 112), fill=(8, 4, 10, 255))
        d.polygon([(50, 100), (206, 100), (236, 336), (22, 336)], fill=(8, 4, 10, 255))
        for i in range(14):
            y = 100 + i * 17
            x0 = 30 + (i % 3) * 18
            d.rectangle((x0, y, 230 - (i % 4) * 14, y + 3), fill=(214, 40, 225, 180))
        for i in range(10):
            x = 16 + i * 25
            d.line((128, 180, x, 40 + (i % 4) * 30), fill=(52, 220, 226, 180), width=2)
    elif name == "cristal-cluster":
        d.polygon([(16, 356), (64, 290), (198, 300), (244, 360)], fill=(22, 28, 28, 255))
        for i in range(7):
            x = 54 + i * 24
            d.polygon([(x, 306), (x + 14, 120 + (i % 3) * 32), (x + 30, 306)], fill=(196, 40, 214, 255))
            d.line((x + 14, 306, x + 14, 150), fill=(246, 154, 255, 255), width=2)
    elif name == "caranguejo":
        d.ellipse((58, 128, 198, 250), fill=(168, 164, 140, 255))
        d.ellipse((62, 132, 194, 240), fill=(190, 186, 160, 255))
        d.line((64, 150, 26, 96), fill=(150, 146, 124, 255), width=13)
        d.line((192, 150, 230, 96), fill=(150, 146, 124, 255), width=13)
        d.polygon([(26, 96), (10, 58), (44, 84)], fill=(168, 164, 140, 255))
        d.polygon([(230, 96), (246, 58), (212, 84)], fill=(168, 164, 140, 255))
        for i in range(4):
            d.line((74 + i * 12, 220, 36 + i * 18, 300 + (i % 2) * 24), fill=(140, 136, 114, 255), width=7)
            d.line((182 - i * 12, 220, 220 - i * 18, 300 + (i % 2) * 24), fill=(140, 136, 114, 255), width=7)
        d.ellipse((100, 108, 112, 136), fill=(20, 22, 20, 255))
        d.ellipse((144, 108, 156, 136), fill=(20, 22, 20, 255))
    elif name == "gaivota":
        d.ellipse((86, 150, 196, 226), fill=(214, 222, 218, 255))
        d.ellipse((168, 138, 208, 176), fill=(226, 232, 226, 255))
        d.polygon([(204, 154), (238, 162), (204, 170)], fill=(214, 142, 62, 255))
        d.polygon([(92, 168), (10, 84), (72, 196)], fill=(178, 190, 188, 255))
        d.polygon([(146, 158), (236, 44), (184, 176)], fill=(160, 174, 174, 255))
        d.polygon([(10, 84), (44, 74), (72, 196)], fill=(36, 42, 44, 255))
        d.polygon([(236, 44), (210, 52), (184, 176)], fill=(34, 40, 42, 255))
    elif name == "peixe":
        d.ellipse((66, 126, 214, 226), fill=(188, 202, 202, 255))
        d.polygon([(214, 176), (246, 136), (246, 216)], fill=(156, 176, 180, 255))
        d.ellipse((84, 144, 104, 164), fill=(22, 28, 30, 255))
        d.arc((106, 150, 178, 210), 20, 160, fill=(146, 162, 164, 255), width=2)
        d.polygon([(128, 126), (146, 100), (160, 128)], fill=(152, 170, 174, 255))
        d.polygon([(128, 226), (146, 250), (160, 226)], fill=(152, 170, 174, 255))
    elif name == "onda":
        d.pieslice((40, 70, 250, 340), 180, 330, fill=(52, 96, 100, 255))
        d.arc((40, 70, 250, 300), 180, 345, fill=(214, 228, 216, 255), width=16)
        d.arc((56, 94, 234, 286), 190, 340, fill=(166, 194, 188, 255), width=7)
        for i in range(9):
            x, y = 150 + i * 10, 80 + (i % 3) * 12
            d.ellipse((x, y, x + 4, y + 4), fill=(220, 234, 222, 255))
    elif name == "vegetacao-duna":
        for i in range(16):
            x = 18 + i * 14
            d.line((x, 372, x - 30 + (i % 5) * 12, 150 + (i % 4) * 28), fill=(104, 96, 60, 255), width=2)
    else:
        d.rectangle((48, 64, 208, 360), fill=(60, 60, 56, 255))
    return trim(im, 3)


def prepare_texture(name: str, source: str, force_fallback: bool) -> None:
    src = SRC / source
    if src.exists() and not force_fallback:
        try:
            im = Image.open(src).convert("RGB")
        except Exception as exc:  # imagem corrompida cai no procedural
            print("fallback", name, "erro:", exc)
            im = texture_fallback(name)
    else:
        im = texture_fallback(name)
    side = min(im.size)
    im = im.crop(
        ((im.width - side) // 2, (im.height - side) // 2,
         (im.width + side) // 2, (im.height + side) // 2)
    )
    im = im.resize((256, 256), Image.Resampling.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.9)
    im = ImageEnhance.Contrast(im).enhance(1.14)
    im = quantize(im, 64)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=3))
    if name == "areia-conchas":
        # conchas muito contrastadas viram chuvisco/moire no chão em ângulo rasante
        im = ImageEnhance.Contrast(im).enhance(0.62)
        im = im.filter(ImageFilter.GaussianBlur(0.45))
    im.save(TEX / f"{name}.png", optimize=True)
    print("textura", name, "256x256")


def prepare_sheet(base: str, source: str, poses: list[str], force_fallback: bool,
                  bg: str = "black", rows: int = 1) -> None:
    src = SRC / source
    frames: list[Image.Image] = []
    if src.exists() and not force_fallback:
        try:
            sheet = Image.open(src).convert("RGB")
            # Cada pose ocupa uma coluna; grades 4x2 usam só a primeira linha.
            cw = sheet.width / len(poses)
            rh = sheet.height / max(1, rows)
            for i in range(len(poses)):
                col = sheet.crop((round(i * cw), 2, round((i + 1) * cw), round(rh) - 2))
                frames.append(key_white(col) if bg == "white" else key_black(col))
        except Exception as exc:
            print("fallback", base, "erro:", exc)
            frames = []
    if len(frames) != len(poses):
        frames = [fallback_figure(base, i) for i in range(len(poses))]
    for i, im in enumerate(frames):
        im = trim(im, 4)
        # Mantém leitura PS1: no máximo 200x320 por frame.
        im.thumbnail((200, 320), Image.Resampling.LANCZOS)
        im = im.resize(
            (max(1, round(im.width / 2) * 2), max(1, round(im.height / 2) * 2)),
            Image.Resampling.NEAREST,
        )
        im.save(SPR / f"{base}-{i}.png", optimize=True)
    print("folha", base, len(poses), "frames", "fallback" if not src.exists() or force_fallback else "gerada")


def prepare_single(name: str, source: str, force_fallback: bool) -> None:
    src = SRC / source
    if src.exists() and not force_fallback:
        try:
            raw = Image.open(src).convert("RGB")
            im = key_white(raw) if background_is_light(raw) else key_black(raw)
        except Exception as exc:
            print("fallback", name, "erro:", exc)
            im = fallback_landmark(name)
    else:
        im = fallback_landmark(name)
    im = trim(im, 3)
    im.thumbnail((256, 384), Image.Resampling.LANCZOS)
    im.save(SPR / f"{name}.png", optimize=True)
    print("sprite", name, im.size)


def main() -> None:
    force = "--force-fallback" in sys.argv
    for name, source in TEXTURES.items():
        prepare_texture(name, source, force)
    for base, (source, phases, bg, rows) in SHEETS.items():
        prepare_sheet(base, source, phases, force, bg, rows)
    for name, source in SINGLES.items():
        prepare_single(name, source, force)
    print("OK:", len(TEXTURES), "texturas,", sum(len(v[1]) for v in SHEETS.values()),
          "frames animados,", len(SINGLES), "sprites de marco")


if __name__ == "__main__":
    main()
