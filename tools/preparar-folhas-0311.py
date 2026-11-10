#!/usr/bin/env python3
"""Prepara as folhas RGBA recebidas, sem inventar fundo/transparência.
Requer Pillow: python3 tools/preparar-folhas-0311.py
Preserva grade, dimensão e cores; elimina apenas alpha residual abaixo de 12.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
for source, output in [
    ('assets/source-art/usuario-0.3.11/bio-caminhada.png', 'assets/sprites/player/bio-caminhada-0311.png'),
    ('assets/source-art/usuario-0.3.11/plataforma-kit.png', 'assets/sprites/praia/plataforma-kit-0311.png'),
]:
    image = Image.open(root / source).convert('RGBA')
    if image.size != (1536, 1024):
        raise ValueError(f'{source}: tamanho inesperado: {image.size}')
    alpha = image.getchannel('A')
    if alpha.getextrema()[0] > 0:
        raise ValueError(f'{source}: não tem alpha verdadeiro')
    image.putalpha(alpha.point(lambda a: 0 if a < 12 else a))
    image.save(root / output, optimize=True)
