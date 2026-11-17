#!/usr/bin/env python3
"""Monta o rochedo da praia sudeste a partir das pedras pixel-art existentes.

A referência mostra, sob o arco do Caminho das Correntes, um rochedo orgânico
de pedra com musgo, samambaias e bromélia, assentado em pedras dentro da água
rasa. Em vez de desenhar (a primeira tentativa saiu pior que a arte), o sprite
é composto de duas peças do próprio jogo: `rochedo-pe.png` (maciço com
vegetação) e `rochas-mar.png` (blocos na água, espelhados).

Saída: assets/sprites/enseada-lote2/rochedo-praia-sudeste.png
Uso: .venv/bin/python tools/montar-rochedo-sudeste.py
"""
from PIL import Image

RAIZ = '/home/user/Bloco-404'
SAIDA = f'{RAIZ}/assets/sprites/enseada-lote2/rochedo-praia-sudeste.png'


def esc(im, f):
    return im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS)


def main():
    macico = esc(Image.open(f'{RAIZ}/assets/sprites/praia/relevo/rochedo-pe.png').convert('RGBA'), 1.9)
    agua = esc(Image.open(f'{RAIZ}/assets/sprites/praia/relevo/rochas-mar.png').convert('RGBA'), 1.35)
    agua = agua.transpose(Image.FLIP_LEFT_RIGHT)

    W = max(macico.width, agua.width + 120)
    H = macico.height + agua.height // 2
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    c.alpha_composite(agua, (120, H - agua.height))
    c.alpha_composite(macico, (0, 0))
    c.save(SAIDA)
    print('ok:', SAIDA, c.size)


if __name__ == '__main__':
    main()
