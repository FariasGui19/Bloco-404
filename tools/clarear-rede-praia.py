#!/usr/bin/env python3
"""Clareia a rede de treino para o tom branco-azulado da referência.

O pôster desenha o hammock/rede da praia em branco-azulado claro, pendurado
entre dois mourões de madeira e com uma corda solta na areia. O sprite do
jogo (`beach-training-net.png`) é a mesma peça, mas com a malha bege-escura.

Aqui a malha é clareada mantendo as sombras e o brilho, para bater com a arte
sem redesenhar a peça.

Saída: assets/sprites/enseada-lote2/rede-praia-branca.png
Uso: .venv/bin/python tools/clarear-rede-praia.py
"""
import numpy as np
from PIL import Image

RAIZ = '/home/user/Bloco-404'
ORIGEM = f'{RAIZ}/assets/sprites/enseada-4/beach-training-net.png'
SAIDA = f'{RAIZ}/assets/sprites/enseada-lote2/rede-praia-branca.png'


def main():
    im = Image.open(ORIGEM).convert('RGBA')
    a = np.asarray(im).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Só a MALHA (cordas claras entre os mourões) muda de cor: é o que a
    # referência pinta de branco-azulado. Mourões, base e bandeirola ficam.
    # Separação por CLARIDADE: a malha é bege-clara (luminância 120–225) e a
    # madeira é bem mais escura (abaixo de 110), mesmo nos realces. O realce
    # da corda (quase branco) também entra, senão sobram traços beges.
    lumin0 = 0.299 * r + 0.587 * g + 0.114 * b
    malha = (lumin0 > 112) & (r > 120) & (r - b < 96)
    # Alvo: branco com um leve azul, mantendo o contraste da trama.
    k = np.clip((lumin0 - 150) / 90, 0, 1)
    alvo_r = 214 + 34 * k
    alvo_g = 230 + 20 * k
    alvo_b = 240 + 15 * k
    # 0.82 de mistura preserva um resto de sombra nas cordas mais escuras.
    m = malha * 0.94
    a[..., 0] = np.where(malha, r * (1 - m) + alvo_r * m, r)
    a[..., 1] = np.where(malha, g * (1 - m) + alvo_g * m, g)
    a[..., 2] = np.where(malha, b * (1 - m) + alvo_b * m, b)

    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    out.save(SAIDA)

    bg = Image.new('RGBA', out.size, (60, 150, 160, 255))
    bg.alpha_composite(out)
    bg.convert('RGB').resize((520, int(520 * out.height / out.width)), Image.LANCZOS).save('/tmp/rede_branca.png')
    print('ok', out.size)


if __name__ == '__main__':
    main()
