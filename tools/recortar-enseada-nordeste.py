#!/usr/bin/env python3
"""Recorta as artes novas do Setor 2 (nordeste) da Enseada dos Ecos.

Mesmo pipeline do acampamento (`tools/recortar-enseada-camp.py`), com a chave
compartilhada em `tools/recorte-magenta.py`: cada prop foi gerado sobre fundo
magenta chapado, então o alpha sai exato e não fica halo.

A escala de cada peça sai da `referencia-mestre.png` em px de arte, lembrando
que **1 px de arte = 2 px de jogo**. Como `getFrame` recorta o quadro no bbox do
conteúdo e o renderer deriva a altura de `larguraPx * crop.h / crop.w`, a
`larguraPx` de cada objeto é a largura que o recorte realmente ficou.

Saída em `assets/sprites/enseada-nordeste/`.

Uso: python3 tools/recortar-enseada-nordeste.py
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

FONTE = RAIZ / 'assets/source-art/nordeste-2'
DESTINO = RAIZ / 'assets/sprites/enseada-nordeste'

# Altura alvo em px de ARTE (dobra no arquivo). Vem da referencia-mestre:
# o paredao tem ~52 px de arte de altura sob a estacao, o planalto inteiro
# ocupa ~120 px de largura na franja nordeste, etc.
ALTURA_ARTE = {
    'parede-falesia':            40,   # face frontal do planalto
    'plato-topo-grama':          96,   # laje de grama do alto
    'matacao-grande':            26,
    'trilha-areia-curva':        14,
    'poco-cachoeira':            40,
    'mata-transicao-densa':      62,
    'arbusto-florido':           30,
    'palmeira-nordeste':         86,
    'caixa-vegetacao-falésia':   22,
    'penhasco-canto-leste':      78,
}

# Peças que devem manter só o maior componente: mata e arbusto às vezes vêm
# com um tufo solto que ficaria flutuando no mapa.
SO_MAIOR_COMPONENTE = {'mata-transicao-densa', 'arbusto-florido', 'plato-topo-grama'}

# Recorte manual, quando a geração devolveu mais de uma variante.
RECORTES: dict[str, tuple[int, int, int, int]] = {}


def recortar(nome: str) -> dict:
    rgb = np.asarray(Image.open(FONTE / f'{nome}.png').convert('RGB'))
    if nome in RECORTES:
        x0, y0, x1, y1 = RECORTES[nome]
        rgb = rgb[y0:y1, x0:x1]

    alfa = ((1 - chave_magenta(rgb)) * 255).astype(np.uint8)
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
        'arquivo': f'assets/sprites/enseada-nordeste/{nome}.png',
        'arte': [x0, y0, x1, y1],
    }


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    medidas = {'fonte': 'assets/source-art/nordeste-2 (geração dedicada, fundo magenta)', 'props': {}}
    for nome in ALTURA_ARTE:
        m = recortar(nome)
        medidas['props'][nome] = m
        print(f"{nome:26s} {m['larguraPx']:4d}x{m['alturaPx']:4d} px")
    (DESTINO / 'medidas-nordeste.json').write_text(
        json.dumps(medidas, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"\n{len(medidas['props'])} sprites em {DESTINO}/")


if __name__ == '__main__':
    main()
