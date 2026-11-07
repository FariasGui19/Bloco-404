"""Recorta o fundo preto conectado às bordas da folha frontal fornecida.
Requer Pillow, NumPy e SciPy. A arte original é preservada em source-art.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation

root = Path(__file__).resolve().parent.parent
src = root / 'assets/source-art/attacks/bio-forja-frontal.webp'
out = root / 'assets/sprites/player/player-bio-ataque-frontal.png'
rgb = np.asarray(Image.open(src).convert('RGB'))
# Só remove preto quase puro conectado à borda, preservando sombras internas.
background = rgb.max(axis=2) <= 9
seed = np.zeros(background.shape, dtype=bool)
seed[0, :] = seed[-1, :] = True
seed[:, 0] = seed[:, -1] = True
removed = binary_propagation(seed & background, mask=background)
rgba = np.dstack((rgb, np.where(removed, 0, 255).astype('uint8')))
Image.fromarray(rgba).save(out, optimize=True)
