#!/usr/bin/env python3
"""Recorta as artes do Setor 4 (praia sul e portais submarinos).

Mesmo pipeline dos setores anteriores (`tools/recortar-enseada-nordeste.py`),
com a chave compartilhada em `tools/recorte_magenta.py`: cada prop foi gerado
sobre fundo magenta chapado, então o alpha sai exato e não fica halo.

Regra de ouro do setor: o **cais e o veleiro já aprovados não são redesenhados**
(`enseada8_cais_barco_ref` / `enseada_barco_expedicao` continuam como estão).
Este script só produz as peças novas da praia sul e do portal submarino.

A escala de cada peça sai da `referencia-mestre.png` em px de arte, lembrando
que **1 px de arte = 2 px de jogo**. Como `getFrame` recorta o quadro no bbox do
conteúdo e o renderer deriva a altura de `larguraPx * crop.h / crop.w`, a
`larguraPx` de cada objeto é a largura que o recorte realmente ficou.

Saída em `assets/sprites/enseada-setor4/`.

Uso: python3 tools/recortar-enseada-setor4.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / 'tools'))

from recorte_magenta import chave_magenta, despill  # noqa: E402

FONTE = RAIZ / 'assets/source-art/setor4'
DESTINO = RAIZ / 'assets/sprites/enseada-setor4'

# Altura alvo em px de ARTE (dobra no arquivo). Na referência o arco do portal
# submarino ocupa ~110 px de arte do topo do coral ao colo da água, e o
# aglomerado de rochas da orla sul ~40 px acima da areia.
ALTURA_ARTE = {
    'portal-submarino-coral': 110,
    'orla-rochas-poste':       40,
    # Setor 3 (centro-sul / oeste)
    'capivara':                34,   # ~0,7x o personagem
    'fonte-cristal':           52,
    'piscina-termal':         118,
}

# Peças que devem manter só o maior componente: coral e rocha às vezes vêm com
# um tufo solto que ficaria flutuando no mapa.
SO_MAIOR_COMPONENTE = {'orla-rochas-poste', 'capivara'}

# Recorte manual, quando a geração devolveu mais de uma variante.
#   orla-rochas-poste: a imagem veio como uma PLATAFORMA de areia isométrica
#   inteira; o que interessa no mapa é o aglomerado de rochas com o poste de
#   lampião, então cortamos só ele (sem a laje de areia e sem a beira d'água,
#   que o mapa já desenha com `drawFloors`/`aguaPraia`).
RECORTES: dict[str, tuple[int, int, int, int]] = {
    'orla-rochas-poste': (520, 55, 980, 375),
}

# Nome do arquivo de origem quando difere do nome do prop.
ARQUIVOS = {
    'orla-rochas-poste': 'praia-sul-orla',
}

# As duas fontes ficam em pastas diferentes (setor4 e setor3).
PASTAS = {
    'capivara': 'setor3',
    'fonte-cristal': 'setor3',
    'piscina-termal': 'setor3',
}


def recortar(nome: str) -> dict:
    pasta = RAIZ / 'assets/source-art' / PASTAS.get(nome, 'setor4')
    arquivo = pasta / f"{ARQUIVOS.get(nome, nome)}.png"
    rgb = np.asarray(Image.open(arquivo).convert('RGB'))
    if nome in RECORTES:
        x0, y0, x1, y1 = RECORTES[nome]
        rgb = rgb[y0:y1, x0:x1]

    alfa = ((1 - chave_magenta(rgb)) * 255).astype(np.uint8)

    # A chave acima só come magenta LIGADO À BORDA (para não comer detalhe
    # arroxeado dentro do objeto). No portal submarino o coral é rosa-magenta,
    # então a geração deixou respingos de fundo ILHADOS no meio da peça.
    # Aqui matamos magenta quase puro em qualquer lugar — respingo de fundo é
    # saturado; coral tem G muito mais alto.
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    puro = (r > 205) & (b > 205) & (g < 95)
    alfa = np.where(puro, 0, alfa).astype(np.uint8)

    # Respingo de fundo que sobrou meio-quinado (vermelho-escuro) também é
    # ilha solta, mas com área pequena. Diferente do maior componente, que
    # descartaria o coral legítimo, aqui só removemos as ilhas MINÚSCULAS:
    # tudo que não alcança 0,4% da área do maior componente.
    n, rot, st, _ = cv2.connectedComponentsWithStats((alfa > 0).astype(np.uint8), 8)
    if n > 1:
        areas = st[1:, cv2.CC_STAT_AREA]
        maior = int(areas.max())
        limite = max(12, int(maior * 0.004))
        manter = {1 + i for i, a in enumerate(areas) if a >= limite}
        alfa = np.where(np.isin(rot, list(manter)), alfa, 0).astype(np.uint8)
    if nome in SO_MAIOR_COMPONENTE:
        n, rot, st, _ = cv2.connectedComponentsWithStats((alfa > 0).astype(np.uint8), 8)
        if n > 1:
            maior = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            alfa = np.where(rot == maior, alfa, 0).astype(np.uint8)
    limpo = despill(rgb, alfa)

    ys, xs = np.nonzero(alfa)
    if not len(ys):
        raise SystemExit(f'{nome}: nada sobrou depois do chroma key')
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    limpo, alfa = limpo[y0:y1, x0:x1], alfa[y0:y1, x0:x1]

    alvo_h = ALTURA_ARTE[nome] * 2                  # 1 px arte = 2 px jogo
    escala = alvo_h / alfa.shape[0]
    out_w = max(1, round(alfa.shape[1] * escala))
    out_h = max(1, round(alfa.shape[0] * escala))

    arte = cv2.resize(np.dstack([limpo, alfa]), (out_w, out_h), interpolation=cv2.INTER_AREA)
    a = arte[..., 3]
    arte[..., 3] = np.where(a > 110, 255, 0).astype(np.uint8)
    Image.fromarray(arte).save(DESTINO / f'{nome}.png')

    return {
        'larguraPx': out_w,
        'alturaPx': out_h,
        'arquivo': f'assets/sprites/enseada-setor4/{nome}.png',
        'arte': [x0, y0, x1, y1],
    }


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    medidas = {
        'fonte': 'assets/source-art/setor4 (geração dedicada, fundo magenta)',
        'nota': 'cais e veleiro aprovados NÃO são redesenhados neste setor',
        'props': {},
    }
    for nome in ALTURA_ARTE:
        m = recortar(nome)
        medidas['props'][nome] = m
        print(f"{nome:26s} {m['larguraPx']:4d}x{m['alturaPx']:4d} px")
    (DESTINO / 'medidas-setor4.json').write_text(
        json.dumps(medidas, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"\n{len(medidas['props'])} sprites em {DESTINO}/")


if __name__ == '__main__':
    main()
