#!/usr/bin/env python3
"""Prepara os sprites da revisão: fundo branco e areia embutida transparentes.

Requer Pillow, NumPy e SciPy. Os originais são preservados; os dois sprites
novos gerados devem existir no caminho indicado antes de executar o script.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
out = root / 'assets/sprites/enseada-lote2'

def fundo_branco(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).copy()
    branco = (a[:, :, :3].min(axis=2) > 239)
    labels, _ = ndimage.label(branco)
    fundo = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    fundo = fundo[fundo != 0]
    a[np.isin(labels, fundo), 3] = 0
    im = Image.fromarray(a)
    im = im.crop(im.getbbox())
    # Nearest-neighbor preserva a grade de pixels, sem suavização por reamostragem.
    if im.width > 900:
        im = im.resize((900, round(im.height * 900 / im.width)), Image.Resampling.NEAREST)
    im.save(path)

def remover_areia(src, dest, remover_parede=False):
    a = np.asarray(Image.open(root / src).convert('RGBA')).copy()
    rgb = a[:, :, :3].astype('int16')
    r, g, b = rgb.transpose(2, 0, 1)
    amarelo = (r > 175) & (g > 125) & (r-g < 65) & (g-b > 40) & (r-b > 75) & (a[:, :, 3] > 0)
    labels, n = ndimage.label(amarelo)
    if n == 0:
        raise ValueError(f'Areia não encontrada em {src}')
    counts = np.bincount(labels.ravel()); counts[0] = 0
    areia = labels == counts.argmax()
    a[areia, 3] = 0
    if remover_parede:
        # A face antiga não deve aparecer atrás da nova parede integrada.
        rocha = (r > 50) & (r > g * 1.12) & (g > b * 1.1)
        a[rocha, 3] = 0
    if dest == 'piscina-sem-areia.png':
        # Restavam riscos soltos do contorno externo da antiga faixa de areia.
        # Mantém o corpo conectado da bacia e as plantas/rochas da cascata.
        componentes, _ = ndimage.label(a[:, :, 3] > 0, structure=np.ones((3, 3)))
        tamanhos = np.bincount(componentes.ravel()); tamanhos[0] = 0
        principal = tamanhos.argmax()
        manter = np.zeros_like(tamanhos, dtype=bool); manter[principal] = True
        for i, fatia in enumerate(ndimage.find_objects(componentes), 1):
            if fatia and fatia[1].start >= 480 and fatia[1].stop <= 800 and fatia[0].stop <= 190:
                manter[i] = True
        a[~manter[componentes], 3] = 0
    Image.fromarray(a).save(out / dest)

for nome in ('gruta-concha-nitida.png', 'parede-camp-integrada.png'):
    fundo_branco(out / nome)
remover_areia('assets/sprites/enseada-3/rock-pool-oasis.png', 'piscina-sem-areia.png')
remover_areia('assets/sprites/enseada-norte/plato-sem-escada.png', 'plato-sem-areia.png', remover_parede=True)
