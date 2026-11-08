"""Prepara as peças estáticas das rodadas de integração da Estação Bio.

Não são folhas de animação: cada PNG é uma única peça de cenário gerada sobre
fundo magenta, recortada com alpha real. Execute na raiz do repositório.
Requer Pillow e NumPy.

0.3.5: cabeceira e distribuidor. 0.3.6: margem baixa de canal e fundação baixa.
"""
from pathlib import Path

import numpy as np
from PIL import Image

src = Path('assets/source-art/estacao-bio')
out = Path('assets/sprites/estacao-bio')
out.mkdir(parents=True, exist_ok=True)


def limpar(nome_origem, nome_destino, limite=640):
    imagem = np.array(Image.open(src / nome_origem).convert('RGB'), dtype=np.float32)
    # Fundo magenta: excesso de vermelho/azul sobre o verde vira transparência.
    excesso = np.minimum(imagem[:, :, 0], imagem[:, :, 2]) - imagem[:, :, 1]
    alpha = np.clip((65 - excesso) / 35, 0, 1)
    franja = (excesso > 12) & (alpha > 0) & (alpha < 1)
    imagem[franja, 0] = np.minimum(imagem[franja, 0], imagem[franja, 1] + 12)
    imagem[franja, 2] = np.minimum(imagem[franja, 2], imagem[franja, 1] + 12)
    rgba = Image.fromarray(
        np.dstack((imagem.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8))),
        'RGBA',
    )
    caixa = rgba.getbbox()
    if not caixa:
        raise ValueError(f'peça vazia: {nome_origem}')
    rgba = rgba.crop(caixa)
    rgba.thumbnail((limite, limite), Image.Resampling.LANCZOS)
    rgba.save(out / nome_destino, optimize=True)
    print(f'{nome_destino}: {rgba.size[0]}x{rgba.size[1]}')


limpar('cabeceira-ponte.png', 'bio-cabeceira.png')
limpar('distribuidor-pressao.png', 'bio-distribuidor.png')
limpar('margem-canal-baixa.png', 'bio-margem-baixa.png', limite=512)
limpar('fundacao-maquina.png', 'bio-fundacao.png', limite=512)
