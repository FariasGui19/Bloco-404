#!/usr/bin/env python3
"""Prepara a Base dos Vetores (Núcleo 10X) — 0.11.6.

Fontes pintadas em assets/source-art/sala-nucleo/*.png (fundo magenta) viram
PNGs RGBA standalone em assets/sprites/sala-nucleo/. Todas as máquinas usam
arte pintada; regulador, relicário e pórtico não são mais desenhos procedurais.

Invariantes verificadas ao salvar cada sprite de objeto:
  * modo RGBA;
  * margem totalmente transparente >= 4 px nos quatro lados;
  * nenhum canto opaco (sprite-clean não tenta remover fundo já limpo).

Uso: python3 tools/preparar-sala-nucleo.py
Dependências: Pillow, numpy, scipy (mesmo pipeline das outras salas).
"""
from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source-art/sala-nucleo"
OUT = ROOT / "assets/sprites/sala-nucleo"
PAD = 6


def remove_magenta(im: Image.Image, holo: bool = False, holes: bool = False, membrane: bool = False) -> Image.Image:
    """Chroma-key do magenta, preservando verdes/âmbaras e vidro holográfico.

    `holes=True` também apaga o magenta FECHADO dentro da silhueta (o vão de
    um pórtico, por exemplo): sem isso o flood a partir da borda não alcança
    a abertura e a porta nasce tampada. `membrane=True` converte o campo rosa
    da malha em vidro verde translúcido ANTES do key, preservando a treliça.
    """
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    if membrane:
        pink = (np.minimum(r, b) - g > 24) & (np.abs(r - b) < 100)
        intensity = np.clip((np.minimum(r, b) - g) / 255, 0, 1)
        r = np.where(pink, 30 + 40 * (1 - intensity), r)
        g = np.where(pink, np.maximum(g, 140 + 80 * intensity), g)
        b = np.where(pink, 90 + 40 * (1 - intensity), b)
        a = np.where(pink, np.minimum(a, 42 + 70 * (1 - intensity)), a)
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
    bg = strong.copy() if holes else np.zeros_like(strong)
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
    # O antialias do fundo deixa roxo translúcido mesmo depois do key.
    # Remove esse resíduo sem apagar material opaco; um reflexo violeta
    # saturado remanescente vira luz verde, não volta a ser chroma-key rosa.
    faint_spill = (mag > 42) & (np.abs(r - b) < 95) & (a > 0) & (a < 235)
    a[faint_spill] = 0
    hot = strong & (a > 0)
    if np.any(hot):
        light = np.maximum(g[hot], np.minimum(r[hot], b[hot]))
        r[hot] = light * .48
        g[hot] = light
        b[hot] = light * .72
    out = np.stack([r, g, b, a], axis=-1).clip(0, 255).astype(np.uint8)
    final_mag = np.minimum(out[..., 0], out[..., 2]).astype(np.int16) - out[..., 1]
    assert not np.any((final_mag > 82) & (np.abs(out[..., 0].astype(np.int16) - out[..., 2]) < 64) & (out[..., 1] < 150) & (out[..., 3] > 0)), "magenta visível sobrevivendo dentro da silhueta"
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


def clean_resize_spill(im: Image.Image) -> Image.Image:
    """Lanczos/unpremultiply pode recriar franja roxa em alpha baixo.

    Limpa DEPOIS da redução também; o assert do remove_magenta sozinho não
    enxerga esse resíduo de reamostragem. Material opaco não é apagado.
    """
    arr = np.array(im.convert("RGBA"), dtype=np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mag = np.minimum(r, b) - g
    faint = (mag > 42) & (np.abs(r - b) < 95) & (a > 0) & (a < 235)
    a[faint] = 0
    hot = (mag > 82) & (np.abs(r - b) < 64) & (g < 150) & (a > 0)
    if np.any(hot):
        light = np.maximum(g[hot], np.minimum(r[hot], b[hot]))
        r[hot] = (light * .48).round()
        g[hot] = light
        b[hot] = (light * .72).round()
    out = np.stack([r, g, b, a], axis=-1).clip(0, 255).astype(np.uint8)
    fm = np.minimum(out[..., 0], out[..., 2]).astype(np.int16) - out[..., 1]
    assert not np.any((fm > 82) & (np.abs(out[..., 0].astype(np.int16) - out[..., 2]) < 64) & (out[..., 1] < 150) & (out[..., 3] > 0)), "franja magenta após reamostragem"
    return Image.fromarray(out, "RGBA")


def pad_save(im: Image.Image, name: str, max_w: int | None = None) -> Image.Image:
    im = trim(im)
    if max_w and im.width > max_w - 2 * PAD:
        h = max(1, round(im.height * (max_w - 2 * PAD) / im.width))
        im = resize_premult(im, (max_w - 2 * PAD, h))
    im = clean_resize_spill(im)
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
    # Espelha a FONTE, não o objeto: a face de serviço fica a sudeste, como
    # nas salas aprovadas, sem trocar os eixos da hitbox no collision.js.
    spindle = ImageOps.mirror(remove_magenta(spindle, holes=True))
    pad_save(spindle, "eixo-adaptacao.png", max_w=420)

    # Mantém só o pórtico + umbrais; as abas laterais da fonte virariam uma
    # muralha larga demais para o vão duplo (y=5..6) da câmara.
    gate_src = Image.open(SRC / "malha-cinetica.png")
    gate_src = gate_src.crop((int(gate_src.width * .22), 0, int(gate_src.width * .78), gate_src.height))
    gate = shear(remove_magenta(gate_src, membrane=True), -.5)
    pad_save(gate, "malha-cinetica.png", max_w=280)
    pad_save(remove_magenta(Image.open(SRC / "pilar-cinetico.png"), holes=True), "pilar-cinetico.png", max_w=150)
    terminal = ImageOps.mirror(remove_magenta(Image.open(SRC / "terminal-registro.png"), holo=True, holes=True))
    pad_save(terminal, "terminal-registro.png", max_w=220)

    # Contrapeso: estudo intacto + estudo com a fissura âmbar acesa.
    anvil = Image.open(SRC / "bigorna-contrapeso.png")
    step = anvil.width // 5
    pad_save(remove_magenta(anvil.crop((step * 3, 0, step * 4, anvil.height)), holes=True), "bigorna-contrapeso.png", max_w=240)
    pad_save(remove_magenta(anvil.crop((step * 4, 0, step * 5, anvil.height)), holes=True), "contrapeso-liberado.png", max_w=240)

    # 0.11.6: as três peças que antes eram procedurais agora vêm de arte
    # pintada (mesma linguagem visual das salas Maré/Domínio, face SE).
    regulator = Image.open(SRC / "regulador-inercia-v2.png")
    pad_save(remove_magenta(regulator, holes=True), "regulador-inercia.png", max_w=230)

    # A fonte do relicário trouxe dois estudos lado a lado; fica o da direita
    # (cristal maior + lâmpada âmbar na face sudeste).
    relic = Image.open(SRC / "relicario-vetor-v2.png")
    relic = relic.crop((relic.width // 2, 0, relic.width, relic.height))
    pad_save(remove_magenta(relic, holes=True), "relicario-vetor.png", max_w=220)

    # Idem para o pórtico: estudo da direita, com o vão vazado de verdade.
    arch = Image.open(SRC / "arco-viaduto-v2.png")
    arch = arch.crop((arch.width // 2, 0, arch.width, arch.height))
    pad_save(remove_magenta(arch, holes=True), "arco-viaduto.png", max_w=300)


if __name__ == "__main__":
    main()
