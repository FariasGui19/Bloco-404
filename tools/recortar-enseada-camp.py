#!/usr/bin/env python3
"""Recorta os props do acampamento da Enseada dos Ecos.

A arte antiga (crop por flood fill do branco) arrastava um anel de grama/areia
em volta de cada objeto — o "halo" que deixava os sprites feios. Cor nao
resolve (verde da lona ~ verde da grama).

Agora cada prop vem de uma geracao dedicada sobre fundo magenta chapado
(`assets/source-art/reparo-norte-11/`). Magenta nao existe na paleta do jogo,
entao a chave e exata: nao sobra franja nem halo.

Saidas:
  assets/sprites/enseada-camp/<nome>.png   RGBA justo, largura ~= larguraPx
  assets/sprites/enseada-camp/medidas-camp.json

A altura desenhada de cada prop e mantida igual a da versao antiga (ver
`ALTURA_ANTIGA`), porque a escala no mapa ja estava boa — so a forma estava
errada. Assim `larguraPx` novo = altura_antiga * (largura/altura) do recorte.
"""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FONTE = RAIZ / "assets/source-art/reparo-norte-11"
DESTINO = RAIZ / "assets/sprites/enseada-camp"

# Enquadramento APROVADO de cada prop no mapa — largura x altura com que ele
# ja aparecia (larguraPx do objeto x altura derivada do PNG antigo).
#
# O renderer desenha `w = object.larguraPx` e `h = w * frame.h / frame.w`, ou
# seja: a ALTURA desenhada vem do aspecto do arquivo. Por isso o recorte novo
# e montado numa tela transparente com exatamente este aspecto — o sprite
# passa a ter a mesma pegada de antes sem esticar nada, e `larguraPx` no mapa
# nao precisa mudar.
ENQUADRAMENTO = {
    # (largura, altura) do objeto medido na referencia-mestre, em px de arte.
    # 1 px de arte = 2 px de jogo, e o renderer deriva a altura do aspecto do
    # arquivo — entao estas proporcoes sao o que fica na tela.
    'relogio':            ( 46,  69),
    'bancada':            ( 60,  65),
    'torre-radio':        ( 60, 140),
    'fogueira':           ( 41,  43),
    'tenda-referencia':   ( 77,  80),
    'pilha-caixas':       ( 68,  55),
    'banco':              ( 72,  47),
    'cesto-ferramentas':  ( 29,  45),
    'arvore-referencia-a': ( 86,  79),
    'caixa':              ( 58,  54),
}

# Recorte manual na folha gerada, quando a geracao devolveu mais de uma
# variante ou deixou cordas soltas sobrando.
RECORTES = {
    # a torre veio em tres variantes; a do meio (colunas 585-795) e a unica
    # com base de pedra completa
    'torre-radio': (585, 0, 795, 768),
}

# Props que devem manter SO o maior componente depois do chroma key: mata
# fragmento solto de geracao (faisca, corda, segunda variante) sem tocar no
# corpo do objeto.
SO_MAIOR_COMPONENTE = {'torre-radio'}

# Pixels a apagar ANTES do chroma key: manchas de cor que a geracao
# acrescentou e nao fazem parte do prop. (r_min, g_min, b_max).
# A torre veio cercada de "faiscas" laranja/amarelas; o vermelho da estrutura
# tem g baixo, entao este filtro nao come a torre.
CORES_ESPURIAS = {
    'torre-radio': (195, 95, 140),
}


def limpar_espurios(nome: str, rgb: np.ndarray) -> np.ndarray:
    regra = CORES_ESPURIAS.get(nome)
    if not regra:
        return rgb
    r_min, g_min, b_max = regra
    r, g, b = (rgb[..., i].astype(np.int16) for i in range(3))
    mancha = (r >= r_min) & (g >= g_min) & (b <= b_max)
    if not mancha.any():
        return rgb
    # dilata 2 px para levar a anti-serrilhada junto
    mancha = cv2.dilate(mancha.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    out = rgb.copy()
    out[mancha] = (255, 0, 255)
    return out


def chave_magenta(rgb: np.ndarray) -> np.ndarray:
    """Mascara do fundo magenta (1 = fundo).

    Magenta = R e B altos, G baixo. `mag` mede o quanto o pixel pende para
    magenta. Limiar generoso + flood fill das bordas: assim um detalhe
    arroxeado *dentro* do objeto nao e comido.
    """
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    mag = np.minimum(r, b) - g
    candidato = (mag > 22).astype(np.uint8)

    # Fica so o magenta LIGADO A BORDA: um detalhe arroxeado dentro do objeto
    # (janela do relogio, sombra da lona) nao e confundido com fundo.
    n, rot, st, _ = cv2.connectedComponentsWithStats(candidato, 8)
    if n <= 1:
        return np.zeros_like(candidato)
    borda = set(rot[0, :]).union(rot[-1, :], rot[:, 0], rot[:, -1])
    borda.discard(0)
    fundo = np.isin(rot, list(borda)).astype(np.uint8)
    return fundo


def despill(rgb: np.ndarray, alfa: np.ndarray) -> np.ndarray:
    """Tira o roxo que sobrou nas bordas anti-serrilhadas.

    Na franja o pixel e object-cor + magenta. Como magenta tem G baixo,
    puxar R e B para o nivel de G devolve a cor do objeto.
    """
    out = rgb.astype(np.int16)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    excesso = np.minimum(r, b) - g
    franja = (alfa > 0) & (excesso > 0)
    correcao = np.where(franja, excesso, 0)
    out[..., 0] = np.clip(r - correcao, 0, 255)
    out[..., 2] = np.clip(b - correcao, 0, 255)
    return out.astype(np.uint8)


def recortar(nome: str) -> dict:
    origem = FONTE / f"{nome}.png"
    rgb = np.asarray(Image.open(origem).convert("RGB"))
    if nome in RECORTES:
        x0, y0, x1, y1 = RECORTES[nome]
        rgb = rgb[y0:y1, x0:x1]

    rgb = limpar_espurios(nome, rgb)
    alfa = ((1 - chave_magenta(rgb)) * 255).astype(np.uint8)
    if nome in SO_MAIOR_COMPONENTE:
        n, rot, st, _ = cv2.connectedComponentsWithStats((alfa > 0).astype(np.uint8), 8)
        if n > 1:
            maior = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            alfa = np.where(rot == maior, alfa, 0).astype(np.uint8)
    limpo = despill(rgb, alfa)

    # justo no conteudo (tira a moldura de magenta)
    ys, xs = np.nonzero(alfa)
    if not len(ys):
        raise SystemExit(f"{nome}: nada sobrou depois do chroma key")
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    limpo = limpo[y0:y1, x0:x1]
    alfa = alfa[y0:y1, x0:x1]

    # --- escala ------------------------------------------------------
    # `getFrame` recorta o quadro no bbox do CONTEUDO antes de desenhar, e o
    # renderer deriva a altura de `larguraPx * crop.h / crop.w`. Ou seja: o
    # que vale na tela e o aspecto do CONTEUDO, nao o do arquivo.
    #
    # Por isso nada de tela transparente (o crop joga fora): o conteudo e
    # escalado UNIFORMEMENTE ate a altura medida na referencia-mestre e o
    # `larguraPx` do objeto passa a ser a largura que saiu daqui. Sem
    # distorcao nenhuma, e a escala na tela e a da arte conceitual.
    largura_px, altura_px = ENQUADRAMENTO[nome]
    ref_w, ref_h = largura_px * 2, altura_px * 2             # 1 px arte = 2 px jogo
    # Media geometrica das duas escalas desejadas (largura e altura). Pela
    # altura pura, uma geracao mais "gorda" que a arte-mestre estoura em
    # largura; pela largura, achata. A media fica sempre perto das duas.
    escala = float(np.sqrt((ref_w / alfa.shape[1]) * (ref_h / alfa.shape[0])))
    out_w = max(1, round(alfa.shape[1] * escala))
    out_h = max(1, round(alfa.shape[0] * escala))

    rgba = np.dstack([limpo, alfa])
    arte = cv2.resize(rgba, (out_w, out_h), interpolation=cv2.INTER_AREA)
    a = arte[..., 3]
    arte[..., 3] = np.where(a > 110, 255, 0).astype(np.uint8)

    # `limpo`/`alfa` vem de uma PIL RGB, ou seja ja estao em R,G,B,A — nao
    # passar por cvtColor(BGRA2RGBA) aqui, senao R e B trocam (madeira vira azul).
    Image.fromarray(arte).save(DESTINO / f"{nome}.png")

    return {
        "larguraPx": out_w,
        "alturaPx": altura_px * 2,
        "larguraRef": largura_px * 2,
        "arquivo": f"assets/sprites/enseada-camp/{nome}.png",
        "larguraArte": out_w // 2,
        "alturaArte": out_h // 2,
        "arte": [int(x0), int(y0), int(x1), int(y1)],
    }


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    medidas = {
        "fonte": "assets/source-art/reparo-norte-11 (geracao dedicada, fundo magenta)",
        "props": {},
    }
    for nome in ENQUADRAMENTO:
        m = recortar(nome)
        medidas["props"][nome] = m
        desvio = (m['larguraPx'] - m['larguraRef']) / m['larguraRef'] * 100
        print(f"{nome:22s} {m['larguraPx']:4d}x{m['alturaPx']:4d} px  "
              f"(ref {m['larguraRef']:3d} de largura, desvio {desvio:+5.1f}%)")
    (DESTINO / "medidas-camp.json").write_text(
        json.dumps(medidas, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\n{len(medidas['props'])} sprites em {DESTINO}/")


if __name__ == "__main__":
    main()
