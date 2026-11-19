#!/usr/bin/env python3
"""Monta GIF a partir dos 48 quadros CAPTURE_ART do teste Chromium.
1. Iniciar servidor HTTP na porta 8000.
2. CAPTURE_ART=1 [variáveis Chromium] node tests/docas-pesqueiro-03-browser.mjs
3. .venv/bin/python tools/qa/montar-previa-pesqueiro-03.py
"""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
paths=sorted((ROOT/'.qa/pesqueiro-03').glob('[0-9][0-9].png'))
assert len(paths)==48,'Capture os 48 quadros no navegador primeiro.'
frames=[]
for p in paths:
    im=Image.open(p).convert('RGB')
    im.thumbnail((800,400),Image.Resampling.LANCZOS)
    frames.append(im)
# Shared palette avoids dithering the static sea differently in every frame.
palette=frames[0].quantize(colors=128,dither=Image.Dither.NONE)
frames=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
frames[0].save(ROOT/'docs/docas-pesqueiro-03.gif',save_all=True,append_images=frames[1:],duration=133,loop=0,optimize=True)
print('docs/docas-pesqueiro-03.gif — captura da prévia setorial, mesmo renderizador do jogo.')
