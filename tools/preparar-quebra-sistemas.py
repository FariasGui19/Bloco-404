#!/usr/bin/env python3
"""Prepara as folhas da segunda forma do Núcleo 10X — QUEBRA SISTEMAS.

As fontes chegam do gerador em RGB com fundo magenta chapado, quadros em
faixas largas e tamanhos diferentes entre si. Este script:

  1. remove o magenta com alpha real e despill nas bordas;
  2. acha sozinho as figuras (colunas/linhas com conteúdo), sem confiar em
     grade fixa — é o mesmo problema que já estourou nas folhas Bio;
  3. normaliza altura, apoio dos pés e centro do corpo em células iguais;
  4. grava PNGs RGBA de 256 px por célula em assets/sprites/player/.

Uso: python3 tools/preparar-quebra-sistemas.py
Requer Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-art/nucleo'
OUT = ROOT / 'assets/sprites/player'

CELL = 256
# Pés apoiados em 220 de 256: sobra chão para o vapor e a fagulha das marretas.
BASELINE = 220
TARGET_HEIGHT = 178
CENTER_X = CELL // 2


def remove_magenta(rgb):
    """Magenta chapado -> alpha real, com despill para não sobrar halo rosa."""
    a = rgb.astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    bleed = np.minimum(r, b) - g
    alpha = np.ones(r.shape, dtype=np.float32)
    alpha[bleed >= 70] = 0.0
    edge = (bleed > 10) & (bleed < 70)
    alpha[edge] = (70 - bleed[edge]) / 60.0
    out = a.copy()
    out[:, :, 0] = r - np.clip(bleed, 0, None)
    out[:, :, 2] = b - np.clip(bleed, 0, None)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return np.dstack([out, (alpha * 255).round().astype(np.uint8)])


def remove_pink_light(rgba):
    """Corrige o halo rosa-claro onde o gerador misturou magenta com âmbar.

    O feixe de luz da transformação veio rosa-salmão em vez de âmbar. Em vez de
    apagar (o feixe é bonito e some o efeito), a cor é reescrita para âmbar
    mantendo o brilho: o que é claro, avermelhado e com azul alto demais para
    ser âmbar vira dourado; ferrugem escura e âmbar legítimo não são tocados.
    """
    out = rgba.copy()
    r = rgba[:, :, 0].astype(np.int16)
    g = rgba[:, :, 1].astype(np.int16)
    b = rgba[:, :, 2].astype(np.int16)
    # Rosa-salmão do feixe: claro, avermelhado e com azul alto demais para
    # ser âmbar (o âmbar de verdade tem o azul quase zerado).
    rosa = (r >= 165) & ((r - g) >= 45) & ((g - b) <= 62)
    out[rosa, 1] = np.clip(0.72 * g[rosa] + 0.30 * r[rosa], 0, 255).astype(np.uint8)
    out[rosa, 2] = np.clip(0.12 * b[rosa], 0, 255).astype(np.uint8)
    return out


def content_bands(mask, axis, min_share=.004, max_gap=6):
    """Faixas contínuas com conteúdo no eixo pedido (0 = linhas, 1 = colunas)."""
    profile = mask.sum(axis=axis)
    limit = max(2, profile.max() * min_share)
    occupied = np.where(profile > limit)[0]
    if not len(occupied):
        return []
    bands, start, last = [], occupied[0], occupied[0]
    for index in occupied[1:]:
        if index - last > max_gap:
            bands.append((int(start), int(last) + 1))
            start = index
        last = index
    bands.append((int(start), int(last) + 1))
    return bands


def fit_bands(bands, expected, profile):
    """Ajusta as faixas ao número de quadros que a folha promete.

    O gerador às vezes cola dois quadros (uma marreta encosta na seguinte) ou
    solta um fiapo de vapor solto. Em vez de confiar na grade, juntamos as
    faixas mais próximas quando sobram e cortamos a mais larga no ponto de
    menor densidade quando faltam.
    """
    bands = [list(b) for b in bands]
    while len(bands) > expected:
        gaps = [bands[i + 1][0] - bands[i][1] for i in range(len(bands) - 1)]
        index = int(np.argmin(gaps))
        bands[index] = [bands[index][0], bands[index + 1][1]]
        del bands[index + 1]
    while len(bands) < expected:
        larguras = [b[1] - b[0] for b in bands]
        index = int(np.argmax(larguras))
        x0, x1 = bands[index]
        janela = profile[x0:x1]
        # Ponto de menor conteúdo no miolo da faixa larga.
        meio0, meio1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
        corte = meio0 + int(np.argmin(profile[meio0:meio1])) if meio1 > meio0 else (x0 + x1) // 2
        bands[index:index + 1] = [[x0, corte], [corte, x1]]
    return [tuple(b) for b in bands]


def tight(rgba, box):
    x0, y0, x1, y1 = box
    patch = rgba[y0:y1, x0:x1]
    ys, xs = np.where(patch[:, :, 3] > 8)
    if not len(xs):
        raise SystemExit('quadro vazio dentro da folha')
    return patch[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def compose(frames, out_name):
    """Células iguais: altura normalizada, pés na base, corpo centralizado."""
    heights = [f.shape[0] for f in frames]
    scale = TARGET_HEIGHT / float(np.median(heights))
    sheet = Image.new('RGBA', (CELL * len(frames), CELL), (0, 0, 0, 0))
    for col, frame in enumerate(frames):
        h, w = frame.shape[:2]
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        art = Image.fromarray(frame).resize((nw, nh), Image.LANCZOS)
        dx = CELL // 2 - nw // 2
        dy = BASELINE - nh
        sheet.alpha_composite(art, (col * CELL + dx, dy))
    target = OUT / f'{out_name}.png'
    sheet.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)} → {sheet.width}×{sheet.height}, '
          f'escala {scale:.3f}, {len(frames)} quadros')


# Cada folha aponta a fonte, as linhas de figuras e o nome final.
#   rows  → índices das linhas de figuras (0 = primeira linha da arte)
#   cols  → quantos quadros a linha deve ter (o recorte se ajusta sozinho)
#   cells → quais quadros dessa linha entram na folha final (ordem do olho)
SHEETS = [
    # Turnaround de referência: frente, direita, costas, esquerda.
    {'file': 'quebra-sistemas-turnaround.png', 'prefix': 'player-10x-bruta-parado', 'rows': [0], 'cols': 4},
    # Caminhada frontal e traseira: 4 fases cada, em linhas separadas.
    {'file': 'quebra-sistemas-andar.png', 'prefix': 'player-10x-bruta-andar-frente', 'rows': [0], 'cols': 4},
    # Costas: a arte só tem duas vistas traseiras limpas (as outras duas
    # giram o corpo para o lado). Fica um ciclo de duas fases alternadas,
    # como já aconteceu na caminhada frontal da Bio — nada de pose falsa.
    {'file': 'quebra-sistemas-andar.png', 'prefix': 'player-10x-bruta-andar-costas', 'rows': [1], 'cols': 4, 'cells': [0, 2, 0, 2]},
    # Corrida em perfil, virada para a direita: é a folha de andar lateral.
    {'file': 'quebra-corrida-faixa.png', 'prefix': 'player-10x-bruta-andar-lateral', 'rows': [0], 'cols': 4},
    # Ataque lateral (5 fases: preparo, subida, impacto, recuo, retorno):
    # a folha final usa quatro, na ordem em que o golpe acontece.
    {'file': 'quebra-ataque-faixa.png', 'prefix': 'player-10x-bruta-ataque-lateral', 'rows': [0], 'cols': 5, 'cells': [0, 1, 2, 3]},
    # Ataque frontal, duas marretas (4 fases).
    {'file': 'quebra-ataque-frente-faixa.png', 'prefix': 'player-10x-bruta-ataque-frente', 'rows': [0], 'cols': 4},
    # Transformação: o corpo se monta em placas de luz âmbar. Usa só a
    # primeira linha (as de baixo são poses extras do gerador) e limpa o
    # halo rosa-claro que sobrou do feixe de luz.
    {'file': 'quebra-transformacao.png', 'prefix': 'player-10x-bruta-transformacao', 'rows': [0], 'cols': 4, 'pink': True},
]

# Ícone da forma para a roda do T: o bloco de cabeça com o núcleo aceso,
# recortado da própria folha de referência — sem desenhar um ícone novo.
ICON = {'file': 'quebra-sistemas-turnaround.png', 'prefix': 'ui/nucleo-quebra-sistemas',
        'row': 0, 'col': 0, 'box': (.24, .02, .76, .44), 'size': 192}


def make_icon(cfg):
    """Recorte quadrado do bloco de cabeça, com alpha, para o cartão da roda."""
    rgba = remove_magenta(np.asarray(Image.open(SOURCE / cfg['file']).convert('RGB')))
    mask = rgba[:, :, 3] > 8
    rows = content_bands(mask, 1)
    y0, y1 = rows[cfg['row']]
    x0, x1 = content_bands(mask[y0:y1], 0)[cfg['col']]
    figure = tight(rgba, (x0, y0, x1, y1))
    h, w = figure.shape[:2]
    bx0, by0, bx1, by1 = cfg['box']
    crop = figure[int(by0 * h):int(by1 * h), int(bx0 * w):int(bx1 * w)]
    art = Image.fromarray(crop)
    # Quadrado, com respiro, e sem esticar o pixel: só redimensiona.
    lado = max(art.size)
    canvas = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    canvas.alpha_composite(art, ((lado - art.width) // 2, (lado - art.height) // 2))
    canvas = canvas.resize((cfg['size'], cfg['size']), Image.LANCZOS)
    target = ROOT / 'assets/sprites' / f"{cfg['prefix']}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)} → {canvas.width}×{canvas.height} (ícone da forma)')


def main():
    for cfg in SHEETS:
        rgba = remove_magenta(np.asarray(Image.open(SOURCE / cfg['file']).convert('RGB')))
        if cfg.get('pink'):
            rgba = remove_pink_light(rgba)
        mask = rgba[:, :, 3] > 8
        rows = content_bands(mask, 1)
        if not rows:
            raise SystemExit(f"{cfg['file']}: sem conteúdo")
        pics = []
        for row in cfg['rows']:
            if row >= len(rows):
                raise SystemExit(f"{cfg['file']}: linha {row} não existe")
            y0, y1 = rows[row]
            band = mask[y0:y1]
            colunas = content_bands(band, 0)
            if cfg.get('cols'):
                colunas = fit_bands(colunas, cfg['cols'], band.sum(axis=0))
            escolhidas = cfg.get('cells') or range(len(colunas))
            for index in escolhidas:
                x0, x1 = colunas[index]
                pics.append(tight(rgba, (x0, y0, x1, y1)))
        compose(pics, cfg['prefix'])
    make_icon(ICON)


if __name__ == '__main__':
    main()
