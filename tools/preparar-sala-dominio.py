#!/usr/bin/env python3
"""
Prepara os sprites isométricos 2:1 da Sala de Missão — Lâmina Domínio Ancião:
  assets/source-art/sala-dominio/*.png  ->  assets/sprites/sala-dominio/*.png

Pipeline:
1. Recorte por região (preservando faíscas, chamas e hologramas flutuantes);
2. Chroma-key global + interno do fundo magenta (#FF00FF), com tratamento
   translúcido dedicado para o visor holográfico da Estela do Registro;
3. Despill anti-halo nas bordas externas e internas;
4. Redimensionamento em alfa pré-multiplicado (LANCZOS) e medição de pivôs.
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source-art" / "sala-dominio"
OUT = ROOT / "assets" / "sprites" / "sala-dominio"


def extrair_rgba(im: Image.Image, holo_visor: bool = False) -> Image.Image:
    rgb = np.array(im.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # No santuário do Domínio Ancião (obsidiana, basalto, bronze e ouro),
    # qualquer pixel fortemente magenta é fundo cromático (#FF00FF).
    mag_puro = (r > 205) & (g < 58) & (b > 205)
    mag_forte = (r > g + 46) & (b > g + 44) & (r > 85) & (b > 85)

    if holo_visor:
        # O interior translúcido do holograma foi pintado sobre #FF00FF
        # (rosa claro: R alto, G ~75..145, B ~170..235). Convertemos esse vidro
        # rosa em vidro holográfico âmbar-escuro semitransparente!
        vidro_rosa = (~mag_puro) & (r > 200) & (b > 145) & (g >= 52) & (b > g + 35)
        fundo = mag_puro | (mag_forte & (~vidro_rosa))
    else:
        vidro_rosa = np.zeros_like(mag_puro)
        fundo = mag_puro | mag_forte

    # Remove microssujidades isoladas (< 6 px), preservando faíscas reais
    fg = ~fundo
    lbl, num = ndimage.label(fg)
    if num > 0:
        counts = np.bincount(lbl.ravel())
        ruido = counts < 6
        ruido[0] = False
        fundo = fundo | ruido[lbl]

    alpha = np.where(fundo, 0.0, 255.0).astype(np.float32)

    # Suavização e despill nos pixels de transição com o fundo
    borda_ext = ndimage.binary_dilation(fundo, iterations=2) & (~fundo) & (~vidro_rosa)
    excesso = np.maximum(0.0, np.minimum(r, b) - g)
    frac = np.clip(1.0 - excesso / 185.0, 0.0, 1.0)
    alpha = np.where(borda_ext, alpha * frac, alpha)
    alpha = np.where(alpha < 20.0, 0.0, alpha)

    despill_mask = ndimage.binary_dilation(fundo, iterations=3) & (alpha > 0) & (~vidro_rosa)
    limite_rb = np.where(g > r * 0.72, g + 16.0, np.maximum(g + 22.0, (r + g) * 0.46))
    r_new = np.where(despill_mask & (b > g + 22), np.minimum(r, np.maximum(g + 26.0, r * 0.76)), r)
    b_new = np.where(despill_mask & (b > g + 18), np.minimum(b, limite_rb), b)

    if holo_visor:
        # Substitui o vidro rosa por vidro âmbar escuro translúcido
        r_new = np.where(vidro_rosa, 54.0, r_new)
        g = np.where(vidro_rosa, 36.0, g)
        b_new = np.where(vidro_rosa, 14.0, b_new)
        alpha = np.where(vidro_rosa, 118.0, alpha)

    out = np.dstack([
        np.clip(r_new, 0, 255),
        np.clip(g, 0, 255),
        np.clip(b_new, 0, 255),
        np.clip(alpha, 0, 255),
    ]).astype(np.uint8)

    res = Image.fromarray(out, "RGBA")
    ys, xs = np.where(out[:, :, 3] > 24)
    if len(xs) == 0:
        return res
    return res.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def redimensionar_premult(im: Image.Image, target_w: int) -> Image.Image:
    w, h = im.size
    if w <= target_w:
        return im
    target_h = max(1, round(h * (target_w / w)))
    arr = np.array(im, dtype=np.float32) / 255.0
    a = arr[:, :, 3:4]
    pre = np.concatenate([arr[:, :, :3] * a, a], axis=2)
    pre_im = Image.fromarray(np.clip(pre * 255.0, 0, 255).astype(np.uint8), "RGBA")
    scaled = pre_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    s = np.array(scaled, dtype=np.float32) / 255.0
    sa = s[:, :, 3:4]
    rgb = np.where(sa > 1e-3, s[:, :, :3] / np.maximum(sa, 1e-3), 0.0)
    sa = np.where(sa < 0.06, 0.0, sa)
    final = np.concatenate([np.clip(rgb, 0.0, 1.0), np.clip(sa, 0.0, 1.0)], axis=2)
    return Image.fromarray(np.clip(final * 255.0, 0, 255).astype(np.uint8), "RGBA")


def salvar(im: Image.Image, nome: str, largura_max: int, flip_h: bool = False, holo_visor: bool = False):
    limpo = extrair_rgba(im, holo_visor=holo_visor)
    if flip_h:
        limpo = ImageOps.mirror(limpo)
    redim = redimensionar_premult(limpo, largura_max)
    # Borda transparente de 2 px garante que os 4 cantos sejam alpha=0 (evita que
    # sprite-clean.js confunda obsidiana escura no canto com cor de fundo).
    final = Image.new("RGBA", (redim.width + 4, redim.height + 4), (0, 0, 0, 0))
    final.paste(redim, (2, 2))
    OUT.mkdir(parents=True, exist_ok=True)
    destino = OUT / nome
    final.save(destino, optimize=True)
    arr = np.array(final)[:, :, 3] > 40
    h, w = arr.shape

    def bot(x0, x1):
        ys = np.where(arr[:, max(0, int(x0)):min(w, int(x1))].any(axis=1))[0]
        return ys[-1] / h if len(ys) else 1.0

    print(
        f"OK  {nome:24s}  {w:3d}x{h:<3d}  "
        f"L:{bot(0, w*0.08):.3f} C:{bot(w*0.47, w*0.53):.3f} R:{bot(w*0.92, w):.3f}"
    )


def main():
    # 1. Pisos 2:1
    salvar(Image.open(SRC / "piso-obsidiana.png"), "piso-obsidiana.png", 256)
    salvar(Image.open(SRC / "piso-runa.png"), "piso-runa.png", 256)

    # 2. Paredes e Portal Doca B2
    canto = Image.open(SRC / "parede-canto-dominio.png")
    salvar(canto, "parede-canto.png", 620)
    # Ala direita de parede-canto -> painel reto +2:+1 com fendas verticais douradas
    salvar(canto.crop((785, 0, canto.width, canto.height)), "parede-plana.png", 360)

    # Parede com relevo e arandela dourada: espelhada para padrão +2:+1
    relevo = Image.open(SRC / "parede-relevo-dominio.png")
    salvar(relevo, "parede-relevo.png", 360, flip_h=True)

    # Porta Doca B2 (componente esquerdo já está no eixo -2:+1 da parede x=0)
    portas = Image.open(SRC / "porta-doca-dominio.png")
    salvar(portas.crop((0, 0, 720, portas.height)), "porta-doca.png", 380)

    # 3. Altar da Lâmina Ancestral + Lacre de Frequência (-2:+1)
    salvar(Image.open(SRC / "altar-lamina-ancestral.png"), "altar-lamina.png", 540)
    salvar(Image.open(SRC / "lacre-frequencia.png"), "lacre-frequencia.png", 540)

    # 4. Coluna Monolítica e Pira/Obelisco de Chama Dourada
    cols = Image.open(SRC / "colunas-dominio.png")
    salvar(cols.crop((0, 0, 700, cols.height)), "pilar-dominio.png", 260)
    salvar(cols.crop((700, 0, cols.width, cols.height)), "pira-dominio.png", 200)

    # 5. Estela do Registro (com visor holográfico translúcido) e Armeiro de Domínio
    rel = Image.open(SRC / "reliquias-dominio.png")
    salvar(rel.crop((0, 0, 660, rel.height)), "estela-registro.png", 280, holo_visor=True)
    salvar(rel.crop((660, 0, rel.width, rel.height)), "armeiro-dominio.png", 340)

    # 6. Monólito de Prova (intacto -> partido ao meio com Golpe de Ruptura!)
    mono = Image.open(SRC / "monolito-rachado.png")
    salvar(mono.crop((0, 0, 700, mono.height)), "monolito-intacto.png", 240)
    salvar(mono.crop((700, 0, mono.width, mono.height)), "monolito-partido.png", 280)


if __name__ == "__main__":
    main()
