#!/usr/bin/env python3
"""Recorta o promontório do portal sudeste inteiro da arte de referência.

O pôster tem UM promontório: um lajeado largo de pedra ligado à areia da praia
pelo oeste, com o arco do conduto assentado no centro, corais na base rochosa
voltada para o mar e o clarão do vórtice dentro do arco.

O mapa vinha desenhando DUAS peças sobrepostas ali (o arco antigo de pedra
cinza encavalado atrás do novo) e a base parecia pilha solta de pedras.

MÉTODO (por que não é por cor): o clarão do arco é ciano, quase igual ao mar
raso. Qualquer máscara por cor arrancava o miolo do arco e o buraco era
preenchido pelo fundo. Aqui o mar é o único fundo LIGADO À BORDA da imagem,
então ele é apagado por alagamento (flood fill) a partir das bordas: tudo que
o alagamento não alcança — lajeado, arco, corais e o clarão interno — fica.

Uso: tools/recortar-promontorio-sudeste.py
Saída: assets/sprites/enseada-lote2/promontorio-sudeste.png
"""
import numpy as np
from PIL import Image
from scipy import ndimage

REF = 'assets/source-art/reparo-norte-10/referencia-mestre.png'
SAIDA = 'assets/sprites/enseada-lote2/promontorio-sudeste.png'
CAIXA = (1092, 316, 1244, 502)


# Contorno do promontório lido na grade do pôster (px absolutos). A máscara é
# o polígono desenhado em escala 8x sobre TODA a imagem e reduzido de volta:
# assim a borda sai limpa e nada de máscara por cor pode arrancar o arco.
CONTORNO = [
    (1093, 372), (1099, 386), (1105, 392), (1113, 393), (1119, 388),
    (1128, 391), (1136, 397), (1146, 400), (1156, 402), (1166, 399),
    (1176, 395), (1186, 391), (1196, 389), (1204, 392), (1212, 397),
    (1222, 401), (1230, 408), (1236, 417), (1241, 428), (1243, 440),
    (1241, 452), (1237, 462), (1231, 470), (1225, 477), (1217, 482),
    (1210, 488), (1203, 494), (1194, 497), (1186, 495), (1180, 489),
    (1174, 484), (1166, 482), (1157, 484), (1148, 488), (1139, 492),
    (1130, 494), (1122, 491), (1115, 485), (1108, 478), (1100, 471),
    (1094, 462), (1090, 452), (1087, 441), (1086, 429), (1087, 418),
    (1089, 405), (1091, 392), (1093, 380),
]


# Silhueta externa do arco do conduto (o clarão do vórtice fica por dentro).
# Também lida na grade do pôster.
ARCO = [
    (1128, 411), (1123, 400), (1121, 386), (1123, 370), (1128, 354),
    (1136, 341), (1147, 331), (1160, 325), (1173, 325), (1185, 330),
    (1194, 340), (1200, 354), (1203, 370), (1204, 386), (1205, 400),
    (1202, 411),
]


def main():
    ref = Image.open(REF).convert('RGBA')
    crop = ref.crop(CAIXA)
    a = np.asarray(crop).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Mar em qualquer tom: turquesa raso, ciano do clarão e azul de fundo.
    mar = ((b > r + 34) & (b > 62)) | ((g > r + 45) & (b > r + 38)) | (b > 135)
    # A areia clara da praia e a grama nunca são mar (proteção contra falso
    # positivo na borda oeste, onde o lajeado encosta na areia).
    mar &= ~((r > 150) & (g > 120) & (r > b + 35))

    # Alaga o mar a partir das bordas; o que sobrar é a peça.
    lab, n = ndimage.label(mar)
    bordas = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    bordas.discard(0)
    mar_externo = np.isin(lab, list(bordas)) if bordas else np.zeros_like(mar)

    corpo = ~mar_externo
    # Buraco interno que não seja mar (contorno escuro de pedra) fecha.
    corpo = ndimage.binary_fill_holes(corpo)
    corpo = ndimage.binary_closing(corpo, np.ones((3, 3)))
    # Só o bloco do promontório: ilhas soltas de "não-mar" (pedrinhas, algas,
    # peixes fora da peça) saem.
    lab2, n2 = ndimage.label(corpo)
    if n2:
        tam = ndimage.sum(corpo, lab2, range(1, n2 + 1))
        corpo = lab2 == int(np.argmax(tam)) + 1
    # Máscara desenhada (polígono 8x) por cima da máscara por cor: o interior
    # do promontório fica garantidamente sólido, inclusive o vórtice.
    S = 8
    from PIL import ImageDraw
    poly = Image.new('L', (crop.width * S, crop.height * S), 0)
    pontos = [((x - CAIXA[0]) * S, (y - CAIXA[1]) * S) for x, y in CONTORNO]
    ImageDraw.Draw(poly).polygon(pontos, fill=255)
    poly = poly.resize(crop.size, Image.LANCZOS)
    contorno = np.asarray(poly) > 127

    # UNIÃO (não interseção): a base vem do contorno desenhado; o arco, os
    # corais e o clarão vêm da máscara por cor, que é boa nessas áreas claras.
    # O vazamento antigo era o brilho do portal sobre o mar, e ele é contido
    # pelo recorte do bloco (`corpo`, que só mantém o promontório).
    poly2 = Image.new('L', (crop.width * S, crop.height * S), 0)
    ImageDraw.Draw(poly2).polygon([((x - CAIXA[0]) * S, (y - CAIXA[1]) * S) for x, y in ARCO], fill=255)
    arco = np.asarray(poly2.resize(crop.size, Image.LANCZOS)) > 127
    # Dentro do arco só o AZUL ESCURO do mar aberto sai; o clarão do vórtice
    # (ciano claro) fica, que é o interior da peça na arte.
    oceano_fundo = (b > r + 60) & (b > 100) & (g < 150) & ~((g > 170) & (b > 150))
    arco &= ~oceano_fundo

    alfa_final = contorno | arco | ndimage.binary_fill_holes(corpo)
    # Tira o fiapo de brilho que escapa pelo mar a leste/leste-sul.
    alfa_final = ndimage.binary_fill_holes(alfa_final)
    alfa_final = ndimage.binary_opening(alfa_final, np.ones((2, 2)))
    alfa = np.clip(ndimage.gaussian_filter((alfa_final * 255).astype(float), .6), 0, 255).astype(np.uint8)
    crop.putalpha(Image.fromarray(alfa))
    out = crop.crop(crop.getbbox())
    out.save(SAIDA)
    ys, xs = np.nonzero(alfa > 127)
    print(f'{SAIDA}: {out.size}  (pôster {CAIXA[0] + xs.min()},{CAIXA[1] + ys.min()} .. '
          f'{CAIXA[0] + xs.max()},{CAIXA[1] + ys.max()})')


if __name__ == '__main__':
    main()
