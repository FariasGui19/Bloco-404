#!/usr/bin/env python3
"""
Processa a arte-fonte de `assets/source-art/sala-mare/` (gerada sobre #FF00FF)
para sprites RGBA limpos em `assets/sprites/sala-mare/`, corrigindo também a
inclinação isométrica exata 2:1 (±0.500) das paredes e da barreira de fluxo.
"""

from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source-art" / "sala-mare"
OUT = ROOT / "assets" / "sprites" / "sala-mare"
OUT.mkdir(parents=True, exist_ok=True)


def remove_magenta(im: Image.Image) -> Image.Image:
    rgba = np.array(im.convert("RGBA"), dtype=np.float32)
    r, g, b, a = rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2], rgba[:, :, 3]

    mag_dom = np.minimum(r, b) - g
    dist = np.sqrt((r - 255.0) ** 2 + g**2 + (b - 255.0) ** 2)

    strong_bg = (mag_dom > 88.0) & (np.abs(r - b) < 55.0) & (g < 145.0)
    border_seed = (dist < 145.0) & (mag_dom > 50.0)
    bg = strong_bg.copy()

    lbl, n = ndimage.label(border_seed | strong_bg)
    border_labels = (
        set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    ) - {0}
    for lab in border_labels:
        bg |= lbl == lab

    fg = ~bg
    flbl, fn = ndimage.label(fg)
    for i in range(1, fn + 1):
        m = flbl == i
        if int(m.sum()) < 45:
            bg |= m

    a[bg] = 0.0

    fg = a > 0
    eroded = ndimage.binary_erosion(fg, iterations=2)
    fringe = fg & (~eroded)
    spill = fringe & (mag_dom > 18.0)
    if np.any(spill):
        cap = np.maximum(g[spill] + 14.0, (r[spill] + g[spill] + b[spill]) / 3.2)
        r[spill] = np.minimum(r[spill], cap)
        b[spill] = np.minimum(b[spill], cap * 1.12)
        fade = np.clip(1.0 - (mag_dom[spill] - 18.0) / 120.0, 0.25, 1.0)
        a[spill] *= fade

    out = np.stack([r, g, b, a], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def shift_column_rgba(col: np.ndarray, dy: float) -> np.ndarray:
    """Desloca verticalmente uma coluna RGBA por `dy` pixels (interpolação linear)."""
    h = col.shape[0]
    ys = np.arange(h, dtype=np.float32) - dy
    y0 = np.floor(ys).astype(np.int32)
    y1 = y0 + 1
    f = (ys - y0)[:, None]
    valid0 = (y0 >= 0) & (y0 < h)
    valid1 = (y1 >= 0) & (y1 < h)
    c0 = np.zeros_like(col, dtype=np.float32)
    c1 = np.zeros_like(col, dtype=np.float32)
    c0[valid0] = col[y0[valid0]].astype(np.float32)
    c1[valid1] = col[y1[valid1]].astype(np.float32)
    return np.clip(c0 * (1.0 - f) + c1 * f, 0, 255).astype(np.uint8)


def shear_to_iso_slope(im: Image.Image, target_slope: float) -> Image.Image:
    """Ajusta a inclinação da base de um painel reto para `target_slope` (±0.50)."""
    arr = np.array(im)
    h, w, _ = arr.shape
    a = arr[:, :, 3] > 30
    xs_v, ys_v = [], []
    margin = max(8, w // 16)
    for x in range(margin, w - margin):
        ys = np.where(a[:, x])[0]
        if len(ys):
            xs_v.append(float(x))
            ys_v.append(float(ys.max()))
    if len(xs_v) < 10:
        return im
    cur_slope, _ = np.polyfit(np.array(xs_v), np.array(ys_v), 1)
    delta = target_slope - cur_slope
    pad_y = int(np.ceil(abs(delta) * w * 0.6)) + 8
    padded = np.zeros((h + 2 * pad_y, w, 4), dtype=np.uint8)
    padded[pad_y : pad_y + h, :, :] = arr
    cx = (w - 1) * 0.5
    out = np.zeros_like(padded)
    for x in range(w):
        out[:, x, :] = shift_column_rgba(padded[:, x, :], delta * (x - cx))
    return Image.fromarray(out, mode="RGBA")


def shear_corner_to_iso(im: Image.Image) -> Image.Image:
    """Ajusta as duas alas do canto norte para -0.50 (esq) e +0.50 (dir)."""
    arr = np.array(im)
    h, w, _ = arr.shape
    a = arr[:, :, 3] > 30
    mid = (w - 1) * 0.5
    xs_l, ys_l, xs_r, ys_r = [], [], [], []
    for x in range(12, w - 12):
        ys = np.where(a[:, x])[0]
        if not len(ys):
            continue
        if x < mid - 24:
            xs_l.append(float(x))
            ys_l.append(float(ys.max()))
        elif x > mid + 24:
            xs_r.append(float(x))
            ys_r.append(float(ys.max()))
    sl, _ = np.polyfit(np.array(xs_l), np.array(ys_l), 1)
    sr, _ = np.polyfit(np.array(xs_r), np.array(ys_r), 1)
    dl = -0.50 - sl  # negativo: desce para a esquerda (x - mid < 0 -> dy > 0)
    dr = +0.50 - sr  # positivo: desce para a direita (x - mid > 0 -> dy > 0)
    pad_y = int(np.ceil(max(abs(dl), abs(dr)) * w * 0.55)) + 10
    padded = np.zeros((h + 2 * pad_y, w, 4), dtype=np.uint8)
    padded[pad_y : pad_y + h, :, :] = arr
    out = np.zeros_like(padded)
    for x in range(w):
        dx = x - mid
        dy = dl * dx if dx < 0 else dr * dx
        out[:, x, :] = shift_column_rgba(padded[:, x, :], dy)
    return Image.fromarray(out, mode="RGBA")


def trim_and_pad(im: Image.Image, target_w: int | None = None, pad: int = 6) -> Image.Image:
    arr = np.array(im)
    ys, xs = np.where(arr[:, :, 3] > 8)
    if len(xs) == 0:
        return im
    cropped = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if target_w is not None and cropped.width > target_w - 2 * pad:
        usable_w = target_w - 2 * pad
        scale = usable_w / cropped.width
        usable_h = max(1, round(cropped.height * scale))
        cropped = cropped.resize((usable_w, usable_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cropped.width + 2 * pad, cropped.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad))
    return canvas


def build_floor_diamond(im: Image.Image, out_w: int = 256, out_h: int = 136) -> Image.Image:
    clean = remove_magenta(im)
    arr = np.array(clean)
    ys, xs = np.where(arr[:, :, 3] > 16)
    cropped = clean.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    resized = cropped.resize((out_w - 8, out_h - 8), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    canvas.paste(resized, (4, 4))
    return canvas


def make_open_fluxo(clean_fluxo: Image.Image) -> Image.Image:
    """Mantém os dois postes submarinos de bronze/aço e acalma a cortina central."""
    arr = np.array(clean_fluxo).copy()
    h, w, _ = arr.shape
    for x in range(w):
        u = x / max(1, w - 1)
        if 0.215 < u < 0.785:
            col = arr[:, x, :]
            cyan_mask = (col[:, 3] > 0) & (
                (col[:, 1].astype(int) + col[:, 2].astype(int)) > col[:, 0].astype(int) * 2
            )
            ys = np.where(col[:, 3] > 0)[0]
            if len(ys) > 0:
                y_bot = ys.max()
                for y in ys:
                    if cyan_mask[y]:
                        if y < y_bot - 14:
                            arr[y, x, 3] = 0
                        else:
                            arr[y, x, 3] = int(arr[y, x, 3] * 0.42)
    return Image.fromarray(arr, mode="RGBA")


def make_active_valve(clean_valve: Image.Image) -> Image.Image:
    arr = np.array(clean_valve, dtype=np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    cyan = (a > 20) & (b > 150) & (g > 140) & (r < 130)
    g[cyan] = np.clip(g[cyan] * 1.15 + 28, 0, 255)
    b[cyan] = np.clip(b[cyan] * 1.12 + 24, 0, 255)
    r[cyan] = np.clip(r[cyan] * 0.7 + 40, 0, 255)
    metal = (a > 80) & (~cyan) & (b > r + 8)
    g[metal] = np.clip(g[metal] + 12, 0, 255)
    b[metal] = np.clip(b[metal] + 18, 0, 255)
    return Image.fromarray(np.stack([r, g, b, a], axis=-1).astype(np.uint8), mode="RGBA")


def main() -> None:
    # 1. Pisos 2:1
    for src_name, out_name in [
        ("piso-ardosia-mare.png", "piso-ardosia-mare.png"),
        ("piso-grade-mare.png", "piso-grade-mare.png"),
    ]:
        tile = build_floor_diamond(Image.open(SRC / src_name))
        tile.save(OUT / out_name)
        print("saved", out_name, tile.size)

    # 2. Paredes calibradas em inclinação isométrica exata 2:1 (±0.500)
    canto_raw = trim_and_pad(remove_magenta(Image.open(SRC / "parede-canto-mare.png")), target_w=520)
    canto = trim_and_pad(shear_corner_to_iso(canto_raw), target_w=520)
    canto.save(OUT / "parede-canto-mare.png")
    print("saved parede-canto-mare.png", canto.size)

    canto_src = remove_magenta(Image.open(SRC / "parede-canto-mare.png"))
    wing_crop = canto_src.crop((820, 0, canto_src.width, canto_src.height)).transpose(
        Image.Transpose.FLIP_LEFT_RIGHT
    )
    tubos = trim_and_pad(shear_to_iso_slope(trim_and_pad(wing_crop, target_w=380), -0.50), target_w=380)
    tubos.save(OUT / "parede-tubos-mare.png")
    print("saved parede-tubos-mare.png", tubos.size)

    aquario_flipped = remove_magenta(Image.open(SRC / "parede-aquario-mare.png")).transpose(
        Image.Transpose.FLIP_LEFT_RIGHT
    )
    aquario_wall = trim_and_pad(
        shear_to_iso_slope(trim_and_pad(aquario_flipped, target_w=460), +0.50),
        target_w=460,
    )
    aquario_wall.save(OUT / "parede-aquario-mare.png")
    print("saved parede-aquario-mare.png", aquario_wall.size)

    porta_clean = trim_and_pad(remove_magenta(Image.open(SRC / "porta-eclusa-mare.png")), target_w=340)
    porta = trim_and_pad(shear_to_iso_slope(porta_clean, -0.50), target_w=340)
    porta.save(OUT / "porta-eclusa-mare.png")
    print("saved porta-eclusa-mare.png", porta.size)

    # 3. Núcleo Hidrodimensional (Gerador de Corrente)
    gerador = trim_and_pad(remove_magenta(Image.open(SRC / "gerador-corrente-mare.png")), target_w=420)
    gerador.save(OUT / "gerador-corrente-mare.png")
    print("saved gerador-corrente-mare.png", gerador.size)

    # 4. Barreira de Fluxo Contido calibrada exatamente em -0.50 (eixo x=10, de (10,7) a (10,4))
    fluxo_raw = trim_and_pad(remove_magenta(Image.open(SRC / "fluxo-contido-mare.png")), target_w=440)
    fluxo_iso = shear_to_iso_slope(fluxo_raw, -0.50)
    fluxo_closed = trim_and_pad(fluxo_iso, target_w=440)
    fluxo_open = trim_and_pad(make_open_fluxo(fluxo_iso), target_w=440)
    fluxo_closed.save(OUT / "fluxo-contido-mare.png")
    fluxo_open.save(OUT / "fluxo-aberto-mare.png")
    print("saved fluxo-contido-mare.png / fluxo-aberto-mare.png", fluxo_closed.size, fluxo_open.size)

    # 5. Arcos Abissais do Conduto Oceânico
    arcos_raw = remove_magenta(Image.open(SRC / "arco-conduto-oceano.png"))
    arco_mare = trim_and_pad(arcos_raw.crop((0, 0, 722, arcos_raw.height)), target_w=360)
    arco_enseada = trim_and_pad(arcos_raw.crop((722, 0, arcos_raw.width, arcos_raw.height)), target_w=360)
    arco_mare.save(OUT / "arco-conduto-mare.png")
    arco_enseada.save(OUT / "arco-conduto-enseada.png")
    print("saved arco-conduto-mare/enseada", arco_mare.size, arco_enseada.size)

    # 6. Coluna Hidráulica + Lanterna Bioluminescente de Água-Viva
    cols_raw = remove_magenta(Image.open(SRC / "colunas-mare.png"))
    pilar = trim_and_pad(cols_raw.crop((0, 0, 740, cols_raw.height)), target_w=190)
    lanterna = trim_and_pad(cols_raw.crop((740, 0, cols_raw.width, cols_raw.height)), target_w=165)
    pilar.save(OUT / "pilar-hidro-mare.png")
    lanterna.save(OUT / "lanterna-abissal-mare.png")
    print("saved pilar/lanterna", pilar.size, lanterna.size)

    # 7. Console Batimétrico de Sonar + Válvula/Comporta Hidráulica
    rel_raw = remove_magenta(Image.open(SRC / "reliquias-mare.png"))
    sonar = trim_and_pad(rel_raw.crop((0, 0, 760, rel_raw.height)), target_w=240)
    valvula_raw = rel_raw.crop((760, 0, rel_raw.width, rel_raw.height))
    valvula = trim_and_pad(valvula_raw, target_w=210)
    valvula_ativa = trim_and_pad(make_active_valve(valvula_raw), target_w=210)
    sonar.save(OUT / "terminal-sonar-mare.png")
    valvula.save(OUT / "valvula-pressao-mare.png")
    valvula_ativa.save(OUT / "valvula-ativa-mare.png")
    print("saved sonar/valvula", sonar.size, valvula.size)


if __name__ == "__main__":
    main()
