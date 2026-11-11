#!/usr/bin/env python3
"""Prepara o RELEVO da praia (falésias, pilares, cascatas, arco, ilhota).

Uso (na raiz do projeto):
    python tools/preparar-relevo-praia.py

Fontes: assets/source-art/praia-relevo/*.png — arte gerada sobre fundo
magenta puro (#FF00FF), uma peça (ou uma fileira de variações) por arquivo.
O magenta só existe nas fontes; o jogo recebe PNG com alpha real.

Para cada peça o script:
  1. troca o magenta por transparência e limpa a franja rosada da borda;
  2. separa variações que vieram na mesma imagem (os três pilares);
  3. mede a BASE: nas falésias em faixa, a reta do pé da parede (2:1); nos
     pilares e rochas, o canto da frente (ponto mais baixo). É daí que sai o
     pivô, para a peça assentar no tile certo sem `ajusteY` no olho;
  4. para as cascatas, extrai a máscara da ÁGUA (`*-agua.png`): é ela que o
     jogo anima por cima da arte parada;
  5. reduz para ~1,7x o tamanho de tela (sobra para o zoom) e salva em
     assets/sprites/praia/relevo/.

Por fim escreve `js/data/relevo-praia-medidas.js` com largura, altura e pivôs
medidos. O mapa usa esse arquivo — nenhum número de arte é digitado à mão.
Dependências: Pillow, NumPy, SciPy.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FONTE = 'assets/source-art/praia-relevo/'
SAIDA = 'assets/sprites/praia/relevo/'
MEDIDAS = 'js/data/relevo-praia-medidas.js'


def chave_magenta(im, limiar=70):
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g                      # "quanto de magenta" tem o pixel
    fundo = (m > limiar) & (r > 140) & (b > 140)
    alpha = np.where(fundo, 0, 255).astype(np.uint8)
    for _ in range(2):                            # franja de até 2 px
        opaco = alpha > 0
        miolo = ndi.binary_erosion(opaco, structure=np.ones((3, 3)), border_value=0)
        alpha[(opaco & ~miolo) & (m > 22) & (r > 100) & (b > 100)] = 0
    rr, bb = r.copy(), b.copy()                   # despill do que sobrou
    tinto = (alpha > 0) & (m > 8)
    rr[tinto] = np.minimum(r[tinto], g[tinto] + 8)
    bb[tinto] = np.minimum(b[tinto], g[tinto] + 8)
    return Image.fromarray(np.dstack([rr, g, bb, alpha]).astype(np.uint8), 'RGBA')


def separar(im, min_area=3000, dilata=9):
    a = np.asarray(im)
    opaco = a[..., 3] > 0
    lab, n = ndi.label(ndi.binary_dilation(opaco, structure=np.ones((dilata, dilata))))
    partes = []
    for i in range(1, n + 1):
        mask = (lab == i) & opaco
        if mask.sum() < min_area:
            continue
        ys, xs = np.nonzero(mask)
        b = a.copy()
        b[..., 3] = np.where(mask, a[..., 3], 0)
        partes.append((xs.min(), Image.fromarray(b, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))))
    partes.sort(key=lambda p: p[0])
    return [p for _, p in partes]


def unir_soltos(im, min_area=3000, dilata=9):
    """Peça única: mantém o corpo e os pedregulhos soltos em volta dele."""
    return im.crop(im.getbbox())


def base_reta(im, ini=.12, fim=.88):
    """Reta do pé da parede: y = k*x + c, medida no contorno inferior."""
    a = np.asarray(im)[..., 3] > 0
    xs, ys = [], []
    for x in range(a.shape[1]):
        col = np.nonzero(a[:, x])[0]
        if len(col):
            xs.append(x); ys.append(col.max())
    xs, ys = np.array(xs), np.array(ys)
    sel = (xs > im.width * ini) & (xs < im.width * fim)
    k, c = np.polyfit(xs[sel], ys[sel], 1)
    return float(k), float(c)


def canto_frente(im):
    """Ponto mais baixo da peça (canto da frente do losango de base)."""
    a = np.asarray(im)[..., 3] > 0
    ys, xs = np.nonzero(a)
    ymax = ys.max()
    perto = xs[ys >= ymax - 3]
    return float(np.median(perto)), float(ymax)


def mascara_agua(im):
    """Água da cascata: ciano/turquesa claro e a espuma branca colada nela."""
    a = np.asarray(im).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    ciano = (al > 0) & (g > 150) & (b > 160) & (r < 150) & (b - r > 60)
    claro = (al > 0) & (r > 200) & (g > 225) & (b > 225)
    perto = ndi.binary_dilation(ciano, structure=np.ones((9, 9)))
    agua = ciano | (claro & perto)
    agua = ndi.binary_opening(agua, structure=np.ones((2, 2)))
    lab, n = ndi.label(ndi.binary_dilation(agua, structure=np.ones((5, 5))))
    if n > 1:                                      # só a queda principal
        tam = ndi.sum(agua, lab, range(1, n + 1))
        agua &= np.isin(lab, [i + 1 for i, t in enumerate(tam) if t > tam.max() * .12])
    m = np.zeros(a.shape[:2] + (4,), np.uint8)
    m[..., :3] = 255
    m[..., 3] = np.where(agua, 255, 0)
    return Image.fromarray(m, 'RGBA')


def reduzir(im, largura, filtro=Image.Resampling.LANCZOS):
    h = round(im.height * largura / im.width)
    return im.resize((largura, h), filtro)


def moldura(im, margem=4):
    out = Image.new('RGBA', (im.width + 2 * margem, im.height + 2 * margem))
    out.alpha_composite(im, (margem, margem))
    return out


# nome de saída, arquivo-fonte, índice da variação (ou None), largura final,
# tipo de base ('reta' = parede em faixa, 'canto' = pilar/rocha), cascata?
PECAS = [
    ('falesia-alta',       'falesia-alta.png',       None, 440, 'reta',  False),
    ('falesia-selva',      'falesia-selva.png',      None, 460, 'reta',  False),
    ('falesia-muro',       'falesia-muro-baixo.png', None, 520, 'reta',  False),
    ('pilar-samambaias',   'pilares-palmeiras.png',  0,    230, 'canto', False),
    ('pilar-palmeiras-a',  'pilares-palmeiras.png',  1,    250, 'canto', False),
    ('pilar-palmeiras-b',  'pilares-palmeiras.png',  2,    250, 'canto', False),
    ('pilar-cascata',      'pilar-cascata.png',      None, 200, 'canto', True),
    ('macico-cascata',     'macico-cascata.png',     None, 700, 'canto', True),
    ('arco-pedra',         'arco-pedra.png',         None, 420, 'reta',  False),
    ('ilhota-palmeiras',   'ilhota-palmeiras.png',   None, 300, 'canto', False),
    ('rochas-mar',         'rochas-mar.png',         None, 200, 'canto', False),
    ('rochedo-pe',         'rochedo-pe.png',         None, 220, 'canto', False),
]

medidas = {}
cache = {}
for nome, arquivo, indice, largura, base, cascata in PECAS:
    if arquivo not in cache:
        cache[arquivo] = chave_magenta(Image.open(FONTE + arquivo))
    limpo = cache[arquivo]
    peca = separar(limpo)[indice] if indice is not None else unir_soltos(limpo)

    agua = mascara_agua(peca) if cascata else None
    final = reduzir(peca, largura)
    if base == 'reta':
        k, c = base_reta(final)
        px, py = .5, (k * final.width / 2 + c) / final.height
        info = {'inclinacao': round(k, 3)}
    else:
        cx, cy = canto_frente(final)
        px, py = cx / final.width, cy / final.height
        info = {}

    M = 4
    emoldurado = moldura(final, M)
    emoldurado.save(f'{SAIDA}{nome}.png', optimize=True)
    w, h = emoldurado.size
    medidas[nome] = {
        'w': w, 'h': h,
        # pivôs já no quadro com moldura (é o que o recorte do jogo enxerga:
        # `sprite-clean.js` apara de volta para a caixa visível, sem a moldura).
        'pivotX': round((px * final.width) / final.width, 4),
        'pivotY': round((py * final.height) / final.height, 4),
        **info,
    }
    if agua is not None:
        ag = moldura(reduzir(agua, largura, Image.Resampling.BILINEAR), M)
        ag.save(f'{SAIDA}{nome}-agua.png', optimize=True)
        aa = np.asarray(ag)[..., 3] > 40
        ys, xs = np.nonzero(aa)
        # caixa da água relativa à caixa VISÍVEL da peça (0..1)
        medidas[nome]['agua'] = [
            round((xs.min() - M) / final.width, 4), round((ys.min() - M) / final.height, 4),
            round((xs.max() + 1 - M) / final.width, 4), round((ys.max() + 1 - M) / final.height, 4),
        ]
    print(f'{nome:20s} {w}x{h}  pivô ({medidas[nome]["pivotX"]:.3f}, {medidas[nome]["pivotY"]:.3f}) {info}')

with open(MEDIDAS, 'w') as f:
    f.write('// GERADO por tools/preparar-relevo-praia.py — não edite à mão.\n')
    f.write('// Largura/altura do PNG e pivôs medidos na própria arte (0..1 da caixa\n')
    f.write('// visível). `agua` é a caixa da queda-d\'água dentro da peça.\n')
    f.write('export const RELEVO_MEDIDAS = Object.freeze(')
    f.write(json.dumps(medidas, indent=2))
    f.write(');\n')
print('medidas ->', MEDIDAS)
