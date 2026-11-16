"""Recorte de sprites gerados sobre fundo magenta chapado.

Compartilhado pelos recortes da Enseada. Magenta nao existe na paleta do jogo,
entao a chave e exata: nao sobra franja nem halo — diferente do flood fill do
branco, que para no primeiro pixel nao-branco e arrasta um anel inteiro de
grama e areia junto com o objeto.
"""
from __future__ import annotations

import cv2
import numpy as np


def chave_magenta(rgb: np.ndarray) -> np.ndarray:
    """Mascara do fundo magenta (1 = fundo).

    Magenta = R e B altos, G baixo. `mag` mede o quanto o pixel pende para
    magenta. Limiar generoso + flood fill das bordas: assim um detalhe
    arroxeado *dentro* do objeto nao e comido.
    """
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    mag = np.minimum(r, b) - g
    candidato = (mag > 22).astype(np.uint8)

    # Fica so o magenta LIGADO A BORDA: um detalhe arroxeado dentro do objeto
    # (janela do relogio, sombra da lona) nao e confundido com fundo.
    n, rot, st, _ = cv2.connectedComponentsWithStats(candidato, 8)
    if n <= 1:
        return np.zeros_like(candidato)
    borda = set(rot[0, :]).union(rot[-1, :], rot[:, 0], rot[:, -1])
    borda.discard(0)
    fundo = np.isin(rot, list(borda)).astype(np.uint8)
    return fundo


def despill(rgb: np.ndarray, alfa: np.ndarray) -> np.ndarray:
    """Tira o roxo que sobrou nas bordas anti-serrilhadas.

    Na franja o pixel e object-cor + magenta. Como magenta tem G baixo,
    puxar R e B para o nivel de G devolve a cor do objeto.
    """
    out = rgb.astype(np.int16)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    excesso = np.minimum(r, b) - g
    franja = (alfa > 0) & (excesso > 0)
    correcao = np.where(franja, excesso, 0)
    out[..., 0] = np.clip(r - correcao, 0, 255)
    out[..., 2] = np.clip(b - correcao, 0, 255)
    return out.astype(np.uint8)


