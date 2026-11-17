#!/usr/bin/env python3
"""Gera a faixa de calçada que liga o Pórtico Oeste à clareira central.

O pôster desenha essa ligação como uma FAIXA contínua de pedra aparelhada
(~34 px de largura), que sai do pórtico na praia oeste, faz uma curva fechada
no meio do caminho e sobe até a clareira do monólito. As lajotas soltas
(`stone-path-cobble.png`) lidas uma a uma viravam uma trilha pontilhada, que
não é o que a arte mostra.

A faixa é desenhada aqui, em perspectiva isométrica, com o mesmo cinza-bege da
arte (`#cbc3b0` / `#adada5`) e juntas escuras, para poder seguir uma curva em
vez de repetir uma peça retangular.

Saída: assets/sprites/enseada-lote2/calcada-central.png
Uso: .venv/bin/python tools/desenhar-calcada.py
"""
import math

from PIL import Image, ImageDraw

from pathlib import Path
RAIZ = Path(__file__).resolve().parents[1]
S = 3  # supersampling

# Pontos de controle da calçada no PÔSTER (px da arte de referência).
PONTOS = [
    (166, 407), (210, 397), (250, 380), (295, 369), (340, 368),
    (385, 369), (430, 370), (475, 372), (520, 369), (565, 361),
    (615, 353), (662, 347),
]
LARGURA = 34          # meia-espessura aparente da faixa, em px de pôster
JUNTA = 13            # espaçamento das juntas transversais


def catmull(pts, passos=18):
    """Interpola a curva passando por todos os pontos de controle."""
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(len(p) - 3):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        for k in range(passos):
            t = k / passos
            t2, t3 = t * t, t * t * t
            x = .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(pts[-1])
    return out


def main():
    linha = catmull(PONTOS)
    xs = [p[0] for p in linha]
    ys = [p[1] for p in linha]
    x0, y0 = int(min(xs)) - LARGURA - 8, int(min(ys)) - LARGURA - 8
    x1, y1 = int(max(xs)) + LARGURA + 8, int(max(ys)) + LARGURA + 8
    W, H = x1 - x0, y1 - y0

    im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def e(x, y):
        return ((x - x0) * S, (y - y0) * S)

    # Contorno e corpo da faixa. A largura é comprimida na vertical (a faixa
    # é vista de cima, em 2:1), então a espessura vertical é metade.
    esq, dir_ = [], []
    for i, (x, y) in enumerate(linha):
        a = linha[max(0, i - 1)]
        b = linha[min(len(linha) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        # A faixa é vista de cima em 2:1; a meia-espessura vertical é a
        # metade da horizontal para manter a perspectiva.
        esq.append((x + nx * LARGURA, y + ny * LARGURA * .30))
        dir_.append((x - nx * LARGURA, y - ny * LARGURA * .30))

    corpo = esq + dir_[::-1]
    d.polygon([e(*p) for p in corpo], fill=(203, 195, 176), outline=(126, 118, 104), width=2 * S)

    # Juntas transversais: cortes escuros a cada JUNTA px de curva.
    acc = 0.0
    for i in range(1, len(linha)):
        acc += math.hypot(linha[i][0] - linha[i - 1][0], linha[i][1] - linha[i - 1][1])
        if acc < JUNTA:
            continue
        acc = 0.0
        d.line([e(*esq[i]), e(*dir_[i])], fill=(150, 143, 128), width=2 * S)

    # Juntas longitudinais: uma pedra no meio, para a faixa não virar pista.
    meio_a = [(x, y + 0.1) for x, y in linha]
    for i in range(0, len(linha), 2):
        d.point([e(*meio_a[i])], fill=(150, 143, 128))

    # Variação de tom por bloco (algumas pedras mais escuras).
    for i in range(0, len(linha) - 6, 6):
        pts = esq[i:i + 6] + dir_[i:i + 6][::-1]
        if len(pts) < 8:
            continue
        if (i // 6) % 3 == 0:
            d.polygon([e(*p) for p in pts], fill=(191, 184, 166))

    im = im.resize((W, H), Image.LANCZOS)
    im.save(f'{RAIZ}/assets/sprites/enseada-lote2/calcada-central.png')

    bg = Image.new('RGBA', im.size, (86, 158, 96, 255))
    bg.alpha_composite(im)
    bg.convert('RGB').save('/tmp/calcada.png')
    print('ok', im.size)


if __name__ == '__main__':
    main()
