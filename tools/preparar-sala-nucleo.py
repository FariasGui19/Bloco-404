#!/usr/bin/env python3
"""Prepara a Base dos Vetores (Núcleo 10X) — 0.11.5.

Fontes pintadas em assets/source-art/sala-nucleo/*.png (fundo magenta) viro
PNGs RGBA standalone em assets/sprites/sala-nucleo/. O script também desenha
proceduralmente as peças que não passaram por geração de imagem (regulador,
relicário, arco do viaduto e panorama exterior), mantendo a mesma paleta.

Invariantes verificadas ao salvar cada sprite de objeto:
  * modo RGBA;
  * margem totalmente transparente >= 4 px nos quatro lados;
  * nenhum canto opaco (sprite-clean não tenta remover fundo já limpo).

Uso: python3 tools/preparar-sala-nucleo.py
Dependências: Pillow, numpy, scipy (mesmo pipeline das outras salas).
"""
from pathlib import Path
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source-art/sala-nucleo"
OUT = ROOT / "assets/sprites/sala-nucleo"
PAD = 6
GREEN = (126, 252, 174, 255)
GREEN_DARK = (38, 112, 78, 255)
AMBER = (255, 190, 74, 255)
METAL = (55, 65, 73, 255)
METAL_DARK = (27, 34, 40, 255)
METAL_LIGHT = (88, 101, 111, 255)


def remove_magenta(im: Image.Image, holo: bool = False) -> Image.Image:
    """Chroma-key do magenta, preservando verdes/âmbaras e vidro holográfico."""
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    if holo:
        # O feixe do terminal foi pintado rosa sobre o fundo magenta. Converte
        # só a região superior em vidro verde translúcido antes do key.
        h, w = r.shape
        yy = np.arange(h)[:, None] / max(1, h)
        vidro = (yy < 0.31) & (r > g + 24) & (b > g + 24) & (g > 48) & ~((r > 228) & (g < 42) & (b > 228))
        r = np.where(vidro, 42, r)
        g = np.where(vidro, np.maximum(g, 150), g)
        b = np.where(vidro, 104, b)
        a = np.where(vidro, 150, a)
    mag = np.minimum(r, b) - g
    strong = (mag > 82) & (np.abs(r - b) < 64) & (g < 150)
    seed = (mag > 48) & (np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2) < 150)
    lbl, n = ndimage.label(seed | strong)
    border = (set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])) - {0}
    bg = strong.copy()
    for lab in border:
        bg |= lbl == lab
    flbl, fn = ndimage.label(~bg)
    sizes = np.bincount(flbl.ravel())
    noise = sizes < 36
    noise[0] = False
    bg |= noise[flbl]
    a[bg] = 0
    fg = a > 0
    fringe = fg & ~ndimage.binary_erosion(fg, iterations=2)
    spill = fringe & (mag > 16)
    if np.any(spill):
        cap = np.maximum(g[spill] + 12, (r[spill] + g[spill] + b[spill]) / 3.2)
        r[spill] = np.minimum(r[spill], cap)
        b[spill] = np.minimum(b[spill], cap * 1.08)
        a[spill] *= np.clip(1 - (mag[spill] - 16) / 125, .25, 1)
    out = np.stack([r, g, b, a], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(im: Image.Image) -> Image.Image:
    box = im.getchannel("A").getbbox()
    return im.crop(box) if box else im


def resize_premult(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    arr = np.array(im, dtype=np.float32) / 255
    a = arr[..., 3:4]
    pre = np.concatenate([arr[..., :3] * a, a], axis=-1)
    small = Image.fromarray((pre * 255).round().astype(np.uint8), "RGBA").resize(size, Image.Resampling.LANCZOS)
    s = np.array(small, dtype=np.float32) / 255
    sa = s[..., 3:4]
    rgb = np.where(sa > 1e-3, s[..., :3] / np.maximum(sa, 1e-3), 0)
    sa = np.where(sa < .04, 0, sa)
    return Image.fromarray((np.concatenate([rgb, sa], axis=-1).clip(0, 1) * 255).round().astype(np.uint8), "RGBA")


def pad_save(im: Image.Image, name: str, max_w: int | None = None) -> Image.Image:
    im = trim(im)
    if max_w and im.width > max_w - 2 * PAD:
        h = max(1, round(im.height * (max_w - 2 * PAD) / im.width))
        im = resize_premult(im, (max_w - 2 * PAD, h))
    canvas = Image.new("RGBA", (im.width + 2 * PAD, im.height + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(im, (PAD, PAD))
    a = np.array(canvas)[..., 3]
    assert a[:4, :].max() == 0 and a[-4:, :].max() == 0 and a[:, :4].max() == 0 and a[:, -4:].max() == 0, name
    canvas.save(OUT / name, optimize=True)
    print(f"saved {name} {canvas.size}")
    return canvas


def shift_col(col: np.ndarray, dy: float) -> np.ndarray:
    h = col.shape[0]
    ys = np.arange(h, dtype=np.float32) - dy
    y0 = np.floor(ys).astype(int)
    y1 = y0 + 1
    f = (ys - y0)[:, None]
    v0 = (y0 >= 0) & (y0 < h)
    v1 = (y1 >= 0) & (y1 < h)
    c0 = np.zeros_like(col, dtype=np.float32)
    c1 = np.zeros_like(col, dtype=np.float32)
    c0[v0] = col[y0[v0]]
    c1[v1] = col[y1[v1]]
    return (c0 * (1 - f) + c1 * f).clip(0, 255).astype(np.uint8)


def shear(im: Image.Image, slope: float, corner: bool = False) -> Image.Image:
    arr = np.array(im)
    h, w, _ = arr.shape
    mask = arr[..., 3] > 30
    mid = (w - 1) * .5
    xs, ys = [], []
    for x in range(8, w - 8):
        col = np.where(mask[:, x])[0]
        if len(col):
            xs.append(x)
            ys.append(col.max())
    if len(xs) < 10:
        return im
    if corner:
        left = np.array(xs) < mid - 20
        right = np.array(xs) > mid + 20
        sl = np.polyfit(np.array(xs)[left], np.array(ys)[left], 1)[0]
        sr = np.polyfit(np.array(xs)[right], np.array(ys)[right], 1)[0]
        dl, dr = -slope - sl, slope - sr
    else:
        cur = np.polyfit(xs, ys, 1)[0]
        dl = dr = slope - cur
    pad_y = int(math.ceil(max(abs(dl), abs(dr)) * w * .6)) + 10
    padded = np.zeros((h + 2 * pad_y, w, 4), dtype=np.uint8)
    padded[pad_y:pad_y + h] = arr
    out = np.zeros_like(padded)
    for x in range(w):
        dx = x - mid
        dy = dl * dx if (corner and dx < 0) else dr * dx
        out[:, x] = shift_col(padded[:, x], dy)
    return Image.fromarray(out, "RGBA")


def floor_tile(src: Image.Image, name: str):
    clean = trim(remove_magenta(src))
    # 248×124 = 2:1 exato; a saia de 4 px entra na margem transparente.
    tile = resize_premult(clean, (248, 124))
    pad_save(tile, name, max_w=260)


def iso_poly(d, pts, fill, outline=METAL_DARK, width=3):
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=outline, width=width, joint="curve")


def draw_regulator() -> Image.Image:
    im = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Pipes connected to the weighted foot.
    d.line([(54, 220), (24, 238), (24, 258)], fill=METAL_DARK, width=14)
    d.line([(226, 220), (254, 238), (254, 258)], fill=METAL_DARK, width=14)
    iso_poly(d, [(48, 218), (140, 264), (232, 218), (140, 174)], METAL_DARK)
    iso_poly(d, [(48, 204), (140, 250), (232, 204), (140, 160)], METAL)
    iso_poly(d, [(78, 128), (140, 158), (202, 128), (140, 98)], METAL_LIGHT)
    iso_poly(d, [(78, 128), (140, 158), (140, 226), (78, 196)], METAL)
    iso_poly(d, [(140, 158), (202, 128), (202, 196), (140, 226)], METAL_DARK)
    # Brass flywheel, front face.
    d.ellipse((84, 74, 196, 186), fill=METAL_DARK, outline=(154, 106, 38, 255), width=10)
    d.ellipse((96, 86, 184, 174), outline=AMBER, width=7)
    for k in range(6):
        a = k * math.pi / 3
        d.line([(140, 130), (140 + 40 * math.cos(a), 130 + 40 * math.sin(a))], fill=(190, 132, 44, 255), width=7)
    d.ellipse((126, 116, 154, 144), fill=METAL_LIGHT, outline=AMBER, width=3)
    # Gauge and green needle.
    d.rounded_rectangle((164, 52, 216, 92), 6, fill=METAL_DARK, outline=METAL_LIGHT, width=3)
    d.arc((172, 58, 208, 88), 180, 360, fill=GREEN, width=3)
    d.line([(190, 82), (201, 64)], fill=GREEN, width=3)
    d.ellipse((186, 78, 194, 86), fill=AMBER)
    return im


def draw_relicario() -> Image.Image:
    im = Image.new("RGBA", (260, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    base = [(40, 190), (85, 168), (175, 168), (220, 190), (175, 214), (85, 214)]
    iso_poly(d, [(40, 190), (85, 214), (175, 214), (220, 190), (220, 216), (175, 240), (85, 240), (40, 216)], METAL_DARK)
    iso_poly(d, base, METAL)
    d.line([(52, 194), (88, 212), (172, 212), (208, 194)], fill=GREEN_DARK, width=4)
    # Three armored prongs, all connected to the plinth.
    for x, y in [(72, 176), (130, 166), (188, 176)]:
        iso_poly(d, [(x - 10, y + 20), (x + 10, y + 20), (x + 7, y - 22), (x - 4, y - 30)], METAL_LIGHT)
        d.line([(x, y - 20), (x, y + 10)], fill=GREEN, width=3)
    # Suspended crystal, joined by faint filaments so sprite-clean keeps it.
    d.line([(82, 150), (130, 104), (178, 150)], fill=(90, 210, 145, 130), width=2)
    d.line([(130, 166), (130, 124)], fill=(90, 210, 145, 130), width=2)
    crystal = [(130, 58), (160, 92), (130, 132), (100, 92)]
    iso_poly(d, crystal, (112, 246, 166, 255), GREEN_DARK, 3)
    d.polygon([(130, 58), (130, 132), (100, 92)], fill=(64, 178, 116, 255))
    d.line([(100, 92), (160, 92)], fill=(210, 255, 226, 255), width=2)
    d.ellipse((116, 218, 144, 228), fill=AMBER)
    return im


def draw_arch() -> Image.Image:
    im = Image.new("RGBA", (300, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Chamfered rectangular maintenance arch, empty inside.
    outer = [(34, 330), (34, 54), (62, 26), (238, 26), (266, 54), (266, 330), (222, 330), (222, 76), (78, 76), (78, 330)]
    d.polygon(outer, fill=METAL)
    d.line(outer + [outer[0]], fill=METAL_DARK, width=8, joint="curve")
    d.line([(78, 326), (78, 76), (222, 76), (222, 326)], fill=GREEN, width=5)
    d.rectangle((20, 320, 92, 346), fill=METAL_DARK, outline=METAL_LIGHT, width=3)
    d.rectangle((208, 320, 280, 346), fill=METAL_DARK, outline=METAL_LIGHT, width=3)
    for x in (46, 232):
        for y in (110, 170, 230):
            d.rectangle((x, y, x + 22, y + 12), fill=METAL_DARK)
            d.rectangle((x + 4, y + 3, x + 18, y + 6), fill=GREEN_DARK)
    for x in (34, 222):
        d.rectangle((x, 286, x + 44, 306), fill=AMBER)
        for k in range(3):
            d.line([(x + 6 + k * 14, 304), (x + 16 + k * 14, 288)], fill=METAL_DARK, width=5)
    d.line([(48, 80), (40, 140), (48, 200), (40, 260)], fill=METAL_DARK, width=7)
    d.rectangle((112, 36, 188, 60), fill=METAL_DARK, outline=METAL_LIGHT, width=2)
    d.ellipse((142, 42, 158, 56), fill=GREEN)
    return im


def draw_panorama() -> Image.Image:
    """Pintura procedural em camadas: céu, ilhas, estación bio e canal."""
    W, H = 1600, 640
    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        t = y / H
        top = (10, 20, 34)
        hor = (44, 86, 92)
        c = tuple(int(top[i] + (hor[i] - top[i]) * min(1, t * 1.5)) for i in range(3))
        for x in range(W):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    rng = random.Random(40410)
    for _ in range(110):
        x, y = rng.randrange(W), rng.randrange(250)
        s = rng.choice([1, 1, 1, 2])
        d.rectangle((x, y, x + s, y + s), fill=rng.choice([(180, 220, 220), (120, 170, 180), (230, 210, 150)]))
    d.ellipse((1240, 64, 1304, 128), fill=(190, 214, 202))
    d.ellipse((1252, 60, 1316, 124), fill=(16, 29, 42))
    # Distant island silhouettes.
    for layer, (base, color, amp) in enumerate([(330, (28, 58, 66), 42), (390, (24, 66, 62), 60), (455, (18, 54, 48), 74)]):
        pts = [(0, H)]
        for x in range(0, W + 24, 24):
            y = base + int(math.sin(x * .006 + layer * 2) * amp + math.sin(x * .021 + layer) * amp * .35)
            pts.append((x, y))
        pts.append((W, H))
        d.polygon(pts, fill=color)
    # Botanical research station on the right horizon.
    for x, y, w, h in [(1110, 300, 150, 110), (1280, 270, 120, 140), (1410, 320, 130, 90)]:
        d.rectangle((x, y, x + w, y + h), fill=(30, 48, 52))
        d.rectangle((x + 8, y + 8, x + w - 8, y + h), fill=(38, 62, 64))
        d.arc((x, y - 44, x + w, y + 44), 180, 360, fill=(72, 126, 112), width=10)
        for wx in range(x + 16, x + w - 10, 24):
            for wy in range(y + 24, y + h - 10, 26):
                d.rectangle((wx, wy, wx + 10, wy + 8), fill=rng.choice([(110, 220, 150), (230, 176, 80), (48, 90, 86)]))
    # Turquoise channel far below, with horizontal glints.
    d.rectangle((0, 478, W, H), fill=(16, 66, 78))
    for _ in range(260):
        x, y = rng.randrange(W), rng.randrange(482, H)
        length = rng.randrange(8, 70)
        d.line([(x, y), (x + length, y)], fill=rng.choice([(32, 96, 104), (48, 120, 122), (22, 78, 90)]), width=2)
    # Jungle canopy texture on the nearest island band.
    for _ in range(420):
        x = rng.randrange(W)
        y = rng.randrange(410, 478)
        r = rng.randrange(5, 18)
        d.ellipse((x - r, y - r, x + r, y + r // 2), fill=rng.choice([(20, 62, 48), (26, 76, 54), (16, 50, 42), (34, 88, 60)]))
    # Mist bands.
    mist = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mist)
    for y in (350, 418, 470):
        md.rectangle((0, y, W, y + 18), fill=(130, 190, 184, 24))
    mist = mist.filter(ImageFilter.GaussianBlur(10))
    im = Image.alpha_composite(im.convert("RGBA"), mist).convert("RGB")
    im.save(OUT / "viaduto-panorama.png", optimize=True)
    print(f"saved viaduto-panorama.png {im.size} (background, opaque by design)")
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    floor_tile(Image.open(SRC / "piso-grafite.png"), "piso-grafite.png")
    floor_tile(Image.open(SRC / "piso-cinetico.png"), "piso-cinetico.png")

    # A fonte do canto trouxe duas baias; recorta só o pico central (^).
    corner = Image.open(SRC / "parede-canto.png")
    corner = corner.crop((int(corner.width * .22), 0, int(corner.width * .76), corner.height))
    corner = shear(remove_magenta(corner), .5, corner=True)
    pad_save(corner, "parede-canto.png", max_w=420)

    wall = shear(remove_magenta(Image.open(SRC / "parede-modular.png")), .5)
    pad_save(wall, "parede-modular.png", max_w=300)
    door = shear(remove_magenta(Image.open(SRC / "porta-doca.png")), .5)
    pad_save(door, "porta-doca.png", max_w=260)

    # O eixo veio em tira de cinco estudos: usa um único estudo completo.
    spindle = Image.open(SRC / "eixo-adaptacao.png")
    spindle = spindle.crop((0, 0, spindle.width // 5, spindle.height))
    pad_save(remove_magenta(spindle), "eixo-adaptacao.png", max_w=420)

    # Mantém só o pórtico + umbrais; as abas laterais da fonte virariam uma
    # muralha larga demais para o vão duplo (y=5..6) da câmara.
    gate_src = Image.open(SRC / "malha-cinetica.png")
    gate_src = gate_src.crop((int(gate_src.width * .22), 0, int(gate_src.width * .78), gate_src.height))
    gate = shear(remove_magenta(gate_src), -.5)
    pad_save(gate, "malha-cinetica.png", max_w=280)
    pad_save(remove_magenta(Image.open(SRC / "pilar-cinetico.png")), "pilar-cinetico.png", max_w=150)
    pad_save(remove_magenta(Image.open(SRC / "terminal-registro.png"), holo=True), "terminal-registro.png", max_w=220)

    # Contrapeso: estudo intacto + estudo com a fissura âmbar acesa.
    anvil = Image.open(SRC / "bigorna-contrapeso.png")
    step = anvil.width // 5
    pad_save(remove_magenta(anvil.crop((step * 3, 0, step * 4, anvil.height))), "bigorna-contrapeso.png", max_w=240)
    pad_save(remove_magenta(anvil.crop((step * 4, 0, step * 5, anvil.height))), "contrapeso-liberado.png", max_w=240)

    pad_save(draw_regulator(), "regulador-inercia.png", max_w=220)
    pad_save(draw_relicario(), "relicario-vetor.png", max_w=220)
    pad_save(draw_arch(), "arco-viaduto.png", max_w=300)
    draw_panorama()


if __name__ == "__main__":
    main()
