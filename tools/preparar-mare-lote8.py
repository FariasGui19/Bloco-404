#!/usr/bin/env python3
"""Maré Cromática — lote 8: dez props autorais da orla.

As dez fontes são desenhadas aqui (vetor rasterizado em 512 px, fundo magenta
chapado) e depois preparadas como sprites PSX de 192 px: chave magenta,
redução com NEAREST, erosão de 1 px no alfa e recorte no bbox. Nenhum arquivo
de lotes anteriores é reutilizado.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/mare-missao-lote8"
DST = ROOT / "assets/sprites/mare-missao-lote8"
MAGENTA = (255, 0, 255, 255)
S = 512
DARK = (16, 26, 30, 255)
RUST = (128, 70, 48, 255)
RUST_L = (166, 98, 66, 255)
RUST_D = (84, 46, 34, 255)
TEAL = (58, 84, 80, 255)
TEAL_L = (86, 120, 112, 255)
TEAL_D = (34, 52, 54, 255)
METAL = (112, 128, 124, 255)
AMBER = (232, 161, 60, 255)
GLOW = (255, 214, 138, 255)
MAG = (206, 62, 158, 255)
MAG_L = (244, 120, 196, 255)
CYAN = (84, 216, 206, 255)
BONE = (196, 186, 158, 255)


def poly(d, pts, fill, outline=DARK, w=5):
    d.polygon(pts, fill=fill)
    if w:
        d.line(list(pts) + [pts[0]], fill=outline, width=w, joint="curve")


def box(d, x0, y0, x1, y1, front, side=None, top=None, w=5):
    """Bloco isométrico simples: frente, lateral e topo."""
    side = side or front
    top = top or front
    poly(d, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], front, w=w)
    if side is not front:
        dx = max(8, (x1 - x0) // 6)
        poly(d, [(x1, y0), (x1 + dx, y0 - dx // 2), (x1 + dx, y1 - dx // 2), (x1, y1)], side, w=w)
    if top is not front:
        dx = max(8, (x1 - x0) // 6)
        poly(d, [(x0, y0), (x1, y0), (x1 + dx, y0 - dx // 2), (x0 + dx, y0 - dx // 2)], top, w=w)


def glow(d, x, y, r, color, alpha=90):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer)
    for i in range(4):
        rr = int(r * (1 + i * 0.55))
        g.ellipse((x - rr, y - rr, x + rr, y + rr), fill=color[:3] + (alpha // (i + 2),))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.35))
    d._image.alpha_composite(layer)


def canvas():
    im = Image.new("RGBA", (S, S), MAGENTA)
    d = ImageDraw.Draw(im)
    d._image = im
    return im, d


# ---------------------------------------------------------------- props


def boia():
    im, d = canvas()
    glow(d, 256, 150, 52, AMBER, 120)
    # corpo da boia
    d.ellipse((158, 210, 354, 400), fill=RUST, outline=DARK, width=6)
    d.ellipse((176, 226, 336, 384), fill=RUST_L)
    d.rectangle((158, 292, 354, 330), fill=BONE)
    d.rectangle((158, 292, 354, 300), fill=TEAL_D)
    d.arc((176, 226, 336, 384), 20, 160, fill=RUST_D, width=10)
    # topo e lanterna
    box(d, 228, 150, 284, 218, RUST_D, RUST, RUST_L, w=5)
    d.rectangle((236, 128, 276, 168), fill=TEAL_D, outline=DARK, width=4)
    d.ellipse((242, 134, 270, 162), fill=GLOW, outline=AMBER, width=3)
    for x in (240, 256, 272):
        d.line((x, 128, x, 170), fill=DARK, width=4)
    # corrente
    for i in range(4):
        d.ellipse((248 + i * 3, 96 + i * 14, 266 - i * 3, 118 + i * 14), outline=METAL, width=4)
    # boias laterais
    for x in (128, 356):
        d.ellipse((x, 318, x + 40, 358), fill=TEAL_L, outline=DARK, width=4)
    return im


def guindaste():
    im, d = canvas()
    box(d, 92, 392, 260, 452, RUST_D, RUST, RUST_L)
    box(d, 150, 176, 214, 404, TEAL, TEAL_D, TEAL_L)
    # lança
    poly(d, [(182, 196), (206, 186), (452, 108), (446, 142)], TEAL_L, DARK, 6)
    d.line((198, 190, 448, 126), fill=TEAL_D, width=8)
    # tirantes
    d.line((196, 206, 330, 150), fill=METAL, width=5)
    d.line((196, 230, 420, 150), fill=METAL, width=4)
    # cabo e gancho
    d.line((434, 136, 434, 300), fill=DARK, width=5)
    d.arc((408, 300, 460, 350), 200, 340, fill=METAL, width=9)
    d.polygon([(428, 344), (440, 344), (434, 366)], fill=METAL, outline=DARK)
    # contrapeso e caixa
    box(d, 118, 320, 172, 392, RUST, RUST_D, RUST_L, w=5)
    box(d, 84, 440, 274, 480, TEAL_D, TEAL, TEAL_L, w=5)
    # ferrugem
    for x, y in ((236, 250), (250, 300), (214, 350), (172, 410)):
        d.line((x, y, x - 8, y + 34), fill=RUST, width=6)
    return im


def rede():
    im, d = canvas()
    # postes
    box(d, 82, 168, 128, 452, RUST, RUST_D, RUST_L)
    box(d, 388, 168, 434, 452, RUST, RUST_D, RUST_L)
    for x in (92, 398):
        d.rectangle((x - 6, 158, x + 44, 178), fill=RUST_L, outline=DARK, width=4)
    # cabo superior
    d.line((105, 186, 270, 260), fill=METAL, width=4)
    d.line((411, 186, 270, 260), fill=METAL, width=4)
    # malha pendurada
    net = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    n = ImageDraw.Draw(net)
    for i in range(13):
        k = i / 12
        x0 = 105 + (411 - 105) * k
        y0 = 186 + math.sin(k * math.pi) * 74
        y1 = 300 + math.sin(k * math.pi) * 116
        n.line((x0, y0, x0, y1), fill=TEAL_L[:3] + (210,), width=5)
    for j in range(7):
        y = 196 + j * 34
        n.line((105, y, 411, y), fill=TEAL[:3] + (190,), width=4)
    # bojos
    for j in range(7):
        y = 196 + j * 34
        n.arc((100, y - 22, 416, y + 42), 0, 180, fill=TEAL[:3] + (200,), width=5)
    d._image.alpha_composite(net)
    # flutuadores
    for x in (150, 250, 350):
        d.ellipse((x, 402, x + 34, 436), fill=AMBER, outline=DARK, width=4)
    return im


def caixa_energia():
    im, d = canvas()
    glow(d, 200, 214, 26, AMBER, 100)
    box(d, 118, 148, 350, 424, TEAL, TEAL_D, TEAL_L)
    box(d, 138, 168, 330, 404, TEAL_L, TEAL, TEAL_D, w=4)
    d.rectangle((150, 184, 318, 386), fill=TEAL, outline=DARK, width=5)
    d.line((234, 184, 234, 386), fill=DARK, width=5)
    # ventilação
    for i in range(5):
        y = 206 + i * 18
        d.line((162, y, 222, y), fill=TEAL_D, width=5)
    # indicador e alavanca
    d.ellipse((188, 206, 212, 230), fill=AMBER, outline=DARK, width=3)
    d.line((264, 232, 300, 208), fill=METAL, width=8)
    d.ellipse((256, 224, 280, 248), fill=RUST_L, outline=DARK, width=3)
    # cabos
    d.line((350, 360, 404, 392), fill=DARK, width=12)
    d.line((404, 392, 410, 452), fill=DARK, width=12)
    d.arc((356, 384, 448, 470), 90, 260, fill=RUST_L, width=9)
    # ferrugem
    for x, y in ((132, 300), (336, 330), (146, 404)):
        d.line((x, y, x + 10, y + 40), fill=RUST, width=7)
    return im


def tubo():
    im, d = canvas()
    # tubo vertical
    d.rectangle((196, 96, 268, 330), fill=RUST, outline=DARK, width=6)
    d.rectangle((208, 96, 228, 330), fill=RUST_L)
    # curva
    d.ellipse((196, 300, 356, 420), fill=RUST, outline=DARK, width=6)
    d.ellipse((236, 336, 356, 400), fill=MAGENTA, outline=DARK, width=6)
    # tubo horizontal
    d.rectangle((300, 344, 452, 400), fill=RUST, outline=DARK, width=6)
    d.rectangle((300, 352, 452, 366), fill=RUST_L)
    # flanges
    for x0, y0, x1, y1 in ((184, 300, 280, 332), (404, 330, 452, 414)):
        d.rectangle((x0, y0, x1, y1), fill=METAL, outline=DARK, width=5)
        for x in range(x0 + 8, x1, 18):
            d.line((x, y0 + 4, x, y1 - 4), fill=DARK, width=3)
    # volante
    d.ellipse((148, 214, 244, 310), outline=METAL, width=10)
    for a in range(0, 360, 60):
        x = 196 + int(math.cos(math.radians(a)) * 40)
        y = 262 + int(math.sin(math.radians(a)) * 40)
        d.line((196, 262, x, y), fill=METAL, width=7)
    d.ellipse((184, 250, 208, 274), fill=RUST_D, outline=DARK, width=3)
    # vazamento
    d.line((330, 400, 336, 448), fill=TEAL_L, width=7)
    d.ellipse((320, 440, 352, 464), fill=TEAL_L, outline=DARK, width=3)
    return im


def placa():
    im, d = canvas()
    box(d, 234, 210, 278, 470, METAL, TEAL_D, TEAL_L)
    # losango
    poly(d, [(256, 92), (390, 216), (256, 340), (122, 216)], AMBER, DARK, 7)
    poly(d, [(256, 112), (368, 216), (256, 320), (144, 216)], (196, 132, 48, 255), DARK, 4)
    # símbolo
    d.line((256, 148, 256, 218), fill=DARK, width=14)
    d.line((256, 236, 256, 252), fill=DARK, width=14)
    d.polygon([(206, 168), (236, 168), (206, 232)], fill=DARK)
    # ferrugem e parafusos
    for x in (240, 272):
        d.ellipse((x, 430, x + 12, 442), fill=RUST_D, outline=DARK, width=2)
    for x, y in ((160, 240), (340, 270), (300, 200)):
        d.line((x, y, x + 6, y + 42), fill=RUST, width=6)
    d.ellipse((214, 238, 232, 256), fill=RUST, outline=DARK, width=3)
    return im


def concha():
    im, d = canvas()
    glow(d, 256, 300, 110, MAG_L, 120)
    cx, cy = 236, 296
    # Banda espiral: cada quadrante vira uma câmara da concha.
    rings = 15
    for i in range(rings):
        a0 = 0.35 + i * 0.46
        a1 = a0 + 0.5
        r0 = 12 + i * 8.2
        r1 = r0 + 8.6
        pts = [
            (cx + math.cos(a0) * r0, cy + math.sin(a0) * r0),
            (cx + math.cos(a0) * r1, cy + math.sin(a0) * r1),
            (cx + math.cos(a1) * r1, cy + math.sin(a1) * r1),
            (cx + math.cos(a1) * r0, cy + math.sin(a1) * r0),
        ]
        tone = MAG_L if i % 3 == 0 else (MAG if i % 2 else (166, 52, 132, 255))
        poly(d, pts, tone, DARK, 4)
    # Aresta externa ciano acompanhando a espiral.
    edge = []
    for i in range(rings + 1):
        a = 0.35 + i * 0.46
        r = 20 + i * 8.2
        edge.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    d.line(edge, fill=CYAN, width=9, joint="curve")
    edge2 = [(x + 2, y + 3) for x, y in edge]
    d.line(edge2, fill=TEAL_D, width=3, joint="curve")
    # Ombigo e abertura.
    d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=CYAN, outline=DARK, width=4)
    d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=TEAL_D)
    poly(d, [(360, 224), (442, 296), (350, 402), (300, 330)], MAG, DARK, 6)
    poly(d, [(352, 250), (410, 296), (346, 366), (318, 322)], MAG_L, DARK, 4)
    d.polygon([(338, 292), (392, 298), (346, 344)], fill=TEAL_D)
    # Reflexos
    for x, y in ((300, 214), (386, 240), (204, 372)):
        d.line((x, y, x + 24, y - 8), fill=(255, 236, 250, 255), width=6)
    return im


def coral():
    im, d = canvas()
    glow(d, 256, 300, 120, MAG, 110)
    # base rochosa
    poly(d, [(120, 430), (392, 430), (356, 372), (166, 366)], TEAL_D, DARK, 6)
    poly(d, [(140, 412), (370, 412), (350, 384), (168, 380)], TEAL, DARK, 4)
    branches = [
        (256, 372, 256, 176, 30),
        (256, 300, 176, 210, 22),
        (256, 286, 340, 190, 22),
        (246, 250, 196, 140, 16),
        (268, 236, 322, 128, 16),
        (256, 210, 256, 118, 14),
        (196, 262, 148, 214, 12),
        (330, 240, 386, 208, 12),
    ]
    for x0, y0, x1, y1, r in branches:
        d.line((x0, y0, x1, y1), fill=MAG, width=r * 2 + 8)
        d.line((x0, y0, x1, y1), fill=MAG_L, width=r)
    for x, y, r in ((196, 140, 18), (322, 128, 18), (256, 118, 20), (148, 214, 14), (386, 208, 14)):
        d.ellipse((x - r, y - r, x + r, y + r), fill=CYAN, outline=DARK, width=4)
    # cavidades
    for x, y in ((214, 320), (300, 306), (256, 360)):
        d.ellipse((x - 12, y - 8, x + 12, y + 8), fill=TEAL_D, outline=DARK, width=3)
    return im


def poste():
    im, d = canvas()
    glow(d, 330, 190, 70, AMBER, 120)
    box(d, 238, 150, 274, 480, METAL, TEAL_D, TEAL_L, w=5)
    # braço curvo
    d.line((256, 176, 340, 168), fill=METAL, width=16)
    d.line((340, 168, 344, 196), fill=METAL, width=12)
    # cúpula e gaiola
    poly(d, [(306, 196), (382, 196), (368, 168), (320, 168)], TEAL_D, DARK, 5)
    d.rectangle((312, 196, 376, 214), fill=DARK, outline=DARK, width=3)
    for x in (318, 338, 358):
        d.line((x, 196, x, 250), fill=DARK, width=5)
    d.ellipse((322, 200, 366, 246), fill=GLOW, outline=AMBER, width=4)
    # base
    box(d, 202, 466, 310, 496, TEAL_D, TEAL, TEAL_L, w=5)
    # ferrugem
    for x, y in ((242, 300), (264, 380), (250, 440)):
        d.line((x, y, x + 8, y + 40), fill=RUST, width=6)
    return im


def caixote():
    im, d = canvas()
    box(d, 116, 214, 340, 452, RUST, RUST_D, RUST_L)
    # tábuas frontais
    for i in range(1, 4):
        y = 214 + i * 56
        d.line((116, y, 340, y), fill=RUST_D, width=6)
    for x in (170, 244, 306):
        d.line((x, 214, x, 452), fill=RUST_D, width=5)
    # faixas de metal
    for y0, y1 in ((246, 270), (392, 416)):
        d.rectangle((116, y0, 340, y1), fill=METAL, outline=DARK, width=4)
        for x in range(132, 336, 40):
            d.ellipse((x, (y0 + y1) // 2 - 5, x + 10, (y0 + y1) // 2 + 5), fill=DARK)
    # topo e lateral
    d.polygon([(116, 214), (340, 214), (372, 190), (148, 190)], fill=RUST_L)
    d.line([(116, 214), (340, 214), (372, 190), (148, 190), (116, 214)], fill=DARK, width=5)
    # etiqueta
    d.rectangle((196, 300, 268, 348), fill=BONE, outline=DARK, width=4)
    d.line((208, 316, 254, 316), fill=TEAL_D, width=5)
    d.line((208, 330, 244, 330), fill=TEAL_D, width=5)
    return im


BUILDERS = {
    "boia-sinalizadora": boia,
    "guindaste-baia": guindaste,
    "rede-pesca": rede,
    "caixa-energia": caixa_energia,
    "tubo-corrosivo": tubo,
    "placa-ferrugem": placa,
    "concha-cromatica": concha,
    "coral-magenta": coral,
    "poste-luz": poste,
    "caixote-madeira": caixote,
}


def is_pure_magenta(r, g, b):
    return r > 200 and b > 200 and g < 70


def build_sources():
    SRC.mkdir(parents=True, exist_ok=True)
    for name, builder in BUILDERS.items():
        image = builder()
        image.save(SRC / f"{name}.png", optimize=True)
        print("fonte", name, "512x512")


def recolor_concha(image):
    """A concha do lote é cromática: duotone magenta/ciano sobre a espiral."""
    lum = image.convert("L")
    tinted = ImageOps.colorize(lum, black=(22, 8, 34), mid=(150, 34, 122), white=(122, 232, 226))
    tinted = ImageEnhance.Color(tinted).enhance(1.25)
    return tinted.convert("RGBA")


def prepare():
    DST.mkdir(parents=True, exist_ok=True)
    for path in sorted(SRC.glob("*.png")):
        image = Image.open(path).convert("RGBA")
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = pixels[x, y]
                if is_pure_magenta(r, g, b):
                    pixels[x, y] = (0, 0, 0, 0)
        # Recorta antes de reduzir: cada sprite usa os 192 px inteiros.
        bounds = image.getbbox()
        if bounds:
            image = image.crop(bounds)
        scale = 192 / max(image.size)
        if scale < 1:
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.Resampling.NEAREST,
            )
        # MinFilter(5) tira 2 px de franja magenta da chave.
        image.putalpha(image.getchannel("A").filter(ImageFilter.MinFilter(5)))
        bounds = image.getbbox()
        if bounds:
            image = image.crop(bounds)
        if path.stem == "concha-cromatica":
            alpha = image.getchannel("A")
            image = recolor_concha(image.convert("RGB"))
            image.putalpha(alpha)
        image.save(DST / path.name, optimize=True)
        print(f"{path.stem}: {image.width}x{image.height}")


if __name__ == "__main__":
    # As fontes autorais (desenho) só são criadas quando ainda não existem:
    # assim uma leva de arte pintada pode ocupar o mesmo pipeline.
    if not any(SRC.glob("*.png")):
        build_sources()
    prepare()
