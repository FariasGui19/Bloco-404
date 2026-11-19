#!/usr/bin/env python3
"""Lote 01: duas repinturas geradas + oito efeitos procedurais; 10 atlas/160 poses.
Reproduzir: .venv/bin/python tools/preparar-docas-cascos.py (Pillow, NumPy).
Não são 160 desenhos manuais. O balanço rígido é aplicado pelo jogo, uma só vez.
"""
from pathlib import Path
import json
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source-art/docas-cascos'
OUT = ROOT / 'assets/sprites/docas-cascos'
N, COLS = 16, 4
TAU = math.tau


def key(name, size):
    a = np.array(Image.open(SRC / f'{name}.png').convert('RGBA'))
    rgb = a[:, :, :3].astype(float)
    excess = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    # Continuous key plus despill: preserve thin dark mast/rigging, no green halo.
    alpha = np.clip((105 - excess) / 80, 0, 1)
    a[:, :, 3] = (alpha * a[:, :, 3]).astype('uint8')
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]) + 8)
    a[a[:, :, 3] == 0] = 0
    im = Image.fromarray(a)
    box = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    # Register to the existing footprint rather than changing game/map geometry.
    return im.crop(box).resize(size, Image.Resampling.LANCZOS)


def hull(im, phase, ship):
    a = np.array(im).astype(float)
    h, w = a.shape[:2]
    y, x = np.mgrid[:h, :w]
    # Moonlit caustic crosses the lower planking; keep alpha completely unchanged.
    wet = np.clip((y / h - .65) / .35, 0, 1)
    light = wet * (.5 + .5 * np.sin(x / w * 21 + phase * TAU + y / 13)) * .075
    a[:, :, :3] *= 1 + light[:, :, None]
    frame = Image.fromarray(np.uint8(np.clip(a, 0, 255)))
    if ship:
        # Very small flex of rigging only. Lower hull/feet remain registered.
        yy = np.arange(h)
        shifts = np.rint(1.5 * math.sin(phase * TAU) * np.clip(1 - yy / (h * .4), 0, 1)**2).astype(int)
        arr = np.array(frame)
        for row, shift in enumerate(shifts):
            if shift:
                arr[row] = np.roll(arr[row], shift, axis=0)
                if shift > 0: arr[row, :shift] = 0
                else: arr[row, shift:] = 0
        frame = Image.fromarray(arr)
    return frame


def effect(kind, p, seed):
    w, h = 192, 80
    im = Image.new('RGBA', (w, h))
    d = ImageDraw.Draw(im)
    if kind == 'reflexo':
        for j in range(14):
            y = 5 + j * 5
            half = (1 - j / 19) * (22 + 9 * math.sin(j * 2.1 + seed))
            cx = 96 + math.sin(j * 1.7 + p * TAU) * (5 + j * .5)
            color = (255, 163, 91, int((1 - j / 15) * 78)) if seed == 0 else (128, 120, 214, int((1 - j / 15) * 62))
            d.line((cx-half, y, cx+half, y), fill=color, width=2)
    elif kind == 'mar':
        for j in range(6):
            pts = [(x, 12 + j*10 + 3*math.sin(x/21 + p*TAU + j + seed)) for x in range(8+j*3, 184-j*3, 2)]
            d.line(pts, fill=(89, 152, 194, 34 + j*5) if seed == 0 else (189, 68, 194, 28+j*5), width=1)
    else:
        # Periodic segmented foam rings, no random per-frame flicker or seam.
        for j in range(3):
            q = (p + j/3 + seed*.13) % 1
            alpha = int(math.sin(q*math.pi)**1.4 * (150 if kind == 'proa' else 105))
            rx, ry = 27 + q*65, 6 + q*25
            for k in range(7):
                start = k*53 + seed*17
                d.arc((96-rx, 40-ry, 96+rx, 40+ry), start, start+29, fill=(151, 204, 220, alpha), width=2)
        if kind == 'proa':
            for k in range(11):
                q = (p + k*.073) % 1
                alpha = int(math.sin(q*math.pi)*120)
                x = 96 + (k-5)*q*6
                y = 42 - math.sin(q*math.pi)*(8+(k%3)*6)
                d.ellipse((x,y,x+1,y+2), fill=(186,221,230,alpha))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    specs = []
    for name, size in [('pesqueiro',(610,568)), ('bote',(254,148))]:
        im = key(name, size)
        im.save(OUT / f'{name}-repouso.png', optimize=True)
        specs.append((name, size, lambda p, im=im, ship=name=='pesqueiro': hull(im,p,ship)))
    for kind in ['proa','popa','reflexo','mar']:
        for i, boat in enumerate(['pesqueiro','bote']):
            specs.append((f'{kind}-{boat}',(192,80),lambda p, kind=kind,i=i: effect(kind,p,i)))
    manifest = {'version':1,'frames':N,'columns':COLS,'cycleSeconds':6.4,'provenance':'Duas repinturas geradas; caústica/cordame e oito folhas de efeitos procedurais. Balanço rígido no runtime.', 'sheets':{}}
    for name, (w,h), render in specs:
        atlas = Image.new('RGBA',(w*COLS,h*math.ceil(N/COLS)))
        for f in range(N): atlas.paste(render(f/N),((f%COLS)*w,(f//COLS)*h))
        atlas.save(OUT / f'{name}.webp',lossless=True,method=6)
        manifest['sheets'][name]={'w':w,'h':h,'file':f'{name}.webp'}
        print(name, atlas.size)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')


if __name__ == '__main__': main()
