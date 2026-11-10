#!/usr/bin/env python3
"""Recorte e composição das folhas de Ultimate do DOMÍNIO ANCIÃO.

O recorte compartilhado (`bio_arte.load_frames`) resolve quase tudo — magenta
→ alpha, faixas de figura, células iguais. O que ele NÃO resolve no Domínio:

  1. **O efeito é dourado, sólido e do tamanho da pessoa.** A caixa do desenho
     vira a medida do corpo, e o corpo encolhe justo no quadro do impacto (a
     parede da MURALHA cobre o tronco inteiro).
  2. **O gerador desenha as quatro poses em tamanhos diferentes.** Nesta
     rodada o CORPO DE TITÂNIO veio com a pose do titã ~1,7× maior que as
     outras três. Escala única deixaria o operador crescendo no meio do `F`.

A medida usada aqui é a do que não muda de forma:

  * `hair_top_cx` — o black power é o blob quase preto mais alto da figura
    (compacto, sempre no topo). Ele dá o TOPO do corpo e o CENTRO x, e o
    centro não é afetado por lâmina, trono ou parede.
  * `feet_row` — a sola é a última linha com MUITO pixel de traje escuro
    (cinza de saturação baixa) na faixa central. Contagem por linha, não
    componente conexo: o ouro corta o traje em pedaços e a conectividade
    mediria só o pedaço de cima (a perna sumia e o corpo encolhia 40%).

Cada quadro é então escalado para o corpo ficar com a mesma altura, e é
centrado no CORPO — o efeito cresce para os lados sem tirar o operador do eixo.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

from bio_arte import BASELINE, CELL, ROOT

MIN_FIGURE_W = 150   # faixa menor que isso é respingo de efeito, não figura


def figure_bands(mask, gap=6, min_width=MIN_FIGURE_W):
    """Faixas de figura no eixo x (o gerador separa as figuras por vazio)."""
    colunas = np.where(mask.any(axis=0))[0]
    if not len(colunas):
        return []
    bandas, start, last = [], colunas[0], colunas[0]
    for x in colunas[1:]:
        if x - last > gap:
            bandas.append([int(start), int(last) + 1])
            start = x
        last = x
    bandas.append([int(start), int(last) + 1])
    return [tuple(b) for b in bandas if b[1] - b[0] >= min_width]


def split_spaced(bands, expected, mask):
    """Junta faixas até sobrar `expected`, sempre pelo MAIOR vão vazio."""
    bands = [list(b) for b in bands]
    while len(bands) > expected:
        vaos = [bands[i + 1][0] - bands[i][1] for i in range(len(bands) - 1)]
        index = int(np.argmax(vaos))
        bands[index] = [bands[index][0], bands[index + 1][1]]
        del bands[index + 1]
    if len(bands) != expected:
        raise SystemExit(f'só {len(bands)} faixas para {expected} quadros')
    return [tuple(b) for b in bands]


def hair_top_cx(frame):
    """Topo do cabelo e centro x do corpo.

    O cabelo é (neste traje) o único blob quase preto grande no alto da
    figura. Lâmina e coroa são ouro; contorno de efeito é fino. O centro x sai
    da faixa do cabelo — por isso ele não muda quando a arma vai para o lado.
    """
    h, w = frame.shape[:2]
    rgb = frame[:, :, :3].astype(np.int16)
    m = (frame[:, :, 3] > 160) & (rgb.max(axis=2) < 70) & (rgb.max(axis=2) > 0)
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if not n:
        raise SystemExit('não achei cabelo escuro — a figura veio sem o cabelo?')
    objs = ndimage.find_objects(lab)
    melhor = None
    for i, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        alt, larg = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if alt < 40 or larg < 55:
            continue
        if melhor is None or sl[0].start < melhor[0]:
            melhor = (sl[0].start, sl[1].start, sl[1].stop, i, sl[0].stop)
    if melhor is None:
        raise SystemExit('nenhum blob de cabelo com tamanho de cabelo')
    top, x0, x1, i, bottom = melhor
    faixa = (lab[top:top + max(20, int((bottom - top) * .30)), x0:x1] == i)
    xs = np.where(faixa.any(axis=0))[0]
    cx = int((xs.min() + xs.max()) / 2) + x0
    return top, cx


def feet_row(frame, cx, half=110, need=28):
    """Última linha com bastante traje escuro na faixa do corpo.

    Contagem por linha (não conectividade) para o ouro que corta a perna não
    esconder a bota. `need` = ~28 px de traje na linha: perna, bota e quadril
    passam; respingo de contorno e sombra de efeito não.
    """
    h, w = frame.shape[:2]
    rgb = frame[:, :, :3].astype(np.int16)
    a = frame[:, :, 3] > 150
    mx = rgb.max(axis=2)
    cinza = a & (mx < 135) & (mx - rgb.min(axis=2) < 70)
    faixa = cinza[:, max(0, cx - half):cx + half]
    linhas = np.where(faixa.sum(axis=1) >= need)[0]
    if not len(linhas):
        raise SystemExit('sem pernas escuras na faixa do corpo')
    return int(linhas.max())


def measure(frame):
    """(topo, sola, centro x, altura do corpo) — a medida que escala o quadro."""
    top, cx = hair_top_cx(frame)
    sola = feet_row(frame, cx)
    return {'topo': top, 'sola': sola, 'cx': cx, 'altura': sola - top}


def crop_figure(frame):
    """Recorta do topo do efeito (acima da cabeça) até a sola da bota.

    Nada abaixo da sola entra: o `baseline` da folha é a própria sola, e
    efeito no chão (onda, coroa partida) seria cortado de qualquer jeito.
    """
    meta = measure(frame)
    acima = frame[:meta['topo']]
    ys = np.where(acima[:, :, 3] > 8)[0]
    topo_efeito = int(ys.min()) if len(ys) else meta['topo']
    faixa = frame[topo_efeito:meta['sola'] + 1]
    xs = np.where(faixa[:, :, 3] > 8)[0]
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    meta = {**meta, 'topo': meta['topo'] - topo_efeito,
            'sola': meta['sola'] - topo_efeito, 'cx': meta['cx'] - x0}
    return faixa[:, x0:x1], meta


def compose_body(pieces, out_name, body_height, cell=CELL, baseline=BASELINE, out_dir=None):
    """Grava a folha com UMA escala para os quatro quadros.

    Por que não escalar cada quadro pelo próprio corpo: as poses do Domínio
    mudam de verdade (agachado no preparo, ereto na recuperação). Normalizar
    cada uma faria o agachamento parecer um gigante — o oposto do que o
    desenho quer dizer. O que precisa ser constante é o TAMANHO do operador,
    e isso é uma propriedade da FOLHA, não do quadro.

    A escala é a mediana de `body_height / altura medida` nos quatro quadros:
    uma medida ruim (a perna dourada do TITÂNIO some do traje escuro) não
    puxa a folha inteira. Se algum quadro não couber na célula, aí sim ele é
    reduzido — com aviso no console.
    """
    pasta = out_dir or (ROOT / 'assets/sprites/player')
    tentativas = [body_height / float(meta['altura']) for _, meta in pieces]
    escala_base = float(np.median(tentativas))
    folha = Image.new('RGBA', (cell * len(pieces), cell), (0, 0, 0, 0))
    escalas = []
    for col, (frame, meta) in enumerate(pieces):
        escala = escala_base
        h, w = frame.shape[:2]
        meio = cell // 2 - 6
        limite = min(
            (baseline - 4) / float(h),
            meio / float(max(1, meta['cx'])),
            meio / float(max(1, w - meta['cx'])),
        )
        if limite < escala:
            print(f'   aviso: quadro {col} reduzido a {limite / escala:.0%} '
                  f'do tamanho para caber na célula')
            escala = limite
        escalas.append(escala)
        nw, nh = max(1, round(w * escala)), max(1, round(h * escala))
        art = Image.fromarray(frame).resize((nw, nh), Image.LANCZOS)
        px = col * cell + cell // 2 - round(meta['cx'] * escala)
        py = baseline - round((meta['sola'] + 1) * escala)
        folha.alpha_composite(art, (px, py))
    alvo = pasta / f'{out_name}.png'
    folha.save(alvo, optimize=True)
    print(f'{alvo.relative_to(ROOT)} → {folha.width}×{folha.height}, '
          f'escala base {escala_base:.3f}, corpos medidos '
          f'{[meta["altura"] for _, meta in pieces]}')
    return alvo
    alvo = pasta / f'{out_name}.png'
    folha.save(alvo, optimize=True)
    print(f'{alvo.relative_to(ROOT)} → {folha.width}×{folha.height}, '
          f'escalas {[round(e, 3) for e in escalas]}, corpo {body_height} px')
    return alvo
