#!/usr/bin/env python3
"""Prepara as folhas de execução do MARÉ ASTRAL.

Mesmo padrão do Bio-Forja: uma folha de 4 quadros (1280×320) por assinatura
de Ultimate. A corrente instalada define a arte do F:

    mare-ult-cupula.png     → player-mare-ult-cupula.png     CÚPULA DE PRESSÃO
    mare-ult-vortice.png    → player-mare-ult-vortice.png    CORRENTE ABISSAL
    mare-ult-chicote.png    → player-mare-ult-chicote.png    ONDA CORTANTE
    mare-ult-sonar.png      → player-mare-ult-sonar.png      CHAMADO DA MARÉ
    mare-ult-estuario.png   → player-mare-ult-estuario.png   SINFONIA DO ESTUÁRIO

E uma folha de ação: o PASSO DE CORRENTE (Q) visto de costas, que antes
reaproveitava a pose parada.

Uso: python3 tools/preparar-mare-ultimate.py
"""
from bio_arte import SOURCE_MARE, compose, disc_mask, load_frames

# O corpo do Maré em jogo já está medido: a caminhada 0318 desenha 383 px de
# célula em escala .37 → 142 px. As folhas de Ultimate usam células de 320 px
# com o apoio em 276; sem fixar a altura o personagem mudava de tamanho no F.
# 142 px desejados em jogo ÷ escala .57 = 249 px de arte dentro da célula.
CORPO = 249
ULTIMATES = [
    {'file': 'mare-ult-cupula.png', 'prefix': 'player-mare-ult-cupula'},
    # O quadro de impacto do vórtice vem com o túnel preenchendo a célula:
    # `disc` dissolve a borda para não virar um retângulo de água em jogo.
    {'file': 'mare-ult-vortice.png', 'prefix': 'player-mare-ult-vortice', 'mask': [2]},
    {'file': 'mare-ult-chicote.png', 'prefix': 'player-mare-ult-chicote'},
    {'file': 'mare-ult-sonar.png', 'prefix': 'player-mare-ult-sonar'},
    {'file': 'mare-ult-estuario.png', 'prefix': 'player-mare-ult-estuario'},
]

ACOES = [
    # PASS O DE CORRENTE (Q) de costas: anel → onda → correnteza → pouso.
    {'file': 'mare-propulsor-costas.png', 'prefix': 'player-mare-propulsor-costas'},
]


def main():
    for cfg in ULTIMATES + ACOES:
        frames = load_frames(cfg['file'], 4, source=SOURCE_MARE)
        for index in cfg.get('mask', []):
            frames[index] = disc_mask(frames[index])
        compose(frames, cfg['prefix'], body_height=CORPO)


if __name__ == '__main__':
    main()
