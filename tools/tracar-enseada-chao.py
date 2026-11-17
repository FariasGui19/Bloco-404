#!/usr/bin/env python3
"""Classifica o CHÃO da Enseada a partir da arte de referência.

Lê `assets/source-art/reparo-norte-10/referencia-mestre.png` (a mesma imagem
que o jogador usa como alvo) e devolve, para cada célula da grade 72x64, uma
letra de chão. Nada é desenhado à mão: a forma da ilha, a grama e as trilhas
saem dos pixels da referência.

    areia (praia + trilha) -> 's'
    grama (campo e mata)   -> 'g'
    água                   -> '.'

A projeção é a mesma do resto do mapa:
    px = 737.5 + 16 * (x - y)      py = -152.75 + 8 * (x + y)
"""
import numpy as np
from PIL import Image
from scipy import ndimage

COLS, ROWS = 72, 64
REF = dict(cx=737.5, cy=-152.75, sx=16, sy=8)
FONTE = 'assets/source-art/reparo-norte-10/referencia-mestre.png'
SAIDA = 'js/data/enseada-chao.js'


def classifica(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    agua = (b > 120) & (b > r + 30) & (b > g + 10)
    # grama: verde com o canal G dominante. A mata escura entra junto.
    grama = (g > 70) & (g > r + 18) & (g > b + 22)
    # areia: clara e quente (praia, trilha, clareira do platô)
    areia = (r > 150) & (g > 130) & (b > 75) & (r > b + 45) & (g > b + 25)
    # rocha/canopy escuro e textos do pôster ficam de fora: viram "desconhecido"
    conhecido = agua | grama | areia
    return agua, grama, areia, conhecido


def preenche_desconhecido(classe, conhecido):
    """Pixels de prop/contorno/personagem: herdam o chão conhecido mais próximo."""
    _, (iy, ix) = ndimage.distance_transform_edt(~conhecido, return_indices=True)
    return classe[iy, ix]


def main():
    im = Image.open(FONTE)
    agua, grama, areia, conhecido = classifica(im)
    classe = np.zeros(agua.shape, dtype=np.uint8)  # 0 água, 1 grama, 2 areia
    classe[grama] = 1
    classe[areia] = 2
    classe = preenche_desconhecido(classe, conhecido)
    # suaviza decisões isoladas para a borda não ficar picotada
    classe = ndimage.median_filter(classe, size=7)

    # A LEGENDA DO PÔSTER NÃO É CHÃO. O pergaminho do canto inferior direito
    # ("Echo Monolith / Shell Grotto / ...") é creme o bastante para cair na
    # máscara de areia. Ele virava uma única coluna de areia de três tiles de
    # largura subindo pelo mar a leste do portal sudeste — a "tira de areia com
    # pedrinhas flutuando" que aparece no render. Zera a região do pergaminho
    # e devolve água.
    y_leg, x_leg = np.ogrid[:classe.shape[0], :classe.shape[1]]
    legenda = (x_leg >= 1024) & (y_leg >= 596)
    classe[legenda] = 0

    # MANCHAS DE AREIA NO MAR: a arte também tem ilhas de areia clara no fundo
    # do mar (areia dos vasos de coral, bancos rasos). Só a areia LIGADA ao
    # continente conta; as manchas pequenas voltam a ser água.
    areia_classe = classe == 2
    rot, n = ndimage.label(areia_classe)
    if n:
        tamanhos = ndimage.sum(areia_classe, rot, range(1, n + 1))
        grande = int(np.argmax(tamanhos)) + 1
        for i in range(1, n + 1):
            if i != grande and tamanhos[i - 1] < areia_classe.size * 0.004:
                classe[rot == i] = 0

    # ÁGUA INTERIOR: a arte tem nacos turquesa chapados no meio da ilha (poças
    # rasas da clareira) que, virando célula de água, saem como retângulos
    # ciano soltos na areia. Água de verdade é a que se liga ao mar: o que não
    # alcança a borda do mapa vira o chão em volta (grama ou areia).
    # Miolo da ilha: onde a água está CERCADA por chão seco. É só aí que um
    # naco turquesa pode virar célula de água por acidente.
    seca = ndimage.binary_fill_holes(classe != 0)
    seca = ndimage.binary_erosion(seca, np.ones((25, 25)))
    agua_cel = classe == 0
    rot_w, _ = ndimage.label(agua_cel)
    borda = set(rot_w[0, :]) | set(rot_w[-1, :]) | set(rot_w[:, 0]) | set(rot_w[:, -1])
    for i in range(1, rot_w.max() + 1):
        if i not in borda and (seca[rot_w == i].mean() > .5):
            nacos = rot_w == i
            vizinhos = ndimage.binary_dilation(nacos, np.ones((7, 7))) & ~nacos
            if (classe[vizinhos] == 1).sum() >= (classe[vizinhos] == 2).sum():
                classe[nacos] = 1
            else:
                classe[nacos] = 2

    # Amostragem FINA: 4x4 pontos por célula. O losango iso é largo em X e
    # estreito em Y; ler só o centro perde a curva do campo e o chão sai em
    # blocos. Cada sub-ponto é resolvido no mesmo chão que o motor usa.
    SUB = 4
    linhas = []
    for ty in range(ROWS):
        linha = []
        for tx in range(COLS):
            votos = []
            for sy in range(SUB):
                for sx in range(SUB):
                    # ponto dentro da célula, em coordenadas de tile
                    wx = tx + (sx + 0.5) / SUB
                    wy = ty + (sy + 0.5) / SUB
                    px = REF['cx'] + REF['sx'] * (wx - wy)
                    py = REF['cy'] + REF['sy'] * (wx + wy)
                    ix, iy = int(round(px)), int(round(py))
                    if 0 <= ix < classe.shape[1] and 0 <= iy < classe.shape[0]:
                        votos.append(int(classe[iy, ix]))
            if not votos:
                linha.append('.')
                continue
            valores, contagem = np.unique(votos, return_counts=True)
            v = int(valores[contagem.argmax()])
            # Empate ou quase: a maior fração de grama manda (o campo tem
            # borda suave, e a beira dele é onde o losango encosta no mar).
            if v == 2 and votos.count(1) >= len(votos) * 0.4:
                v = 1
            linha.append('.' if v == 0 else ('g' if v == 1 else 's'))
        linhas.append(''.join(linha))

    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write('// GERADO por tools/tracar-enseada-chao.py — não edite à mão.\n')
        f.write('// Chão de cada célula lido da arte de referência:\n')
        f.write("// 'g' grama · 's' areia (praia e trilha) · '.' água\n")
        f.write('export const CHAO = [\n')
        for linha in linhas:
            f.write(f"  '{linha}',\n")
        f.write('];\n')
    print(f'{SAIDA}: {ROWS}x{COLS}')
    print('grama', sum(l.count('g') for l in linhas),
          'areia', sum(l.count('s') for l in linhas),
          'agua', sum(l.count('.') for l in linhas))


if __name__ == '__main__':
    main()
