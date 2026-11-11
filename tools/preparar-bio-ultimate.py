#!/usr/bin/env python3
"""Prepara as folhas de execução da Ultimate do MOTOR BIO-FORJA.

O módulo Bio é o único cujo corpo é HUMANO e cujo F depende da ferramenta
instalada: a Ultimate nível 1 substitui a base do módulo. São cinco folhas,
uma por Ultimate possível:

    forja_dome  → base do módulo      PULSO DA FORJA VIVA
    serra       → lâmina_de_forja     CORTE DE RECONFIGURAÇÃO
    martelo     → punho_de_impacto    MARTELO DE FORJA
    cabos       → gancho_magnetico    REDE DE ANCORAGEM
    propulsores → asa_de_impulso      QUEBRA-LIMITE CINÉTICO

O gerador devolve RGB com fundo magenta chapado, quadros em faixas e a linha
de grade desenhada em volta de cada coluna. Este script:

  1. remove o magenta com alpha real e despill nas bordas;
  2. recorta em GRADE (o gerador distribui as poses em colunas iguais) com
     recuo nas bordas, porque a linha da grade não é arte;
  3. normaliza altura, apoio dos pés e centro do corpo em células iguais;
  4. nunca deixa um quadro sangrar na célula vizinha;
  5. grava PNGs RGBA de 256 px por célula em assets/sprites/player/.

Uso: python3 tools/preparar-bio-ultimate.py
Requer Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

from bio_arte import OUT, ROOT, compose, load_frames

# As cinco folhas de execução do F. Cada uma aponta a fonte e o nome final.
SHEETS = [
    # Base do módulo: a cúpula de raízes e engrenagens (PULSO DA FORJA VIVA).
    {'file': 'bio-ultimate.png', 'prefix': 'player-bio-ult-forja-dome'},
    # Lâmina: a serra instável que cresce e corta (CORTE DE RECONFIGURAÇÃO).
    {'file': 'bio-ult-lamina.png', 'prefix': 'player-bio-ult-serra'},
    # Punho: o braço vira marreta e abre cratera (MARTELO DE FORJA).
    {'file': 'bio-ult-punho.png', 'prefix': 'player-bio-ult-martelo'},
    # Gancho: quatro cabos e a rede de ancoragem (REDE DE ANCORAGEM).
    {'file': 'bio-ult-gancho.png', 'prefix': 'player-bio-ult-cabos'},
    # Asa: propulsores abrem e o corpo avança (QUEBRA-LIMITE CINÉTICO).
    {'file': 'bio-ult-asa.png', 'prefix': 'player-bio-ult-propulsores'},
]


def main():
    for cfg in SHEETS:
        compose(load_frames(cfg['file'], 4), cfg['prefix'])


if __name__ == '__main__':
    main()
