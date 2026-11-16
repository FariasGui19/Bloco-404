"""Monta o Setor 1 (Acampamento e Encosta) da Enseada dos Ecos.

Entrada: `assets/source-art/reparo-norte-10/` — lotes de arte ainda com fundo
chapado/quadriculado. Saída: sprites RGBA em `assets/sprites/enseada-norte/`
mais um relatório `assets/sprites/enseada-norte/medidas.json` com a caixa de
cada peça, para o mapa posicionar pelo pé sem chute.

O fundo destas imagens é **xadrez desenhado**, não transparência: dois cinzas
claros (255 e ~193). O recorte é por flood fill das bordas + limpeza dos
quadrados internos, preservando as bordas escuras da arte (que são neutras,
mas ficam longe das bordas e têm vizinhança saturada).

Uso: python3 tools/preparar-enseada-norte.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path('assets/source-art/reparo-norte-10')
DEST = Path('assets/sprites/enseada-norte')

# Peças do Setor 1: terreno, encosta, degraus e o fechamento da rampa.
PECAS = {
    'terraco-plato': '02-terraco.png',
    'encosta-plato': '03-encosta.png',
    'degraus-embutidos': '04-degraus.png',
    'parede-degraus': '13-parede-degraus.png',
    'palmeira-media': '14-palmeira-media.png',
    'palmeira-baixa': '15-palmeira-baixa.png',
    'arvores-redondas': '16-arvores-redondas.png',
    'arbustos-densos': '17-arbustos-densos.png',
    'pedras-cinzentas': '18-pedras-cinzentas.png',
    'planta-piscina': '19-planta-piscina.png',
    'biruta': '20-biruta-direita.png',
}

# Os dois cinzas do quadriculado (e o branco chapado das origens 1–10).
NEUTRO_CLARO = 236        # >= isto é fundo (branco/quase branco)
NEUTRO_XADREZ = (176, 210)  # faixa do cinza médio do tabuleiro


def eh_fundo(px):
    r, g, b, a = int(px[0]), int(px[1]), int(px[2]), int(px[3])
    if a == 0:
        return True
    if max(r, g, b) - min(r, g, b) > 24:       # cor saturada = arte
        return False
    luz = (r + g + b) / 3
    if luz >= NEUTRO_CLARO:
        return True
    if NEUTRO_XADREZ[0] <= luz <= NEUTRO_XADREZ[1]:
        return True
    if luz <= 14:                               # linha preta do quadriculado
        return True
    return False


def recortar(caminho: Path) -> Image.Image:
    imagem = Image.open(caminho).convert('RGBA')
    dados = np.array(imagem)
    h, w = dados.shape[:2]

    neutro = np.zeros((h, w), bool)
    plano = dados.reshape(-1, 4)
    for i in range(plano.shape[0]):
        neutro.reshape(-1)[i] = eh_fundo(plano[i])

    # Flood fill a partir da moldura: só o fundo CONECTADO à borda é apagado.
    fora = np.zeros((h, w), bool)
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if neutro[y, x] and not fora[y, x]:
                fora[y, x] = True
                fila.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if neutro[y, x] and not fora[y, x]:
                fora[y, x] = True
                fila.append((y, x))
    while fila:
        y, x = fila.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and neutro[ny, nx] and not fora[ny, nx]:
                fora[ny, nx] = True
                fila.append((ny, nx))

    dados[fora] = (0, 0, 0, 0)

    # Quadrados internos (entre folhas, sob vãos): qualquer bloco neutro que
    # seja vizinho de transparente também sai — nunca há cinza puro na arte.
    fundo = dados[..., 3] == 0
    for _ in range(2):
        expandido = fundo.copy()
        expandido[1:, :] |= fundo[:-1, :]
        expandido[:-1, :] |= fundo[1:, :]
        expandido[:, 1:] |= fundo[:, :-1]
        expandido[:, :-1] |= fundo[:, 1:]
        fundo = expandido & neutro
    dados[fundo] = (0, 0, 0, 0)

    # Franja de reamostragem (alfa parcial encostado no fundo) vira corte seco.
    alfa = dados[..., 3].astype(np.int16)
    dados[(alfa > 0) & (alfa < 48)] = (0, 0, 0, 0)

    saida = Image.fromarray(dados, 'RGBA')
    caixa = saida.getbbox()
    return saida.crop(caixa) if caixa else saida


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    linhas = []
    for nome, arquivo in PECAS.items():
        origem = SOURCE / arquivo
        if not origem.exists():
            print(f'!! ausente: {origem}')
            continue
        recorte = recortar(origem)
        recorte.save(DEST / f'{nome}.png')
        w, h = recorte.size
        linhas.append(f'  {{ "id": "{nome}", "arquivo": "{nome}.png", "w": {w}, "h": {h} }}')
        print(f'{nome:20s} {w:5d} x {h:5d}  <- {arquivo}')
    (DEST / 'medidas.json').write_text(
        '[\n' + ',\n'.join(linhas) + '\n]\n', encoding='utf8')
    print(f'\n{len(linhas)} peças em {DEST}')


if __name__ == '__main__':
    main()
