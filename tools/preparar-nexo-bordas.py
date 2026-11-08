"""Atenua contaminação branca na borda alfa sem modificar o original RGBA."""
from PIL import Image
import numpy as np
from scipy.ndimage import binary_dilation
arr = np.array(Image.open('assets/source-art/novos-sprites/nexo.png').convert('RGBA'))
rgb = arr[:,:,:3].astype(np.int16); alpha = arr[:,:,3]
# Somente branco/cinza semitransparente junto ao contorno externo.
edge = binary_dilation(alpha < 10, iterations=2) & (alpha > 0) & (alpha < 245)
halo = edge & (rgb.min(axis=2) > 155) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 45)
alpha[halo] = (alpha[halo].astype(np.float32) * .25).astype(np.uint8)
Image.fromarray(arr).save('assets/sprites/saguao/nexo-lateral-limpo.png')
