#!/usr/bin/env python3
"""Prepara as folhas de NADO do operador (civil e os quatro trajes).

Uso (na raiz do projeto):
    python tools/preparar-nado.py

Fontes: assets/source-art/nado/<traje>-nado-a.png e -b.png — o personagem
original, deitado na braçada, de perfil para a DIREITA, sobre magenta puro.
  a = um braço à frente (pegada)      b = braços recolhidos (deslize)

Nadando, o corpo fica na horizontal e o jogo o GIRA na direção do
deslocamento e ondula o corpo em fatias (pernada). Por isso bastam dois
quadros por traje. Saída: uma folha de UMA linha e DUAS colunas por traje,

    assets/sprites/player/nado-<traje>.png      (2 x CELULA_W, CELULA_H)

com os dois quadros na MESMA escala e no MESMO lugar: o script mede os pés
(extremo esquerdo) e a cabeça (ponto mais alto do contorno) de cada quadro,
iguala a distância pés→cabeça e alinha o eixo do corpo com a horizontal.
Sem isso o corpo "pula" e muda de tamanho a cada braçada.
Dependências: Pillow, NumPy, SciPy.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FONTE = 'assets/source-art/nado/'
SAIDA = 'assets/sprites/player/'
TRAJES = ('civil', 'mare', 'bio', 'dominio', 'nucleo')
CELULA_W, CELULA_H = 340, 120
PES_X = 14             # onde ficam os pés dentro da célula
CORPO = 216            # distância pés -> centro da cabeça, em pixels da folha
EIXO_Y = 68            # linha do eixo do corpo dentro da célula


def chave_magenta(im, limiar=70):
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g
    fundo = (m > limiar) & (r > 140) & (b > 140)
    alpha = np.where(fundo, 0, 255).astype(np.uint8)
    for _ in range(2):
        opaco = alpha > 0
        miolo = ndi.binary_erosion(opaco, structure=np.ones((3, 3)), border_value=0)
        alpha[(opaco & ~miolo) & (m > 22) & (r > 100) & (b > 100)] = 0
    rr, bb = r.copy(), b.copy()
    tinto = (alpha > 0) & (m > 8)
    rr[tinto] = np.minimum(r[tinto], g[tinto] + 8)
    bb[tinto] = np.minimum(b[tinto], g[tinto] + 8)
    im = Image.fromarray(np.dstack([rr, g, bb, alpha]).astype(np.uint8), 'RGBA')
    # só o corpo: descarta respingos soltos que a geração possa ter deixado
    lab, n = ndi.label(np.asarray(im)[..., 3] > 0)
    if n > 1:
        tam = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))
        a2 = np.asarray(im).copy()
        a2[..., 3] = np.where(lab == (int(np.argmax(tam)) + 1), a2[..., 3], 0)
        im = Image.fromarray(a2, 'RGBA')
    return im.crop(im.getbbox())


def medir(im):
    """Devolve (pes_x, cabeca_x, k, c): extremos e a reta do eixo do corpo."""
    a = np.asarray(im)[..., 3] > 0
    h, w = a.shape
    topo = np.array([np.argmax(a[:, x]) if a[:, x].any() else h for x in range(w)])
    # Cabeça: o trecho mais alto do contorno, procurado na metade da frente.
    suave = ndi.uniform_filter1d(topo.astype(float), size=max(5, w // 28))
    ini = int(w * .45)
    cabeca = ini + int(np.argmin(suave[ini:]))
    xs = np.arange(w)
    cols = a.any(0)
    centros = np.array([np.nonzero(a[:, x])[0].mean() if cols[x] else np.nan for x in xs])
    # Eixo: só do pé até o ombro — o braço estendido puxaria a reta para cima.
    trecho = cols & (xs > w * .06) & (xs < cabeca - w * .08)
    k, c = np.polyfit(xs[trecho], centros[trecho], 1)
    return 0, cabeca, float(k), float(c)


for traje in TRAJES:
    folha = Image.new('RGBA', (CELULA_W * 2, CELULA_H))
    for i, quadro in enumerate('ab'):
        im = chave_magenta(Image.open(f'{FONTE}{traje}-nado-{quadro}.png'))
        _, _, k, _ = medir(im)
        angulo = np.degrees(np.arctan(k))
        im = im.rotate(angulo, resample=Image.Resampling.BICUBIC, expand=True)
        im = im.crop(im.getbbox())
        _, cabeca, k, c = medir(im)
        escala = CORPO / cabeca
        im = im.resize((round(im.width * escala), round(im.height * escala)), Image.Resampling.LANCZOS)
        eixo = (k * (cabeca * .5) + c) * escala
        x = i * CELULA_W + PES_X
        y = round(EIXO_Y - eixo)
        if im.width > CELULA_W - PES_X - 4 or y < 2 or y + im.height > CELULA_H - 2:
            raise SystemExit(f'{traje}-{quadro}: não cabe na célula ({im.size}, y={y})')
        folha.alpha_composite(im, (x, y))
        print(f'nado-{traje} quadro {quadro}: {im.width}x{im.height} em ({x},{y}), eixo girado {angulo:+.1f} graus')
    folha.save(f'{SAIDA}nado-{traje}.png', optimize=True)
