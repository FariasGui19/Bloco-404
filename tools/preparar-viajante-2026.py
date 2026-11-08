"""Remove quadriculado incorporado da nova viajante. Dependências: Pillow, NumPy, SciPy."""
from PIL import Image
import numpy as np
from scipy.ndimage import binary_propagation
src = np.array(Image.open('assets/source-art/novos-sprites/viajante.webp').convert('RGB'))
a = src.astype(np.int16)
# Apenas cinzas claros conectados ao exterior: preserva roupa escura e malas.
neutral = (a.max(axis=2) - a.min(axis=2) < 20) & (a.min(axis=2) > 145)
seed = np.zeros(neutral.shape, bool)
seed[0,:] = neutral[0,:]; seed[-1,:] = neutral[-1,:]; seed[:,0] |= neutral[:,0]; seed[:,-1] |= neutral[:,-1]
background = binary_propagation(seed, mask=neutral)
rgba = np.dstack((src, np.where(background, 0, 255).astype(np.uint8)))
Image.fromarray(rgba).save('assets/sprites/saguao/viajante-2026.png')

# Atenua somente o halo claro externo; não remove olhos/brilhos internos.
from scipy.ndimage import binary_dilation
edge = binary_dilation(background, iterations=2) & ~background
spread = a.max(axis=2) - a.min(axis=2)
halo = edge & (a.min(axis=2) > 145) & (spread < 45)
strength = np.clip((240 - a.min(axis=2)) / 95, 0, 1)
rgba[halo, 3] = (strength[halo] * 255).astype(np.uint8)
Image.fromarray(rgba).save('assets/sprites/saguao/viajante-2026.png')
