#!/usr/bin/env python3
"""Prepara as folhas de AÇÃO do MOTOR BIO-FORJA.

O exo tinha ataque só de frente: de costas e de lado o soco não tinha arte
(o golpe acontecia, o corpo continuava andando) e o Q (PROPULSOR DE IMPULSO)
reaproveitava a pose de caminhada. Este script fecha os dois buracos:

    bio-ataque-costas.png  → player-bio-ataque-costas.png   (4 quadros)
    bio-ataque-lateral.png → player-bio-ataque-lateral.png  (4 quadros)
    bio-propulsor.png      → player-bio-propulsor.png       (4 quadros)

O ataque frontal (`player-bio-ataque-frontal.png`, 9 quadros) já existe e não
é tocado aqui. Uso: python3 tools/preparar-bio-acoes.py
"""
from bio_arte import compose, load_frames

ACOES = [
    # costas: soquinho → armado → impacto → vapor
    {'file': 'bio-ataque-costas.png', 'prefix': 'player-bio-ataque-costas'},
    # lateral: a mesma sequência, em perfil para a direita
    {'file': 'bio-ataque-lateral.png', 'prefix': 'player-bio-ataque-lateral'},
    # propulsor (Q): agachar → acender → avanço → pouso
    {'file': 'bio-propulsor.png', 'prefix': 'player-bio-propulsor'},
]


def main():
    for cfg in ACOES:
        compose(load_frames(cfg['file'], 4), cfg['prefix'])


if __name__ == '__main__':
    main()
