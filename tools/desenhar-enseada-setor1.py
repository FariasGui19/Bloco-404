"""Platô do acampamento (Setor 1) — mesa isométrica desenhada em pixel art.

Por que desenhar em vez de recortar: os 10 equipamentos do acampamento cobrem
justamente o miolo do platô, e qualquer preenchimento automático daquele
buraco (inpaint, patch-match, difusão por classe) deixa cunhas e estrias.
Desenhar dá um sprite limpo, com alpha correto e reutilizável.

A geometria NÃO é inventada: a face de cima é o polígono medido sobre a
referência (as posições dos pés dos 10 equipamentos vêm de
`plato-acampamento.json`, que foram casadas por template matching com
correlação 0.97–0.997). A paleta é amostrada da própria arte.

Saída em `assets/sprites/enseada-norte/` (2× a arte, para bater com o mapa):

  plato-topo.png         só a superfície (para empilhar props por cima)
  plato-parede.png       só o paredão de rocha
  plato-acampamento.png  mesa completa (parede + topo + degraus) — é a que o mapa usa

Uso: python3 tools/desenhar-enseada-setor1.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'assets/sprites/enseada-norte'

# ---- Moldura, em px da arte -------------------------------------------------
ARTE_X0, ARTE_Y0, ARTE_X1, ARTE_Y1 = 244, 138, 672, 372
LARG, ALT = ARTE_X1 - ARTE_X0, ARTE_Y1 - ARTE_Y0
ESCALA = 2                       # 1 px de arte = 2 px de jogo

# ---- Paleta amostrada da referência ----------------------------------------
PALETA = {
    'grama':          (101, 152, 55),
    'grama_clara':    (127, 179, 71),
    'grama_escura':   (81, 128, 45),
    'grama_lip':      (150, 199, 88),
    'contorno_grama': (38, 63, 28),
    'areia':          (253, 220, 105),
    'areia_clara':    (255, 235, 148),
    'areia_sombra':   (231, 191, 84),
    'areia_borda':    (198, 158, 70),
    'rocha_clara':    (190, 152, 98),
    'rocha_media':    (158, 118, 74),
    'rocha_escura':   (122, 86, 56),
    'rocha_fundo':    (62, 42, 28),
    'rocha_contorno': (38, 25, 17),
    'degrau':         (206, 174, 116),
    'degrau_sombra':  (146, 113, 72),
    'degrau_borda':   (70, 48, 32),
}

# ---- Face de cima: polígono medido sobre a referência (px da arte) ----------
# Fecha todos os pés dos equipamentos (relógio 327,269 · bancada 400,274 ·
# torre 450,241 · fogueira 473,286 · tenda 529,262 · caixa 497,222 ·
# pilha 577,287 · banco 429,313 · árvores 522,202 · cesto 365,279).
TOPO = [
    # borda noroeste: sobe em degraus irregulares, não numa curva lisa
    (253, 248), (257, 234), (266, 226), (272, 214), (283, 208),
    (291, 197), (303, 190), (312, 181), (325, 176), (334, 166),
    (348, 162), (357, 154), (371, 152), (383, 149), (396, 148),
    (409, 147), (423, 147), (436, 149), (449, 150), (462, 153),
    (475, 156), (487, 160), (499, 164), (511, 169), (523, 173),
    (535, 179), (546, 184), (557, 190), (568, 195), (578, 201),
    (589, 207), (598, 214), (606, 220), (614, 227), (621, 234),
    (627, 242), (634, 250), (638, 259),
    # borda sul: enseadas e pontas curtas — a referência tem um "bico" em
    # x≈470 (onde a trilha desce), um promontório em x≈540 e uma reentrância
    # em x≈600 antes do cômoro rochoso do leste.
    (630, 268), (620, 272), (608, 275), (596, 282), (583, 284),
    (571, 288), (558, 291), (546, 289), (534, 291), (522, 295),
    (510, 300), (498, 302), (486, 300), (474, 296), (463, 292),
    (452, 293), (441, 291), (430, 288), (418, 284), (407, 281),
    (395, 279), (384, 274), (372, 269), (361, 266), (349, 261),
    (338, 258), (327, 253), (316, 249), (305, 244), (294, 240),
    (283, 236), (272, 232), (262, 240),
]
# Altura do paredão em cada trecho da borda frontal (px de arte).
# Mais alto no miolo (a encosta é côncava), mais baixo nas pontas.
PAREDE = {
    'oeste': 16, 'centro': 60, 'leste': 22,
}


def interp_fechado(pontos, n):
    """Reamostra um polígono fechado em n pontos igualmente espaçados."""
    pts = np.array(pontos, float)
    seg = np.linalg.norm(np.diff(np.vstack([pts, pts[:1]]), axis=0), axis=1)
    total = seg.sum()
    alvos = np.linspace(0, total, n, endpoint=False)
    saida = []
    acumulado = 0.0
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        d = seg[i]
        while alvos and alvos[0] <= acumulado + d:
            f = (alvos[0] - acumulado) / d if d else 0
            saida.append(a + (b - a) * f)
            alvos = alvos[1:]
        acumulado += d
    return np.array(saida)


class Cena:
    def __init__(self):
        self.img = Image.new('RGBA', (LARG, ALT), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.rng = np.random.default_rng(4242)

    def p(self, pt):
        return (float(pt[0]) - ARTE_X0, float(pt[1]) - ARTE_Y0)

    def mascara(self, poligono):
        """Máscara 1 bit do polígono, para recortar detalhes internos."""
        m = Image.new('L', (LARG, ALT), 0)
        ImageDraw.Draw(m).polygon([self.p(q) for q in poligono], fill=255)
        return m

    def recortar(self, poligono, desenhar):
        """Executa `desenhar(camada)` e cola só o que cai dentro do polígono."""
        camada = Image.new('RGBA', (LARG, ALT), (0, 0, 0, 0))
        desenhar(camada, ImageDraw.Draw(camada))
        camada.putalpha(Image.composite(camada.getchannel('A'),
                                        Image.new('L', (LARG, ALT), 0),
                                        self.mascara(poligono)))
        self.img.alpha_composite(camada)

    def salvar(self, nome):
        grande = self.img.resize((LARG * ESCALA, ALT * ESCALA), Image.NEAREST)
        a = np.asarray(grande)[..., 3]
        grande.putalpha(Image.fromarray(np.where(a > 110, 255, 0).astype(np.uint8)))
        caminho = SAIDA / nome
        grande.save(caminho)
        return caminho


# Divisores do polígono: o mesmo índice nas duas metades (leste e oeste).
I_OESTE = 0
I_LESTE = next(i for i, q in enumerate(TOPO) if q == (638, 259))


def aresta_norte():
    """Metade de trás (norte): do canto oeste, pelo alto, até o canto leste."""
    return TOPO[I_OESTE:I_LESTE + 1]


def aresta_sul():
    """Metade da frente (sul): do canto leste de volta ao canto oeste."""
    return TOPO[I_LESTE:] + [TOPO[I_OESTE]]


def altura_parede(xs):
    """Altura do paredão ao longo da borda sul.

    Côncava (alto no miolo), mas com ondulação: a referência tem trechos mais
    e menos altos, e é essa variação que dá leitura de rocha empilhada em vez
    de "bolo".
    """
    xs = np.asarray(xs, float)
    t = (xs - xs.min()) / max(xs.max() - xs.min(), 1e-6)
    base = (PAREDE['oeste'] * (1 - t) ** 2
            + PAREDE['centro'] * (4 * t * (1 - t))
            + PAREDE['leste'] * t ** 2)
    # três ondulações de amplitudes diferentes, ancoradas na posição x
    onda = (np.sin(t * 9.1 + 0.7) * 3.4
            + np.sin(t * 17.3 + 2.1) * 2.0
            + np.sin(t * 4.4 + 4.0) * 2.6)
    return np.clip(base + onda, 4, None)


def desenhar_parede(c: Cena):
    """Paredão: banda entre a borda frontal e a mesma borda afundada."""
    # a parede desce da aresta SUL (é ela que fica visível na projeção 2:1:
    # a aresta norte esconde a parede atrás de si)
    f = np.array(aresta_sul(), float)
    altura = altura_parede(f[:, 0])
    fundo = np.stack([f[:, 0], f[:, 1] + altura], axis=1)
    parede = np.vstack([f, fundo[::-1]])
    m = c.mascara(parede)

    def corpo(camada, d):
        d.polygon([c.p(q) for q in parede.tolist()], fill=PALETA['rocha_media'] + (255,))

    c.recortar(parede, corpo)

    # pedras arredondadas em três tons (mesma linguagem da referência)
    def pedras(camada, d):
        for _ in range(340):
            i = int(c.rng.integers(0, len(f)))
            topo_pt, fundo_pt = f[i], fundo[i]
            if fundo_pt[1] - topo_pt[1] < 8:
                continue
            cy = float(c.rng.uniform(topo_pt[1] + 2, fundo_pt[1] - 2))
            cx = float(topo_pt[0] + c.rng.uniform(-3, 3))
            rx = float(c.rng.uniform(6, 16))
            ry = max(3.0, rx * c.rng.uniform(0.42, 0.66))
            sorte = c.rng.random()
            cor = (PALETA['rocha_clara'] if sorte < 0.42
                   else PALETA['rocha_escura'] if sorte < 0.72
                   else PALETA['rocha_media'])
            caixa = [c.p((cx - rx, cy - ry))[0], c.p((cx - rx, cy - ry))[1],
                     c.p((cx + rx, cy + ry))[0], c.p((cx + rx, cy + ry))[1]]
            # A referência desenha CADA pedra com contorno escuro grosso: é
            # esse contorno que dá leitura de rocha empilhada. Sem ele a
            # parede vira uma mancha de lama chapada.
            d.ellipse(caixa, fill=cor + (255,),
                      outline=PALETA['rocha_contorno'] + (255,), width=1)
            d.arc(caixa, 195, 345, fill=PALETA['rocha_fundo'] + (255,))
            d.arc(caixa, 20, 160, fill=PALETA['rocha_clara'] + (255,))

    c.recortar(parede, pedras)

    # contorno inferior e sombra de contato
    def contorno(camada, d):
        d.line([c.p(q) for q in fundo.tolist()], fill=PALETA['rocha_contorno'] + (255,), width=2)
        d.line([c.p(q) for q in (fundo + [0, 3]).tolist()], fill=PALETA['rocha_fundo'] + (255,), width=1)

    c.recortar(parede, contorno)
    return f, fundo


def desenhar_topo(c: Cena):
    """Superfície: grama, clareira de areia e a lipa de grama sobre o paredão."""
    poligono = TOPO

    def base(camada, d):
        d.polygon([c.p(q) for q in poligono], fill=PALETA['grama'] + (255,))

    c.recortar(poligono, base)

    # textura de grama: tufos achatados claros e escuros
    def tufos(camada, d):
        for _ in range(190):
            cx = float(c.rng.uniform(ARTE_X0 + 8, ARTE_X1 - 8))
            cy = float(c.rng.uniform(ARTE_Y0 + 12, ARTE_Y1 - 30))
            rx = float(c.rng.uniform(3, 9))
            ry = max(1.6, rx * c.rng.uniform(0.28, 0.5))
            cor = (PALETA['grama_clara'] if c.rng.random() < 0.55
                   else PALETA['grama_escura'])
            caixa = [c.p((cx - rx, cy - ry))[0], c.p((cx - rx, cy - ry))[1],
                     c.p((cx + rx, cy + ry))[0], c.p((cx + rx, cy + ry))[1]]
            d.ellipse(caixa, fill=cor + (255,))

    c.recortar(poligono, tufos)

    # clareira de areia do acampamento (miolo, onde ficam os equipamentos)
    # A areia cobre o miolo/leste do platô (onde ficam os equipamentos) e a
    # grama fica nas bordas norte, oeste e no talude sul.
    clareira = [
        (392, 196), (418, 184), (448, 180), (478, 184), (506, 194),
        (530, 208), (548, 226), (558, 246), (556, 266), (544, 282),
        (526, 294), (504, 302), (480, 306), (456, 304), (432, 298),
        (412, 288), (398, 274), (388, 256), (384, 236), (384, 214),
    ]

    def areia(camada, d):
        d.polygon([c.p(q) for q in clareira], fill=PALETA['areia'] + (255,))

    c.recortar(poligono, areia)

    # borda da areia: tufos de grama invadindo (transição orgânica, sem retângulo)
    def borda_areia(camada, d):
        for _ in range(120):
            i = int(c.rng.integers(0, len(clareira)))
            a = np.array(clareira[i], float)
            b = np.array(clareira[(i + 1) % len(clareira)], float)
            pt = a + (b - a) * float(c.rng.random())
            r = float(c.rng.uniform(1.5, 4.0))
            caixa = [c.p((pt[0] - r, pt[1] - r * .6))[0], c.p((pt[0] - r, pt[1] - r * .6))[1],
                     c.p((pt[0] + r, pt[1] + r * .6))[0], c.p((pt[0] + r, pt[1] + r * .6))[1]]
            d.ellipse(caixa, fill=PALETA['grama'] + (255,))
        # manchas de areia mais clara e sombra no fundo da clareira
        for _ in range(40):
            cx = float(c.rng.uniform(392, 490))
            cy = float(c.rng.uniform(192, 262))
            r = float(c.rng.uniform(2, 5))
            caixa = [c.p((cx - r, cy - r * .45))[0], c.p((cx - r, cy - r * .45))[1],
                     c.p((cx + r, cy + r * .45))[0], c.p((cx + r, cy + r * .45))[1]]
            d.ellipse(caixa, fill=PALETA['areia_clara'] + (255,))
        for _ in range(60):
            cx = float(c.rng.uniform(388, 492))
            cy = float(c.rng.uniform(252, 288))
            c_pt = c.p((cx, cy))
            d.point(c_pt, fill=PALETA['areia_sombra'] + (255,))

    c.recortar(poligono, borda_areia)

    # lipa de grama: a borda sul fica por cima do paredão, com realce claro
    lip = np.array(aresta_sul(), float)
    lip_in = lip + [0, -5]

    def borda(camada, d):
        # a grama avança sobre a rocha em linguetas: nada de aresta reta
        for i in range(len(lip) - 1):
            a, b = lip[i], lip[i + 1]
            passos = max(2, int(abs(b[0] - a[0]) / 3))
            for k in range(passos):
                f0, f1 = k / passos, (k + 1) / passos
                p0 = a + (b - a) * f0
                p1 = a + (b - a) * f1
                avanca = float(c.rng.uniform(0, 4.5))
                pts = [p0, p1, p1 + (0, avanca + 2), p0 + (0, avanca + 2)]
                d.polygon([c.p(q) for q in pts], fill=PALETA['grama'] + (255,))
                d.point(c.p(p1 + (0, avanca + 2.5)), fill=PALETA['contorno_grama'] + (255,))
        d.line([c.p(q) for q in lip_in.tolist()], fill=PALETA['grama_lip'] + (255,), width=1)

    c.recortar(np.vstack([lip_in, (lip + [0, 8])[::-1]]).tolist(), borda)

    # tufos de grama saindo do perímetro: a borda da arte nunca é uma curva
    # lisa, e é isso que separa "pixel art" de "forma vetorial".
    def tufos_borda(camada, d):
        norte = aresta_norte()
        for i in range(len(norte) - 1):
            a, b = np.array(norte[i], float), np.array(norte[i + 1], float)
            n = 3
            for k in range(n):
                pt = a + (b - a) * ((k + 0.5) / n)
                r = float(c.rng.uniform(3.5, 8.0))
                for _ in range(int(r)):
                    ang = float(c.rng.uniform(np.pi * 1.05, np.pi * 1.95))
                    px = pt[0] + np.cos(ang) * float(c.rng.uniform(0, r))
                    py = pt[1] + np.sin(ang) * float(c.rng.uniform(0, r * 0.8))
                    d.point(c.p((px, py)), fill=(PALETA['grama'] if c.rng.random() < .6
                                                 else PALETA['grama_escura']) + (255,))
        # mesmo tratamento nas laterais, mais discreto
        for i in range(len(poligono)):
            a, b = np.array(poligono[i], float), np.array(poligono[(i + 1) % len(poligono)], float)
            d_seg = float(np.linalg.norm(b - a))
            for k in range(int(d_seg // 6)):
                pt = a + (b - a) * (k / max(d_seg // 6, 1))
                r = float(c.rng.uniform(1.5, 3.5))
                for _ in range(int(r * 2)):
                    ang = float(c.rng.uniform(0, np.pi * 2))
                    d.point(c.p((pt[0] + np.cos(ang) * r, pt[1] + np.sin(ang) * r * .7)),
                            fill=PALETA['grama'] + (255,))

    c.recortar([(ARTE_X0, ARTE_Y0), (ARTE_X1, ARTE_Y0), (ARTE_X1, ARTE_Y1), (ARTE_X0, ARTE_Y1)], tufos_borda)

    # contorno geral do topo (leitura do estilo: tudo tem traço escuro)
    def traco(camada, d):
        d.line([c.p(q) for q in poligono + [poligono[0]]], fill=PALETA['contorno_grama'] + (255,), width=1)

    c.recortar(poligono, traco)


def desenhar_trilha(c: Cena):
    """Trilha de areia que sai da clareira e desce a encosta leste.

    Na referência o acesso ao acampamento não é uma rampa comprida: é uma
    trilha de areia curta no alto e, na encosta, poucos degraus de pedra.
    """
    # 1) trecho no alto do platô — sempre recortado pela face de cima
    pts = [(498, 272), (522, 280), (546, 285), (568, 287), (586, 286)]
    larg = [6, 8, 9, 9, 8]

    def alto(camada, d):
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            passos = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
            for k in range(passos):
                f = k / passos
                cx, cy = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
                w = larg[i] + (larg[i + 1] - larg[i]) * f
                pol = [(cx - w, cy), (cx, cy - w * .40), (cx + w, cy),
                       (cx + w, cy + 2.2), (cx, cy + w * .40 + 2.2), (cx - w, cy + 2.2)]
                d.polygon([c.p(q) for q in pol], fill=PALETA['areia'] + (255,))
                d.line([c.p(pol[0]), c.p(pol[1]), c.p(pol[2])],
                       fill=PALETA['areia_borda'] + (255,), width=1)

    c.recortar(TOPO, alto)

    # 2) sulcos de erosão no talude, recortados pela própria parede
    f = np.array(aresta_sul(), float)
    fundo = np.stack([f[:, 0], f[:, 1] + altura_parede(f[:, 0])], axis=1)
    parede = np.vstack([f, fundo[::-1]]).tolist()

    def sulcos(camada, d):
        for k in range(5):
            x0 = 576 + k * 7
            y0 = float(np.interp(x0, f[:, 0], f[:, 1])) + 2
            comp = float(c.rng.uniform(14, 24))
            desvio = float(c.rng.uniform(-6, 6))
            pts_s = []
            for j in range(6):
                t = j / 5
                pts_s.append((x0 + desvio * t + t * 8, y0 + comp * t))
            d.line([c.p(q) for q in pts_s], fill=PALETA['areia_sombra'] + (255,), width=2)
            d.line([c.p(q) for q in [(q[0], q[1] - 1.6) for q in pts_s]],
                   fill=PALETA['areia'] + (255,), width=1)

    c.recortar(parede, sulcos)


def desenhar_degraus(c: Cena):
    """Degraus de pedra no talude leste, recortados pela parede.

    A referência não tem rampa comprida de areia: tem uma escadinha curta
    embutida na rocha, e é ela que serve de acesso ao platô.
    """
    f = np.array(aresta_sul(), float)
    fundo = np.stack([f[:, 0], f[:, 1] + altura_parede(f[:, 0])], axis=1)
    parede = np.vstack([f, fundo[::-1]]).tolist()

    def degraus(camada, d):
        for k in range(5):
            cx = 596 + k * 4
            topo_y = float(np.interp(cx, f[:, 0], f[:, 1]))
            cy = topo_y + 2 + k * 5
            meia = 15 - k * 1.6
            face = [(cx - meia, cy), (cx, cy - 3.2), (cx + meia, cy)]
            d.polygon([c.p(q) for q in face],
                      fill=(PALETA['degrau'] if k % 2 == 0 else PALETA['degrau_sombra']) + (255,))
            d.line([c.p(face[0]), c.p(face[1]), c.p(face[2])],
                   fill=PALETA['degrau_borda'] + (255,), width=1)
            d.line([c.p((cx - meia, cy)), c.p((cx - meia + 2, cy + 4.5)),
                    c.p((cx + meia - 2, cy + 4.5)), c.p((cx + meia, cy))],
                   fill=PALETA['degrau_borda'] + (255,), width=1)

    c.recortar(parede, degraus)

    # pedras soltas na base da escadinha
    def pedras(camada, d):
        for _ in range(10):
            cx = float(c.rng.uniform(600, 660))
            cy = float(np.interp(cx, f[:, 0], f[:, 1])) + float(c.rng.uniform(30, 46))
            rx = float(c.rng.uniform(2.5, 5))
            caixa = [c.p((cx - rx, cy - rx * .5))[0], c.p((cx - rx, cy - rx * .5))[1],
                     c.p((cx + rx, cy + rx * .5))[0], c.p((cx + rx, cy + rx * .5))[1]]
            d.ellipse(caixa, fill=PALETA['rocha_clara'] + (255,))
            d.arc(caixa, 20, 160, fill=PALETA['rocha_escura'] + (255,))

    c.recortar([(ARTE_X0, ARTE_Y0), (ARTE_X1, ARTE_Y0), (ARTE_X1, ARTE_Y1), (ARTE_X0, ARTE_Y1)], pedras)


def ancora_mundo():
    """Ponto de encaixe no mapa: base do paredão no centro da moldura."""
    cx = (ARTE_X0 + ARTE_X1) / 2
    sul = np.array(aresta_sul(), float)
    # a aresta sul vai do leste para o oeste: ordena em x antes de interpolar
    ordem = np.argsort(sul[:, 0])
    xs, ys = sul[ordem, 0], sul[ordem, 1]
    cx = float(np.clip(cx, xs.min(), xs.max()))
    cy = float(np.interp(cx, xs, ys)) + float(np.interp(cx, xs, altura_parede(xs)))
    # arte -> mundo (mesma transformação do mapa)
    # arte -> mundo, com a MESMA fórmula de `tools/tracar-enseada-costa.py`:
    # d = (px-cx)/sx, t = (py-cy)/sy, x = (d+t)/2, y = (t-d)/2.
    # (O sprite é gravado em 2x, então a escala do desenho casa sozinha.)
    d = (cx - 737.5) / 16
    t = (cy + 152.75) / 8
    return ((d + t) / 2, (t - d) / 2), (cx, cy)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)

    c_topo = Cena()
    desenhar_topo(c_topo)
    p_topo = c_topo.salvar('plato-topo.png')

    c_parede = Cena()
    desenhar_parede(c_parede)
    p_parede = c_parede.salvar('plato-parede.png')

    c = Cena()
    desenhar_parede(c)
    desenhar_topo(c)
    desenhar_trilha(c)
    desenhar_degraus(c)
    p_mesa = c.salvar('plato-acampamento.png')

    (x, y), (ax, ay) = ancora_mundo()
    dados = {
        'molduraArte': [ARTE_X0, ARTE_Y0, ARTE_X1, ARTE_Y1],
        'escala': ESCALA,
        'larguraPx': LARG * ESCALA,
        'alturaPx': ALT * ESCALA,
        'ancoraArte': [round(ax, 2), round(ay, 2)],
        'ancoraMundo': [round(x, 4), round(y, 4)],
        'pivotX': round((ax - ARTE_X0) / LARG, 6),
        'pivotY': round((ay - ARTE_Y0) / ALT, 6),
        'poligonoTopo': TOPO,
        'transformacao': 'px = 737.5 + 16*(x-y); py = -152.75 + 8*(x+y)',
        'pecas': {
            'plato-topo.png': 'superfície (grama + clareira de areia)',
            'plato-parede.png': 'paredão de rocha',
            'plato-acampamento.png': 'mesa completa (usada pelo mapa)',
        },
    }
    (SAIDA / 'medidas-setor1.json').write_text(
        json.dumps(dados, indent=2, ensure_ascii=False), encoding='utf8')
    for p in (p_topo, p_parede, p_mesa):
        print(p.name, Image.open(p).size)
    print('âncora mundo', dados['ancoraMundo'], 'pivot', dados['pivotX'], dados['pivotY'])


if __name__ == '__main__':
    main()
