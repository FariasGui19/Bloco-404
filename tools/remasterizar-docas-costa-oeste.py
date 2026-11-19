"""Repinta a arte do setor oeste sem mudar a planta ou a transparência.
Uso: python tools/remasterizar-docas-costa-oeste.py /caminho/para/image-2.png
Requer Pillow e NumPy. Os doadores já registrados ficam em assets/source-art.
"""
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/source-art/docas-costa-oeste'
DENSITY = 2
LANCZOS = Image.Resampling.LANCZOS
BOXES = {
    'mar': (0, 0, 955, 895), 'areia': (120, 103, 925, 526),
    'promontorio': (128, 123, 281, 282), 'quebra-mar': (112, 239, 309, 341),
    'laje-mare': (403, 352, 507, 419), 'pedras-atracacao': (738, 390, 891, 515),
    'musgo-promontorio': (165, 68, 334, 168), 'palmeiras': (300, 0, 517, 262),
    'cristais': (360, 143, 569, 312), 'tentaculo': (100, 441, 277, 592),
}


def load_preparer():
    spec = importlib.util.spec_from_file_location('costa', Path(__file__).with_name('preparar-docas-costa-oeste.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def array(img):
    return np.asarray(img, dtype=np.float32)


def as_image(values):
    return Image.fromarray(np.uint8(np.rint(np.clip(values, 0, 255))))


def weights(mask):
    return array(mask)[..., None] / 255


def detail_patch(source, size):
    # Mirror only the high-frequency signal, never the light/objects in the
    # donor. No repeating bright wakes are added to the coast's silhouette.
    source = source.convert('L').resize((438, 175), LANCZOS)
    high = array(source) - array(source.filter(ImageFilter.GaussianBlur(2.4)))
    double = np.concatenate([high, high[:, ::-1]], axis=1)
    mirror = np.concatenate([double, double[::-1]], axis=0)
    w,h = size
    return np.tile(mirror, (1+h//mirror.shape[0], 1+w//mirror.shape[1]))[:h,:w]


def grain(img, seed, density):
    rng = np.random.default_rng(seed)
    flecks = Image.new('L',img.size,128)
    draw = ImageDraw.Draw(flecks)
    w,h = img.size
    for x,y,c in zip(rng.integers(0,w,w*h//density), rng.integers(0,h,w*h//density), rng.integers(0,2,w*h//density)):
        radius = 1 if rng.random()<.82 else 2
        # Two-tone deposits read as material rather than pixel noise.
        draw.ellipse((x,y,x+radius,y+radius//2), fill=108 if c else 151)
        if radius==2:
            draw.point((x,y-1), fill=144)
    return array(flecks.filter(ImageFilter.GaussianBlur(.44))) - 128


def paint(name, sprite, donor, water_detail):
    size = tuple(n*DENSITY for n in sprite.size)
    enlarged = sprite.resize(size,LANCZOS)
    alpha = enlarged.getchannel('A')
    # Protect anti-aliased silhouettes from background paint and sharpen only
    # their interior. Landscape masks deliberately keep their original falloff.
    solid = weights(alpha.filter(ImageFilter.MinFilter(7)))
    flat = enlarged.convert('RGB')
    rgb = array(flat)
    base = rgb.copy()
    if name in BOXES:
        repainted = array(donor.crop(tuple(n*DENSITY for n in BOXES[name])))
        delta = np.mean(np.abs(repainted-rgb),axis=2,keepdims=True)
        if name == 'mar':
            # Exclude the authored cleaning patch under the animated creature;
            # its old body must never reappear behind the 32 poses.
            mask = Image.new('L',size,255)
            ImageDraw.Draw(mask).ellipse((151,865,575,1256),fill=0)
            gate = weights(mask.filter(ImageFilter.GaussianBlur(13)))
            mix = .87*gate*np.clip((82-delta)/57,0,1)
        elif name == 'areia':
            # Only transfer material where sand already exists; reject nearby
            # rock, vegetation and cabin details in the registered artwork.
            mix = .58*np.clip((42-delta)/27,0,1)
        else:
            mix = .88*np.clip((99-delta)/63,0,1)
        rgb = rgb + (repainted-rgb)*mix*(solid if name not in ('mar','areia') else 1)

    # Target two scales of painted detail, not a hard sharpen on every edge.
    fine = rgb-array(as_image(rgb).filter(ImageFilter.GaussianBlur(1.35)))
    fine = np.clip(fine,-22,22)
    broad = rgb-array(as_image(rgb).filter(ImageFilter.GaussianBlur(4)))
    rgb += fine*.88 + np.clip(broad,-15,15)*.19
    if name == 'mar':
        ripples = detail_patch(water_detail,size)[...,None]
        rgb += np.clip(ripples,-15,20) * [.37,.65,.80]
    if name in ('areia','escada-oeste'):
        grit = grain(flat,404 if name=='areia' else 457,8)[...,None]
        rgb += grit * ([.68,.53,.47] if name=='areia' else [.76,.83,1.01])
    lum = rgb[...,0:1]*.21 + rgb[...,1:2]*.72 + rgb[...,2:3]*.07
    saturation = {'mar':1.16,'areia':1.09,'cristais':1.10,'tentaculo':1.18,'palmeiras':1.14}.get(name,1.12)
    rgb = lum+(rgb-lum)*saturation
    rgb += 4.1*np.sin(np.clip(lum,0,255)*np.pi/255)
    rgb = base+(rgb-base)*np.clip(solid*1.7,0,1) if name not in ('mar','areia') else rgb
    enhanced = as_image(rgb).convert('RGBA')
    enhanced.putalpha(alpha)
    # PNGs stay compact: the original landscape masks have large clear areas.
    clear = alpha.point(lambda p:255 if p else 0)
    result = Image.new('RGBA',size)
    result.paste(enhanced,(0,0),clear)
    return result


def main(reference):
    base = load_preparer()
    base.art = Image.open(reference).convert('RGB')
    if base.art.size != (956,926):
        raise SystemExit('Esperado o recorte de referência de 956 × 926.')
    write = base.save
    sprites = {}
    base.save = sprites.__setitem__
    base.scenery()
    base.sea()
    base.sand()
    base.stair()
    sprites['tentaculo'] = base.tentacle_pose()
    with Image.open(SOURCES/'repintura-registrada.webp') as donor, Image.open(SOURCES/'microondas.webp') as detail:
        for name,sprite in sprites.items():
            painted = paint(name,sprite,donor,detail)
            if name == 'tentaculo':
                painted = base.tentacle_atlas(painted,DENSITY,frames=64)
            if name in ('mar','areia'):
                painted.save(base.OUT/(name+'.webp'),quality=94,alpha_quality=100,method=6)
            else:
                write(name,painted)


if __name__=='__main__':
    main(sys.argv[1])
