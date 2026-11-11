#!/usr/bin/env python3
"""Prepara as folhas de execução da ULTIMATE do DOMÍNIO ANCIÃO.

Mesmo padrão do Bio-Forja (0.6.5) e do Maré (0.7.0): uma folha de 4 quadros
(1280×320) por assinatura. A ferramenta instalada define a arte do F:

    dominio-ult-coroa.png    → player-dominio-ult-coroa.png     COROA DA FALHA (base)
    dominio-ult-lamina.png   → player-dominio-ult-lamina.png    CORTE DE RUPTURA   (espada_de_dominio)
    dominio-ult-muralha.png  → player-dominio-ult-muralha.png   MURALHA DE FREQUÊNCIA (escudo_de_dominio)
    dominio-ult-tita.png     → player-dominio-ult-tita.png      CORPO DE TITÂNIO   (postura_de_dominio)
    dominio-ult-trono.png    → player-dominio-ult-trono.png     IMPACTO DO TRONO ANTIGO (investida_de_dominio)

Por que este preparador não usa `bio_arte.load_frames`:

  * o efeito do Domínio é ouro sólido e grande — na MURALHA ele cobre o tronco
    e a caixa do desenho mediria metade do corpo do operador. `body_box`
    mede o traje escuro, então o corpo não encolhe quando o golpe cresce;
  * cada quadro é escalado pelo próprio corpo (`compose_body`), não pelo
    quadro mais limpo: a pose muda muito (agachado, correndo, ombro de ouro);
  * o gerador entregou 5 figuras no TITÂNIO e uma faixa-suspiro no CORTE —
    `pick` escolhe as faixas reais em vez de inventar quadro.

Uso: python3 tools/preparar-dominio-ultimate.py
Requer Pillow, numpy e scipy.
"""
import numpy as np
from PIL import Image

from bio_arte import ROOT, disc_mask, remove_magenta
from dominio_arte import compose_body, crop_figure, figure_bands, split_spaced

SOURCE = ROOT / 'assets/source-art/dominio'

# O corpo do Domínio em jogo é o da caminhada lateral (0.3.17): figura de
# ~680 px em célula de 440 px com escala .245 → 141 px. A Ultimate usa célula
# de 320 com .57, então o corpo tem de medir 141 / .57 = 247 px de arte.
CORPO = 247

# `pick` = quais faixas são quadros de verdade quando vem figura a mais.
# `mask` = quadros cujo efeito precisa de borda suave (painel → disco).
SHEETS = [
    {'file': 'dominio-ult-coroa.png', 'prefix': 'player-dominio-ult-coroa'},
    {'file': 'dominio-ult-lamina.png', 'prefix': 'player-dominio-ult-lamina'},
    # A parede hex fechada quase preenche a célula: disco suave na borda para
    # não virar um retângulo de ouro em jogo.
    {'file': 'dominio-ult-muralha.png', 'prefix': 'player-dominio-ult-muralha', 'mask': [2]},
    # O TITÂNIO veio com 5 figuras: 4 poses reais + uma repetição no fim.
    {'file': 'dominio-ult-tita.png', 'prefix': 'player-dominio-ult-tita', 'pick': [0, 2, 3, 5]},
    {'file': 'dominio-ult-trono.png', 'prefix': 'player-dominio-ult-trono'},
]


def preparar(cfg):
    rgba = remove_magenta(np.asarray(Image.open(SOURCE / cfg['file']).convert('RGB')))
    mask = rgba[:, :, 3] > 8
    bandas = figure_bands(mask)
    if cfg.get('pick'):
        bandas = [bandas[i] for i in cfg['pick'] if i < len(bandas)]
        if len(bandas) != 4:
            raise SystemExit(f"{cfg['file']}: pick devolveu {len(bandas)} faixas")
    else:
        bandas = split_spaced(bandas, 4, mask)

    pecas = [crop_figure(rgba[:, x0:x1]) for x0, x1 in bandas]
    for index in cfg.get('mask', []):
        frame, meta = pecas[index]
        pecas[index] = (disc_mask(frame), meta)
    compose_body(pecas, cfg['prefix'], body_height=CORPO)


def main():
    for cfg in SHEETS:
        print(cfg['file'])
        preparar(cfg)


if __name__ == '__main__':
    main()
