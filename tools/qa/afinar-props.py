#!/usr/bin/env python3
"""Acha onde cada sprite do mapa está na arte de referência, COM escala.

Motivo: o acampamento foi posicionado "no olho", e o platô, que é um recorte
2× do pôster, estava sendo desenhado com `larguraPx` de 2× — daí o paredão
gigante e os props parecendo flutuar. Aqui a escala é medida, não estimada:
para cada objeto procura-se (escala, dx, dy) que maximiza a correlação
cruzada normalizada (ZNCC) em luminância, usando a máscara alfa do sprite.

Uso:
  .venv/bin/python tools/qa/afinar-props.py id1 id2 ...
  .venv/bin/python tools/qa/afinar-props.py --janela=80 --escala id1

Saída por objeto: escala ideal (→ larguraPx), deslocamento em px de tela e a
posição de mapa já pronta para `x:` / `y:` do enseada-ecos.js.
"""
import json
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

RAIZ = '/home/user/Bloco-404'
ARTE = f'{RAIZ}/assets/source-art/reparo-norte-10/referencia-mestre.png'
VW, VH = 1408, 768
ZOOM = 0.5


def posicoes():
    js = f"""
import {{ view, camera, worldToScreen }} from '{RAIZ}/js/engine/camera.js';
import {{ map }} from '{RAIZ}/js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
view.w=1408; view.h=768; view.dpr=1;
camera.zoom=camera.targetZoom=0.5; camera.x=1408-1475; camera.y=768+305.5;
const out={{}};
for (const o of map.objects) {{
  const p = worldToScreen(o.x+.5, o.y+.5);
  out[o.id] = {{ sx:p.x, sy:p.y, sprite:o.sprite, px:o.larguraPx,
                 pivX:o.pivotX??0.5, pivY:o.pivotY??1,
                 ajX:o.ajusteX??0, ajY:o.ajusteY??0 }};
}}
console.log(JSON.stringify(out));
"""
    open('/tmp/pos.mjs', 'w').write(js)
    r = subprocess.run(['node', '/tmp/pos.mjs'], capture_output=True, text=True, cwd=RAIZ)
    if r.returncode:
        print(r.stderr)
        sys.exit(1)
    return json.loads(r.stdout)


_REG = None


def registro():
    """Mapa id → caminho do PNG, lido do registro do js/main.js."""
    global _REG
    if _REG is None:
        src = open(f'{RAIZ}/js/main.js', encoding='utf-8').read()
        _REG = {m.group(1): m.group(2) for m in
                re.finditer(r"\{\s*id:\s*'([^']+)',\s*src:\s*'([^']+)'", src)}
    return _REG


def preparar(sprite_id, largura_px):
    """Recorta o sprite como o renderer faz e devolve RGB+máscara em 1×.

    Reduz para escala 1:1 do pôster usando `larguraPx` (o que o jogo desenha),
    então o casamento acontece exatamente no que se vê no render.
    """
    caminho = registro().get(sprite_id)
    if not caminho:
        return None
    im = Image.open(f'{RAIZ}/{caminho}').convert('RGBA')
    bb = im.getbbox()
    if not bb:
        return None
    c = im.crop(bb)
    k = largura_px / c.width
    w, h = max(1, round(c.width * k)), max(1, round(c.height * k))
    red = np.asarray(c.resize((w, h), Image.LANCZOS), np.float32)
    rgb = red[..., :3]
    lum = rgb[..., 0] * .299 + rgb[..., 1] * .587 + rgb[..., 2] * .114
    return {'lum': lum, 'mask': (red[..., 3] > 160).astype(np.float32),
            'w': w, 'h': h, 'base': c, 'bb': bb}


def zncc(J, T, m):
    """ZNCC de um template mascarado T sobre a janela J (mesma forma)."""
    n = float(m.sum())
    if n < 40:
        return -1.0
    Tm = T * m
    a = J * m
    va = a - a.sum() / n
    vb = Tm - Tm.sum() / n
    den = np.sqrt((va * va).sum() * (vb * vb).sum())
    return float((va * vb).sum() / den) if den > 1e-6 else -1.0


def buscar(arte_lum, spr, escala, cx, cy, janela):
    """Varre (dx, dy) para uma escala, por FFT. Devolve (score, dx, dy)."""
    w = max(2, int(round(spr['w'] * escala)))
    h = max(2, int(round(spr['h'] * escala)))
    if w > spr['base'].width * 3 or h > spr['base'].height * 3:
        return None
    im = spr['base'].resize((w, h), Image.LANCZOS)
    arr = np.asarray(im, np.float32)
    T = arr[..., 0] * .299 + arr[..., 1] * .587 + arr[..., 2] * .114
    m = (arr[..., 3] > 160).astype(np.float32)

    x0, y0 = int(cx) - w // 2 - janela, int(cy) - h // 2 - janela
    x1, y1 = x0 + w + 2 * janela, y0 + h + 2 * janela
    if x0 < 0 or y0 < 0 or x1 > arte_lum.shape[1] or y1 > arte_lum.shape[0]:
        return None
    J = arte_lum[y0:y1, x0:x1]

    n = float(m.sum())
    if n < 40:
        return None
    Tm = T * m
    mf = m[::-1, ::-1]
    somaJ = fftconvolve(J, mf, mode='valid')
    somaJ2 = fftconvolve(J * J, mf, mode='valid')
    somaJT = fftconvolve(J, Tm[::-1, ::-1], mode='valid')
    num = somaJT - somaJ * (Tm.sum()) / n
    varJ = np.maximum(somaJ2 - somaJ ** 2 / n, 1e-3)
    varT = max(float((Tm * Tm).sum()) - float(Tm.sum()) ** 2 / n, 1e-3)
    coef = num / np.sqrt(varJ * varT)
    iy, ix = np.unravel_index(int(np.argmax(coef)), coef.shape)
    return float(coef[iy, ix]), x0 + ix + w / 2 - cx, y0 + iy + h / 2 - cy, w


def tela_para_mapa(nx, ny):
    A = (nx - VW / 2) / ZOOM + (VW - 1475)
    B = (ny - VH / 2) / ZOOM + (VH + 305.5)
    return ((A / 32 + B / 16) / 2 - .5, (B / 16 - A / 32) / 2 - .5)


def main():
    janela, escalas_fixas, alvos = 40, None, []
    for a in sys.argv[1:]:
        if a.startswith('--janela='):
            janela = int(a.split('=')[1])
        elif a.startswith('--escala='):
            escalas_fixas = [float(v) for v in a.split('=')[1].split(',')]
        elif '=' in a:
            i, w = a.split('=')
            alvos.append((i, float(w)))
        else:
            alvos.append((a, None))

    arte_lum = np.asarray(Image.open(ARTE).convert('L'), np.float32)
    pos = posicoes()
    escalas = escalas_fixas or [0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0]

    print(f'{"id":<34}{"score":>7}{"escala":>8}{"larguraPx":>11}{"dx":>7}{"dy":>7}   x, y do mapa')
    for oid, larg in alvos:
        if oid not in pos:
            print(f'{oid:<34} AUSENTE')
            continue
        p = pos[oid]
        spr = preparar(p['sprite'], larg or p['px'] or 100)
        if not spr:
            print(f'{oid:<34} sprite não registrado')
            continue
        # centro atual do sprite na tela (a âncora é canto sup-esq, não centro)
        w0, h0 = spr['w'], spr['h']
        cx = p['sx'] + p['ajX'] + w0 * (0.5 - p['pivX'])
        cy = p['sy'] + p['ajY'] + h0 * (0.5 - p['pivY'])

        melhor = None
        for e in escalas:
            r = buscar(arte_lum, spr, e, cx, cy, janela)
            if r and (melhor is None or r[0] > melhor[0]):
                melhor = (r[0], e, r[1], r[2], r[3])
        if not melhor:
            print(f'{oid:<34} sem janela válida')
            continue
        score, e, dx, dy, w = melhor
        largura_ideal = round((larg or p['px'] or 100) * e)
        nx, ny = p['sx'] + dx, p['sy'] + dy
        mx, my = tela_para_mapa(nx, ny)
        print(f'{oid:<34}{score:7.3f}{e:8.2f}{largura_ideal:11d}{dx:7.1f}{dy:7.1f}   {mx:.2f}, {my:.2f}')


if __name__ == '__main__':
    main()
