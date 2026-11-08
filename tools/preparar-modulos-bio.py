"""Prepara as duas folhas estáticas Bio (Pillow e NumPy). Executar na raiz."""
from pathlib import Path
import numpy as np
from PIL import Image

src = Path('assets/source-art/estacao-bio')
out = Path('assets/sprites/estacao-bio')
out.mkdir(parents=True, exist_ok=True)

def clean(image):
    rgb = np.asarray(image.convert('RGB'), dtype=np.float32).copy()
    excess = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    alpha = np.clip((65 - excess) / 35, 0, 1)
    fringe = (excess > 12) & (alpha > 0) & (alpha < 1)
    rgb[fringe, 0] = np.minimum(rgb[fringe, 0], rgb[fringe, 1] + 12)
    rgb[fringe, 2] = np.minimum(rgb[fringe, 2], rgb[fringe, 1] + 12)
    return Image.fromarray(np.dstack((rgb.astype(np.uint8), (alpha * 255).astype(np.uint8))))

def cells(name):
    image = Image.open(src / name)
    w, h = image.size
    for row in range(2):
        for col in range(2):
            cell = clean(image.crop((col*w//2, row*h//2, (col+1)*w//2, (row+1)*h//2)))
            box = cell.getbbox()
            if not box: raise ValueError(f'Quadro vazio: {name} {col}, {row}')
            yield cell.crop(box)

# O gerador entregou losangos quadrados. Uniformizar as células, deixando
# a projeção 2:1 ao renderer; cada losango é encaixado no tile do motor.
sheet = Image.new('RGBA', (512, 512))
for i, tile in enumerate(cells('piso-industrial-folha.png')):
    tile = tile.resize((256, 256), Image.Resampling.LANCZOS)
    sheet.paste(tile, ((i % 2)*256, (i // 2)*256))
sheet.save(out / 'piso-industrial-folha.png', optimize=True)

# Arquivos separados preservam partes desconectadas como a bobina da caixa.
for name, cell in zip(('floreira', 'tubos', 'caixa-bobina', 'luminaria'), cells('detalhes-industriais-folha.png')):
    cell.thumbnail((384, 384), Image.Resampling.LANCZOS)
    cell.save(out / f'detalhe-{name}.png', optimize=True)
