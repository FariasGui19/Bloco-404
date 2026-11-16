"""Traça a silhueta da ilha da Enseada a partir da arte de referência.

A arte mestre (`referencia-mestre.png`) está na MESMA projeção e na MESMA
escala de tile do jogo:

    px = 737.5 + 16 * (x - y)
    py = -152.75 + 8 * (x + y)

(é a transformação que `enseada-ecos.js` já usa na constante `REF`.)

Este script:

  1. separa mar de terra na arte por cor + flood fill das bordas;
  2. isola a massa principal da ilha (descarta ilhotas, bóias, peixes e HUD);
  3. fecha as enseadas estreitas e suaviza a serrilha de pixel;
  4. grava `js/data/enseada-costa.js` com:
       - `POLIGONO_ARTE`: o contorno em px da arte (fonte rastreável);
       - `POLIGONO`: o mesmo contorno convertido para o mundo (tiles);
       - `LINHAS`: para cada linha y da grade, o intervalo [x0, x1] de terra,
         que é o que o gerador de `aguaPraia` consome.

Rodar: python3 tools/tracar-enseada-costa.py
"""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
REF = RAIZ / 'assets/source-art/reparo-norte-10/referencia-mestre.png'
SAIDA = RAIZ / 'js/data/enseada-costa.js'

# Transformação do mapa (idêntica à REF de enseada-ecos.js)
CX, CY, SX, SY = 737.5, -152.75, 16.0, 8.0
COLS, ROWS = 72, 64


def arte_para_mundo(px, py):
    d = (px - CX) / SX
    t = (py - CY) / SY
    return (d + t) / 2, (t - d) / 2


def mundo_para_arte(x, y):
    return CX + SX * (x - y), CY + SY * (x + y)


def separar_mar():
    """Devolve a máscara booleana da massa principal de terra na arte."""
    arte = cv2.imread(str(REF), cv2.IMREAD_COLOR)
    b, g, r = [arte[..., i].astype(np.int16) for i in range(3)]
    # mar: azul/ciano dominante e espuma clara; moldura de madeira fica de fora
    mar = (((b >= r + 8) & (b > 88)) |
           ((g >= r + 26) & (b >= r + 26) & (g > 145)) |
           ((r > 238) & (g > 246) & (b > 228)))
    mar = mar.astype(np.uint8)
    altura, largura = mar.shape
    # flood fill do mar a partir de uma moldura interna (evita a moldura de madeira)
    semente = np.zeros((altura + 2, largura + 2), np.uint8)
    marcado = mar.copy()
    borda = 48
    for ponto in [(borda, borda), (largura - borda, borda), (borda, altura - borda),
                  (largura - borda, altura - borda), (largura // 2, borda),
                  (largura // 2, altura - borda), (borda, altura // 2),
                  (largura - borda, altura // 2)]:
        if mar[ponto[1], ponto[0]]:
            cv2.floodFill(marcado, semente, ponto, 2)
    oceano = marcado == 2
    terra = (~oceano).astype(np.uint8)
    # HUD e legendas não são ilha
    terra[:46, :] = 0
    terra[-42:, :] = 0
    terra[:, :46] = 0
    terra[:, -42:] = 0
    terra[648:, 975:] = 0          # legenda inferior direita
    terra[:118, :330] = 0          # título "ENSEADA DOS ECOS"
    # só a massa principal
    n, lab, stats, _ = cv2.connectedComponentsWithStats(terra, 8)
    principal = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (lab == principal).astype(np.uint8)


def contorno(mascara):
    """Contorno externo suavizado (Chaikin), em px da arte."""
    m = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    contornos, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    maior = max(contornos, key=cv2.contourArea)
    aproximado = cv2.approxPolyDP(maior, 1.8, True).reshape(-1, 2).astype(float)
    # Chaikin: troca a serrilha de pixel por um traço contínuo
    for _ in range(2):
        novo = []
        for i in range(len(aproximado)):
            p, q = aproximado[i], aproximado[(i + 1) % len(aproximado)]
            novo.append(p * 0.75 + q * 0.25)
            novo.append(p * 0.25 + q * 0.75)
        aproximado = np.array(novo)
    # reamostra a passo fixo: ~8 px de arte = meio tile
    pontos = list(aproximado)
    res = [pontos[0]]
    acumulado = 0.0
    alvo = 8.0
    for i in range(1, len(pontos) + 1):
        p, q = pontos[i - 1], pontos[i % len(pontos)]
        d = float(np.linalg.norm(q - p))
        if d <= 0:
            continue
        t = 0.0
        while acumulado + d - t >= alvo:
            t += alvo - acumulado
            res.append(p + (q - p) * (t / d))
            acumulado = 0.0
        acumulado += d - t
    return np.array(res)


def linhas_de_terra(poligono_mundo):
    """Para cada linha da grade, [x0, x1] em que o mundo é terra.

    O contorno (em tiles) é rastreado célula a célula: amostra o polígono em
    passos de 1/8 de tile e guarda o menor/maior x de terra por linha. É o que
    o gerador de `aguaPraia` consome — a costa deixa de ser um losango.
    """
    from matplotlib.path import Path as MplPath  # dependência só de ferramenta
    caminho = MplPath(poligono_mundo)
    xs = np.arange(0, COLS + 1, 1 / 8)
    ys = np.arange(0, ROWS + 1, 1 / 8)
    grade_x, grade_y = np.meshgrid(xs, ys)
    dentro = caminho.contains_points(np.column_stack([grade_x.ravel(), grade_y.ravel()]))
    dentro = dentro.reshape(grade_y.shape)
    linhas = []
    for iy in range(ROWS):
        mascara = dentro[iy * 8:(iy + 1) * 8].any(axis=0)
        idx = np.nonzero(mascara)[0]
        if not len(idx):
            linhas.append(None)
            continue
        x0 = xs[idx[0]]
        x1 = xs[idx[-1]]
        linhas.append([round(float(x0), 3), round(float(x1), 3)])
    return linhas


def main():
    import matplotlib  # noqa: F401  (erro claro se faltar)
    mascara = separar_mar()
    poligono = contorno(mascara)
    mundo = np.array([arte_para_mundo(px, py) for px, py in poligono])
    linhas = linhas_de_terra(mundo)
    corpo = (
        '// GERADO por tools/tracar-enseada-costa.py — não edite à mão.\n'
        '// Contorno da ilha da Enseada traçado sobre\n'
        '// assets/source-art/reparo-norte-10/referencia-mestre.png.\n\n'
        f'export const POLIGONO_ARTE = {json.dumps([[round(float(x), 1), round(float(y), 1)] for x, y in poligono])};\n\n'
        f'export const POLIGONO = {json.dumps([[round(float(x), 2), round(float(y), 2)] for x, y in mundo])};\n\n'
        '// Faixa de terra por linha da grade (72 colunas, 64 linhas).\n'
        '// `null` = linha inteira de mar. [x0, x1] em colunas.\n'
        'export const LINHAS = ' + json.dumps([
            ([round(float(v), 2) for v in l] if l else None) for l in linhas
        ]) + ';\n'
    )
    SAIDA.write_text(corpo, encoding='utf8')
    print('polígono:', len(poligono), 'pontos')
    print('mundo x:', round(mundo[:, 0].min(), 1), '..', round(mundo[:, 0].max(), 1))
    print('mundo y:', round(mundo[:, 1].min(), 1), '..', round(mundo[:, 1].max(), 1))
    print('linhas com terra:', sum(1 for l in linhas if l))
    print('->', SAIDA)


if __name__ == '__main__':
    main()
