#!/usr/bin/env python3
"""Monta o portal de coral do promontório sudeste no seu rochedo.

Na referência (`referencia-mestre.png`) o arco de coral não fica sobre uma
laje isométrica solta: ele nasce de um rochedo achatado, com corais roxos e
rosa encostados nos pés, e o conjunto desce até a água rasa.

Medidas do pôster para este promontório:
  conjunto  ~245 px de largura por ~235 px de altura
  arco      ~140 px de largura por ~150 px de altura
  rocha     ~125 px de altura abaixo do arco

Aqui o arco (`reef-portal-arch.png`) é recortado sem a laje, reduzido a 140 px
e assentado no platô do rochedo (`rochedo-pe.png`), formando um sprite único —
assim o arco não "flutua" e o bloco de pedra cinza com cristais não volta.

Saída: assets/sprites/enseada-lote2/portal-sudeste-rochedo.png
Uso: .venv/bin/python tools/montar-portal-sudeste.py
"""
from PIL import Image

RAIZ = '/home/user/Bloco-404'
LARGURA_ROCHA = 245
ALTURA_ROCHA = 132


def main():
    arco = Image.open(f'{RAIZ}/assets/sprites/enseada-3/reef-portal-arch.png').convert('RGBA')
    # Corta a laje isométrica: a partir de y≈468 o sprite é só a praça de
    # pedra com areia, que na referência não existe sob este arco.
    arco = arco.crop((150, 40, 545, 468))
    arco = arco.resize((140, round(arco.height * 140 / arco.width)), Image.LANCZOS)

    roch = Image.open(f'{RAIZ}/assets/sprites/praia/relevo/rochedo-pe.png').convert('RGBA')
    roch = roch.resize((LARGURA_ROCHA, round(roch.height * LARGURA_ROCHA / roch.width)), Image.LANCZOS)
    roch = roch.crop((0, 24, LARGURA_ROCHA, 24 + ALTURA_ROCHA))

    W = LARGURA_ROCHA + 20
    H = arco.height + ALTURA_ROCHA - 26
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    c.alpha_composite(arco, ((W - arco.width) // 2, 0))
    # O rochedo cobre a borda reta do recorte do arco e vira o piso de pedra.
    c.alpha_composite(roch, ((W - roch.width) // 2, arco.height - 26))
    c.save(f'{RAIZ}/assets/sprites/enseada-lote2/portal-sudeste-rochedo.png')

    bg = Image.new('RGBA', c.size, (60, 130, 140, 255))
    bg.alpha_composite(c)
    bg.convert('RGB').resize((440, round(440 * c.height / c.width)), Image.LANCZOS).save('/tmp/portal_sudeste.png')
    print('ok', c.size)


if __name__ == '__main__':
    main()
