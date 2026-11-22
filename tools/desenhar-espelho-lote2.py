#!/usr/bin/env python3
"""Desenha o ESPELHO DE RESSONÂNCIA da Enseada na arte da referência.

A referência desenha um espelho oval de moldura dourada com pedrarias, de pé
sobre uma praça pavimentada de lajotas claras em losango, com um canteiro de
grama e um medalhão de pedra ao centro. O sprite antigo era um portal
tecnológico de pedra escura com vórtice roxo — nada a ver com a arte.

Saída: assets/sprites/enseada-lote2/espelho-arquetipos.png (RGBA)
"""
import math
from PIL import Image, ImageDraw

W, H = 560, 470
ESCALA = 4  # desenha em 4x e reduz para antialiasar

# Paleta lida da referência
PEDRA_CLARA = (206, 198, 178)
PEDRA = (186, 176, 154)
PEDRA_ESC = (150, 140, 120)
PEDRA_LINHA = (108, 100, 84)
GRAMA = (122, 178, 66)
GRAMA_ESC = (92, 146, 48)
GRAMA_CLARO = (150, 200, 96)
OURO = (214, 158, 66)
OURO_ESC = (150, 100, 34)
OURO_CLARO = (246, 208, 128)
ESPELHO = (186, 232, 246)
ESPELHO_CLARO = (238, 252, 255)
ESPELHO_ESC = (128, 196, 226)
CONTORNO = (58, 44, 30)


def main():
    S = ESCALA
    im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def e(v):
        return int(round(v * S))

    def losango(dr, cx, cy, rx, ry, fill, outline=None, width=1):
        pts = [(cx, cy - ry), (cx + rx, cy), (cx, cy + ry), (cx - rx, cy)]
        dr.polygon(pts, fill=fill, outline=outline, width=width)

    cx = W / 2
    pcy = 328.0          # centro da praça
    PRX, PRY = 264, 166  # meia largura / meia altura da praça

    # ---------------- praça: lajotas isométricas ----------------
    # Cada lajota é um losango com a mesma inclinação da praça, formando
    # uma malha de 16x16 células recortada pelo contorno do pavimento.
    ladrilho = Image.new('RGBA', im.size, (0, 0, 0, 0))
    td = ImageDraw.Draw(ladrilho)
    N = 8
    dx, dy = PRX / N, PRY / N
    for i in range(-N, N):
        for j in range(-N, N):
            px = cx + (i - j) * dx + (dx - dy * 0) * 0
            # centro da célula em coordenadas (u,v) inteiras deslocadas
            u, v = i + 0.5, j + 0.5
            mx = cx + (u - v) * dx
            my = pcy + (u + v) * dy
            # alterna levemente o tom, como pedra gasta
            tom = (i * 7 + j * 13) % 5
            cor = [PEDRA_CLARA, PEDRA, PEDRA_CLARA, PEDRA_CLARA, PEDRA][tom]
            losango(td, e(mx), e(my), e(dx), e(dy), fill=cor,
                    outline=PEDRA_LINHA, width=max(1, S // 2))
            # brilho no canto superior de cada lajota
            td.line([(e(mx - dx * 0.72), e(my - dy * 0.28)),
                     (e(mx), e(my - dy * 0.9))],
                    fill=PEDRA_CLARA, width=max(1, S // 2))

    # máscara: losango do pavimento
    mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(mask)
    md.polygon([(e(cx), e(pcy - PRY)), (e(cx + PRX), e(pcy)),
                (e(cx), e(pcy + PRY)), (e(cx - PRX), e(pcy))], fill=255)
    im.alpha_composite(Image.composite(ladrilho, Image.new('RGBA', im.size, (0, 0, 0, 0)), mask))
    d = ImageDraw.Draw(im)

    # contorno do pavimento
    losango(d, e(cx), e(pcy), e(PRX), e(PRY), fill=None, outline=CONTORNO, width=2 * S)
    losango(d, e(cx), e(pcy), e(PRX - 6), e(PRY - 4), fill=None,
            outline=PEDRA_ESC, width=S)

    # ---------------- canteiro de grama ----------------
    GX, GY = 150, 92
    losango(d, e(cx), e(pcy), e(GX + 10), e(GY + 7), fill=PEDRA_LINHA)
    losango(d, e(cx), e(pcy), e(GX + 6), e(GY + 4), fill=PEDRA_CLARA)
    losango(d, e(cx), e(pcy), e(GX), e(GY), fill=GRAMA)
    # tufos de grama
    for k in range(46):
        a = (k * 2.399) % (2 * math.pi)
        r = math.sqrt(((k * 37) % 100) / 100.0) * 0.82
        gx = cx + math.cos(a) * GX * r
        gy = pcy + math.sin(a) * GY * r
        cor = GRAMA_CLARO if k % 2 else GRAMA_ESC
        d.line([(e(gx - 3), e(gy + 2)), (e(gx - 5), e(gy - 4))], fill=cor, width=S)
        d.line([(e(gx + 1), e(gy + 2)), (e(gx + 2), e(gy - 5))], fill=cor, width=S)

    # ---------------- medalhão de pedra ----------------
    MCX, MCY = cx, pcy + 4
    MRX, MRY = 96, 52
    d.ellipse([e(MCX - MRX), e(MCY - MRY), e(MCX + MRX), e(MCY + MRY)],
              fill=PEDRA_ESC, outline=CONTORNO, width=2 * S)
    d.ellipse([e(MCX - MRX + 10), e(MCY - MRY + 7), e(MCX + MRX - 10), e(MCY + MRY - 7)],
              fill=PEDRA_CLARA, outline=PEDRA_LINHA, width=S)
    d.ellipse([e(MCX - MRX + 34), e(MCY - MRY + 20), e(MCX + MRX - 34), e(MCY + MRY - 20)],
              fill=PEDRA, outline=PEDRA_LINHA, width=S)
    d.ellipse([e(MCX - MRX + 50), e(MCY - MRY + 28), e(MCX + MRX - 50), e(MCY + MRY - 28)],
              fill=PEDRA_ESC, outline=PEDRA_LINHA, width=S)
    # runas radiais gravadas no anel
    for k in range(16):
        a = math.radians(k * 22.5)
        ca, sa = math.cos(a), math.sin(a)
        r0, r1 = 0.80, 0.93
        d.line([(e(MCX + ca * MRX * r0 * 0.58), e(MCY + sa * MRY * r0)),
                (e(MCX + ca * MRX * r1 * 0.62), e(MCY + sa * MRY * r1))],
               fill=PEDRA_LINHA, width=max(1, S // 2))
        d.line([(e(MCX + ca * MRX * r1 * 0.62 - 3), e(MCY + sa * MRY * r1)),
                (e(MCX + ca * MRX * r1 * 0.62 + 3), e(MCY + sa * MRY * r1))],
               fill=PEDRA_LINHA, width=max(1, S // 2))
    # núcleo do medalhão (luz azulada)
    d.ellipse([e(MCX - 24), e(MCY - 13), e(MCX + 24), e(MCY + 13)],
              fill=ESPELHO_ESC, outline=PEDRA_LINHA, width=S)
    d.ellipse([e(MCX - 15), e(MCY - 8), e(MCX + 15), e(MCY + 8)], fill=ESPELHO)

    # ---------------- espelho ----------------
    mcx, mcy = cx, 208
    rx, ry = 56, 78
    # sombra no chão
    d.ellipse([e(mcx - 60), e(mcy + 84), e(mcx + 60), e(mcy + 104)],
              fill=(0, 0, 0, 60))
    # pés de apoio
    for fx in (-34, 34):
        d.polygon([(e(mcx + fx - 15), e(mcy + 66)), (e(mcx + fx + 15), e(mcy + 66)),
                   (e(mcx + fx + 22), e(mcy + 92)), (e(mcx + fx - 22), e(mcy + 92))],
                  fill=OURO_ESC, outline=CONTORNO, width=S)
        d.line([(e(mcx + fx - 10), e(mcy + 74)), (e(mcx + fx + 12), e(mcy + 74))],
               fill=OURO, width=S)
    # moldura externa (ouro escuro = contorno grosso)
    d.ellipse([e(mcx - rx - 4), e(mcy - ry - 4), e(mcx + rx + 4), e(mcy + ry + 4)],
              fill=OURO_ESC, outline=CONTORNO, width=2 * S)
    # corpo da moldura
    d.ellipse([e(mcx - rx), e(mcy - ry), e(mcx + rx), e(mcy + ry)], fill=OURO)
    # borda recortada (crestas) ao longo do oval
    for k in range(34):
        a = math.radians(k * 360 / 34)
        ca, sa = math.cos(a), math.sin(a)
        px = mcx + ca * (rx + 1)
        py = mcy + sa * (ry + 1)
        d.ellipse([e(px - 6), e(py - 6), e(px + 6), e(py + 6)],
                  fill=OURO_CLARO if k % 2 else OURO, outline=OURO_ESC, width=max(1, S // 2))
    # bisel interno
    d.ellipse([e(mcx - rx + 10), e(mcy - ry + 10), e(mcx + rx - 10), e(mcy + ry - 10)],
              fill=OURO_ESC)
    d.ellipse([e(mcx - rx + 13), e(mcy - ry + 13), e(mcx + rx - 13), e(mcy + ry - 13)],
              fill=CONTORNO)
    # vidro
    grx, gry = rx - 17, ry - 17
    d.ellipse([e(mcx - grx), e(mcy - gry), e(mcx + grx), e(mcy + gry)], fill=ESPELHO_ESC)
    d.ellipse([e(mcx - grx + 4), e(mcy - gry + 4), e(mcx + grx - 4), e(mcy + gry - 4)],
              fill=ESPELHO)
    # reflexo diagonal
    refl = Image.new('RGBA', im.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(refl)
    rd.polygon([(e(mcx - grx + 6), e(mcy - gry + 26)), (e(mcx + grx - 26), e(mcy - gry + 2)),
                (e(mcx + grx - 2), e(mcy - gry + 40)), (e(mcx - grx + 6), e(mcy + gry * 0.2))],
               fill=ESPELHO_CLARO)
    gm = Image.new('L', im.size, 0)
    gd = ImageDraw.Draw(gm)
    gd.ellipse([e(mcx - grx + 4), e(mcy - gry + 4), e(mcx + grx - 4), e(mcy + gry - 4)], fill=255)
    im.alpha_composite(Image.composite(refl, Image.new('RGBA', im.size, (0, 0, 0, 0)), gm))
    d = ImageDraw.Draw(im)
    # segunda faixa de brilho, mais fina
    d.line([(e(mcx - grx + 10), e(mcy + gry * 0.55)), (e(mcx + grx - 14), e(mcy + gry * 0.15))],
           fill=ESPELHO_CLARO, width=2 * S)

    # ---------------- pedrarias da moldura ----------------
    gemas = [
        (0.00, -1.06, (232, 186, 240)),   # topo
        (-0.62, -0.86, (186, 228, 244)),
        (0.62, -0.86, (186, 228, 244)),
        (-0.96, -0.30, (240, 206, 128)),
        (0.96, -0.30, (240, 206, 128)),
        (-0.90, 0.36, (186, 228, 244)),
        (0.90, 0.36, (186, 228, 244)),
        (0.00, 1.08, (240, 206, 128)),
    ]
    for gx_, gy_, cor in gemas:
        px = mcx + gx_ * rx
        py = mcy + gy_ * ry
        d.ellipse([e(px - 9), e(py - 9), e(px + 9), e(py + 9)], fill=OURO_ESC,
                  outline=CONTORNO, width=S)
        d.ellipse([e(px - 7), e(py - 7), e(px + 7), e(py + 7)], fill=cor)
        d.ellipse([e(px - 3.5), e(py - 4.5), e(px + 1.5), e(py + 0.5)], fill=(255, 255, 255))
    # pináculo no topo
    d.polygon([(e(mcx), e(mcy - ry - 30)), (e(mcx + 13), e(mcy - ry - 4)),
               (e(mcx), e(mcy - ry + 6)), (e(mcx - 13), e(mcy - ry - 4))],
              fill=OURO, outline=CONTORNO, width=S)
    d.ellipse([e(mcx - 7), e(mcy - ry - 25), e(mcx + 7), e(mcy - ry - 11)],
              fill=(232, 186, 240), outline=OURO_ESC, width=S)

    im = im.resize((W, H), Image.LANCZOS)
    im.save('assets/sprites/enseada-lote2/espelho-arquetipos.png')
    print('ok: assets/sprites/enseada-lote2/espelho-arquetipos.png')


if __name__ == '__main__':
    main()
