"""Extrai duas peças isométricas com fundo magenta. Requer Pillow e NumPy."""
from pathlib import Path
import numpy as np
from PIL import Image

source = Path('assets/source-art/estacao-bio')
out = Path('assets/sprites/estacao-bio')
out.mkdir(parents=True, exist_ok=True)
for name in ('terminal', 'biorreator'):
    image = np.array(Image.open(source / f'{name}.png').convert('RGB')).astype(np.float32)
    # O fundo é magenta; nenhum material das peças deve usar essa cor.
    excess = np.minimum(image[:,:,0], image[:,:,2]) - image[:,:,1]
    alpha = np.clip((65 - excess) / 35, 0, 1)
    # Retira o reflexo magenta dos pixels parcialmente transparentes.
    fringe = (excess > 12) & (alpha > 0) & (alpha < 1)
    image[fringe,0] = np.minimum(image[fringe,0], image[fringe,1] + 12)
    image[fringe,2] = np.minimum(image[fringe,2], image[fringe,1] + 12)
    rgba = np.dstack((image.clip(0,255).astype(np.uint8), (alpha*255).astype(np.uint8)))
    sprite = Image.fromarray(rgba, 'RGBA')
    sprite = sprite.crop(sprite.getbbox())
    sprite.thumbnail((800,800), Image.Resampling.LANCZOS)
    sprite.save(out / f'{name}.png', optimize=True)
