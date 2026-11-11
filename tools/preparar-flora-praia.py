#!/usr/bin/env python3
"""Monta os dois atlas extras de flora e rochedos da praia (Praia 11).

Uso (na raiz do projeto):
    python tools/preparar-flora-praia.py

Lê as duas folhas RGBA já versionadas em assets/source-art/coastal/ e isola
cada peça pelo componente conexo que contém a semente (as caixas das peças
se sobrepõem na folha, então recortar por retângulo traria pedaço do vizinho).

Saída:
    assets/sprites/objects/vegetacao-tropical-2.png   8x3 células de 256x320
    assets/sprites/objects/costa-rochosa-2.png        8x3 células de 288x320

Cada peça fica centrada na célula e encostada na base (pé no chão), com
margem para o recorte de `sprite-clean.js` não confundir com o vizinho.
Dependências: Pillow, NumPy, SciPy.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = 'assets/source-art/coastal/'


def pecas(folha, sementes, celula, colunas, saida, dilata=5):
    im = Image.open(RAIZ + folha).convert('RGBA')
    a = np.asarray(im)
    opaco = a[..., 3] > 30
    lab, _ = ndi.label(ndi.binary_dilation(opaco, structure=np.ones((dilata, dilata))))
    cw, ch = celula
    linhas = (len(sementes) + colunas - 1) // colunas
    atlas = Image.new('RGBA', (cw * colunas, ch * linhas))
    for i, semente in enumerate(sementes):
        if semente is None:
            continue
        nome, sx, sy = semente[:3]
        # Depois da semente: pontos extras (x, y) de peças que formam o mesmo
        # conjunto, e opcionalmente um dict {'caixa': (x0, y0, x1, y1)} para
        # cortar o que a dilatação colou por engano.
        extras = [e for e in semente[3:] if isinstance(e, tuple)]
        opcoes = next((e for e in semente[3:] if isinstance(e, dict)), {})
        ids = {lab[sy, sx]} | {lab[y, x] for x, y in extras}
        ids.discard(0)
        if not ids:
            raise SystemExit(f'{folha}: semente de "{nome}" caiu no vazio ({sx},{sy})')
        mask = np.isin(lab, list(ids)) & opaco
        if 'caixa' in opcoes:
            x0, y0, x1, y1 = opcoes['caixa']
            dentro = np.zeros_like(mask)
            dentro[y0:y1, x0:x1] = True
            mask &= dentro
        ys, xs = np.nonzero(mask)
        b = a.copy()
        b[..., 3] = np.where(mask, a[..., 3], 0)
        peca = Image.fromarray(b, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        peca.thumbnail((cw - 12, ch - 12), Image.Resampling.LANCZOS)
        col, lin = i % colunas, i // colunas
        atlas.alpha_composite(peca, (col * cw + (cw - peca.width) // 2, lin * ch + ch - peca.height - 5))
        print(f'  {saida.split("/")[-1]} [{col},{lin}] {nome:22s} {peca.width}x{peca.height}')
    atlas.save(saida, optimize=True)


# --- vegetação: folha coastal/vegetacao.png --------------------------------
pecas('vegetacao.png', [
    # linha 0 — rasteiras
    ('samambaia_clara', 520, 290), ('bromelia_grande', 710, 290), ('flores_roxas', 900, 300),
    ('flores_vermelhas', 1090, 290), ('monstera', 1270, 290), ('samambaia_alta', 1445, 290),
    ('bromelia_a', 115, 910), ('bromelia_b', 330, 910),
    # linha 1 — árvores e madeira
    ('palmeira_leque', 520, 520), ('palmeira_bromelia', 700, 520), ('arvore_dupla', 1280, 480),
    ('palmeira_tripla', 1445, 480), ('rocha_musgo', 110, 720), ('tronco_musgo', 520, 720),
    ('toco', 720, 730), ('raiz', 1245, 900),
    # linha 2 — miúdos
    ('flores_roxas_b', 520, 900), ('flores_azuis', 705, 900), ('arbusto', 905, 895),
    ('cipo', 1090, 860), ('monstera_b', 1440, 900), None, None, None,
], (256, 320), 8, 'assets/sprites/objects/vegetacao-tropical-2.png')

# --- costa: folha coastal/praia.png ---------------------------------------
pecas('praia.png', [
    # linha 0 — palmeirais (as mesmas peças da referência `ilha-panorama.png`)
    ('palmeiral', 75, 560, (215, 560), (200, 640)), ('palmeira_samambaias', 330, 600), ('arvore_samambaias', 435, 520),
    ('palmeira_alta', 360, 880), ('palmeiral_grande', 1240, 860, (1335, 900), {'caixa': (1100, 684, 1420, 1024)}), ('palmeirinha_cipo', 1120, 520),
    ('bromelia_gigante', 1230, 520), ('bromelia', 255, 780),
    # linha 1 — rochedos
    ('rochedo_palmeira', 590, 560), ('rochedo_bloco', 715, 520), ('rochedo_largo', 870, 540),
    ('rochedo_pilar', 1005, 520), ('rochedo_musgo', 1360, 540), ('rochedo_grande', 130, 880),
    ('rochedo_palmeirinha', 1455, 920), ('rochedo_selva', 1410, 240, {'caixa': (1290, 150, 1536, 338)}),
    # linha 2 — miúdos e mar
    ('pedras', 1480, 545), ('seixos', 700, 615, (760, 615), (790, 600)), ('tronco', 890, 645),
    ('rocha_samambaia', 650, 690), ('rochas', 1090, 750), ('samambaias', 1050, 630, (960, 700), (1040, 690)),
    ('ilhota_musgo', 910, 950), ('rochas_espuma', 500, 880),
], (288, 320), 8, 'assets/sprites/objects/costa-rochosa-2.png')
