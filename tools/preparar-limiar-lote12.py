#!/usr/bin/env python3
"""Setor Limiar — lote 12: polimento de textura, movimento e transição.

Dez folhas, nenhuma mecânica nova: quatro texturas tileáveis (detalhe do chão,
pedra, cáustica da água, máscara de dissolução), dois sprites aditivos (halo e
banco de neblina) e quatro tiras de animação (chama da lanterna, estandarte
tremulando, poeira do passo, redemoinho de folhas).

As tiras saem do gerador com fundo inconsistente — célula branca aqui, preta
ali —, então cada célula é recortada por projeção de tinta e o fundo é limpo por
faixa de luminância, não por uma cor única. Quadros de animação nunca são
re-escalados individualmente: entram num canvas fixo com âncora constante para
que o movimento não trema.
"""
from __future__ import annotations

from pathlib import Path

from collections import deque

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source-art/setor-limiar-lote12"
TEX = ROOT / "assets/textures/setor-limiar-lote12"
SPR = ROOT / "assets/sprites/setor-limiar-lote12"

# name -> (lado, cores)
TEXTURES = {
    "detalhe-terreno": (256, 48),
    "detalhe-pedra": (256, 48),
    "agua-caustica": (256, 48),
    "mascara-transicao": (256, 16),
}

# name -> (lado final, quantas cores, fundo)
#   "luma"    fundo preto puro, alpha vem da luminância (sprite aditivo)
#   "magenta" chave de magenta
SPRITES = {
    "halo-aditivo": (128, 0, "luma"),
    "neblina-fundo": (512, 24, "luma"),
}

# name -> (quadros, lado do canvas, âncora, fundo)
STRIPS = {
    "lanterna-chama": (4, 128, "bottom", "luma"),
    "estandarte-tremura": (4, 160, "bottom", "magenta"),
    "poeira-passo": (6, 96, "bottom", "faixa"),
    "folhas-vento": (6, 96, "center", "magenta"),
}


def luma(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_magenta(r, g, b):
    # Chave frouxa de propósito: o contorno do gerador sai com magenta
    # anti-serrilhado, e um limiar apertado deixa franja rosa no sprite.
    return r > 140 and b > 140 and g < 130 and r - g > 60 and b - g > 60


def flood_clear(image, is_class, tol_key=None):
    """Apaga de alpha tudo que é da classe e está ligado à borda da célula.

    O gerador mistura cartão branco e fundo preto na mesma tira; uma chave de
    cor única sempre deixa sobra. Inundar a partir da borda remove as duas
    coisas sem comer o miolo do desenho.
    """
    px = image.load()
    width, height = image.size
    seen = bytearray(width * height)
    queue = deque()
    for x in range(width):
        for y in (0, height - 1):
            queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        r, g, b, a = px[x, y]
        if a == 0 or not is_class(r, g, b):
            continue
        px[x, y] = (r, g, b, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))


def clear_background(image, mode):
    """Devolve RGBA com o fundo do gerador removido."""
    image = image.convert("RGBA")
    if mode == "luma":
        px = image.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0 if luma(r, g, b) < 26 else 255)
        return image
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = px[x, y]
            # Magenta puro sai inteiro; o contorno misturado com a tinta
            # (rosa/roxo fraco) perde o alpha para não deixar franja na borda.
            if is_magenta(r, g, b) or (r - g > 26 and b - g > 26 and min(r, b) > 55):
                px[x, y] = (r, g, b, 0)
    if mode == "faixa":
        # Poeira tem buraco branco de cartão no meio do anel: branco puro sai
        # onde estiver, e o preto sai pela borda (o miolo escuro é sombra).
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = px[x, y]
                if a and min(r, g, b) > 236:
                    px[x, y] = (r, g, b, 0)
        flood_clear(image, lambda r, g, b: max(r, g, b) < 24)
    else:
        flood_clear(image, lambda r, g, b: min(r, g, b) > 236)
    return image


def spans_of_ink(image, wanted, min_ratio=0.06):
    """Divide a tira em `wanted` colunas pelo vazio entre as células."""
    alpha = image.getchannel("A")
    width, height = image.size
    cols = [sum(1 for y in range(0, height, 2) if alpha.getpixel((x, y)) > 8) for x in range(width)]
    peak = max(cols) or 1
    on = [c > peak * min_ratio for c in cols]
    runs, start = [], None
    for i, flag in enumerate(on):
        if flag and start is None:
            start = i
        elif not flag and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, width - 1))
    runs = [r for r in runs if r[1] - r[0] >= 4]
    if len(runs) < wanted:
        step = width / wanted
        return [(int(i * step), int((i + 1) * step) - 1) for i in range(wanted)]
    if len(runs) > wanted:
        # Junta os vãos mais curtos até sobrar o número de células pedido.
        while len(runs) > wanted:
            gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
            _, i = min(gaps)
            runs[i] = (runs[i][0], runs[i + 1][1])
            del runs[i + 1]
    return runs


def fit_canvas(piece, side, anchor, limit=0.9, erode=0):
    """Cola o quadro num canvas fixo, com âncora constante, sem re-escalar por quadro."""
    if erode:
        # Um pixel de erosão no alpha come a última fileira de contorno, que é
        # justamente onde sobra magenta misturado com a tinta.
        piece.putalpha(piece.getchannel("A").filter(ImageFilter.MinFilter(erode)))
    box = piece.getbbox() or (0, 0, 1, 1)
    piece = piece.crop(box)
    scale = (side * limit) / max(piece.size)
    if scale < 1:
        piece = piece.resize(
            (max(1, round(piece.width * scale)), max(1, round(piece.height * scale))),
            Image.Resampling.NEAREST,
        )
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    x = (side - piece.width) // 2
    margin = (side - side * limit) // 2
    y = side - piece.height - margin if anchor == "bottom" else (side - piece.height) // 2
    canvas.paste(piece, (int(x), int(max(0, y))), piece)
    return canvas


def prepare_texture(name, side, colors):
    image = Image.open(SRC / f"{name}.png").convert("RGB")
    if name == "mascara-transicao":
        image = image.convert("L").filter(ImageFilter.GaussianBlur(2)).convert("RGB")
    square = min(image.size)
    image = image.crop(
        (
            (image.width - square) // 2,
            (image.height - square) // 2,
            (image.width + square) // 2,
            (image.height + square) // 2,
        )
    )
    image = image.resize((side, side), Image.Resampling.LANCZOS)
    image = image.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    image.save(TEX / f"{name}.png", optimize=True)
    print(f"textura {name} {side}x{side}")


def prepare_sprite(name, side, colors, mode):
    image = clear_background(Image.open(SRC / f"{name}.png"), mode)
    if name == "neblina-fundo":
        box = image.getbbox() or (0, 0, image.width, image.height)
        image = image.crop((0, box[1], image.width, box[3]))
    image = fit_canvas(image, side, "center", limit=1.0)
    if colors:
        rgb = image.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
        rgb.putalpha(image.getchannel("A").filter(ImageFilter.MedianFilter(3)))
        image = rgb
    image.save(SPR / f"{name}.png", optimize=True)
    print(f"aditivo {name} {image.width}x{image.height}")


def prepare_strip(name, cells, side, anchor, mode):
    source = clear_background(Image.open(SRC / f"{name}.png"), mode)
    spans = spans_of_ink(source, cells)
    if len(spans) != cells:
        raise SystemExit(f"{name}: esperava {cells} células, achei {len(spans)}")
    for index, (x0, x1) in enumerate(spans):
        piece = source.crop((x0, 0, x1 + 1, source.height))
        frame = fit_canvas(piece, side, anchor, erode=3 if mode == "magenta" else 0)
        frame.save(SPR / f"{name}-{index}.png", optimize=True)
    print(f"tira {name}: {cells} quadros {side}x{side} (âncora {anchor})")


if __name__ == "__main__":
    TEX.mkdir(parents=True, exist_ok=True)
    SPR.mkdir(parents=True, exist_ok=True)
    for name, (side, colors) in TEXTURES.items():
        prepare_texture(name, side, colors)
    for name, (side, colors, mode) in SPRITES.items():
        prepare_sprite(name, side, colors, mode)
    for name, (cells, side, anchor, mode) in STRIPS.items():
        prepare_strip(name, cells, side, anchor, mode)
    print(f"OK: {len(TEXTURES)} texturas, {len(SPRITES)} aditivos, {len(STRIPS)} tiras")
