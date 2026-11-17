#!/usr/bin/env python3
"""Remove fundo claro dos dois sprites gerados para a Enseada.

Execute com imagens originais RGB fornecidas como argumentos; salva RGBA em
arquivos de saída. O limiar preserva os contornos escuros da rede de cordas.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def preparar(src, dest, rede=False):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(float)
    if rede:
        # As aberturas da trama são brancas também; não preenchê-las.
        brilho = a.min(axis=2)
        alfa = np.clip((250 - brilho) * 20, 0, 255)
    else:
        branco = a.min(axis=2) > 239
        lab, _ = ndimage.label(branco)
        bordas = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
        bordas.discard(0)
        fundo = np.isin(lab, list(bordas))
        alfa = np.where(fundo, 0, 255)
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alfa.astype('uint8')))
    out = out.crop(out.getbbox())
    out.thumbnail((1100, 700), Image.Resampling.LANCZOS)
    out.save(dest)

if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('parede', 'rede'):
        raise SystemExit('uso: preparar-sprites-enseada.py parede|rede entrada.png saida.png')
    preparar(sys.argv[2], sys.argv[3], sys.argv[1] == 'rede')
