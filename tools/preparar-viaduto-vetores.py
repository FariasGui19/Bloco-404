#!/usr/bin/env python3
"""Prepara o VIADUTO DOS VETORES (Núcleo 10X) — 0.11.6.

Fontes pintadas em assets/source-art/viaduto-vetores/*.png (fundo magenta)
viram PNGs RGBA standalone em assets/sprites/viaduto-vetores/. O panorama é
a única peça opaca (é placa de fundo, não sprite).

Todas as peças são SIDE ELEVATION (câmera perpendicular), porque o viaduto
roda no renderer side-view 2.5D — nada de isometria aqui.

Invariantes verificadas ao salvar cada sprite:
  * modo RGBA;
  * margem totalmente transparente >= 4 px nos quatro lados.

Uso: python3 tools/preparar-viaduto-vetores.py
Dependências: Pillow, numpy, scipy.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source-art/viaduto-vetores"
OUT = ROOT / "assets/sprites/viaduto-vetores"
PAD = 6


def remove_magenta(im: Image.Image, holes: bool = False) -> Image.Image:
    """Chroma-key do magenta preservando verdes/âmbaras/acobreados."""
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mag = np.minimum(r, b) - g
    strong = (mag > 82) & (np.abs(r - b) < 64) & (g < 150)
    seed = (mag > 48) & (np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2) < 150)
    lbl, _ = ndimage.label(seed | strong)
    border = (set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])) - {0}
    bg = strong.copy() if holes else np.zeros_like(strong)
    for lab in border:
        bg |= lbl == lab
    flbl, _ = ndimage.label(~bg)
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


def pad_save(im: Image.Image, name: str, max_w: int | None = None, max_h: int | None = None) -> Image.Image:
    im = trim(im)
    scale = 1.0
    if max_w and im.width > max_w - 2 * PAD:
        scale = min(scale, (max_w - 2 * PAD) / im.width)
    if max_h and im.height > max_h - 2 * PAD:
        scale = min(scale, (max_h - 2 * PAD) / im.height)
    if scale < 1.0:
        im = resize_premult(im, (max(1, round(im.width * scale)), max(1, round(im.height * scale))))
    im = clean_resize_spill(im)
    canvas = Image.new("RGBA", (im.width + 2 * PAD, im.height + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(im, (PAD, PAD))
    a = np.array(canvas)[..., 3]
    assert a[:4, :].max() == 0 and a[-4:, :].max() == 0 and a[:, :4].max() == 0 and a[:, -4:].max() == 0, name
    canvas.save(OUT / name, optimize=True)
    print(f"saved {name} {canvas.size}")
    return canvas


def panorama() -> None:
    """Placa de fundo pintada. Opaca por design; o renderer faz o parallax."""
    src = Image.open(SRC / "panorama-noite.png").convert("RGB")
    W = 1600
    H = round(src.height * W / src.width)
    out = src.resize((W, H), Image.Resampling.LANCZOS)
    out.save(OUT / "panorama-noite.png", optimize=True)
    print(f"saved panorama-noite.png {out.size} (background, opaque by design)")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    panorama()
    # Treliça: peça horizontal repetível, sem limite de altura agressivo.
    pad_save(remove_magenta(Image.open(SRC / "vao-trelica.png"), holes=True), "vao-trelica.png", max_w=420)
    pad_save(remove_magenta(Image.open(SRC / "pod-carga.png"), holes=True), "pod-carga.png", max_w=260)
    pad_save(remove_magenta(Image.open(SRC / "guindaste.png"), holes=True), "guindaste.png", max_h=460)
    pad_save(remove_magenta(Image.open(SRC / "totem-sinal.png"), holes=True), "totem-sinal.png", max_h=300)
    pad_save(remove_magenta(Image.open(SRC / "modulo-bomba.png"), holes=True), "modulo-bomba.png", max_w=220)


if __name__ == "__main__":
    main()
