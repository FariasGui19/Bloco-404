"""Key generated checker/flat backgrounds, trim, and publish Enseada 4.0 props."""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

SOURCE = Path('assets/source-art/enseada-4')
DEST = Path('assets/sprites/enseada-4')
DEST.mkdir(parents=True, exist_ok=True)

# Gray checkerboard tones or flat background colors seen in each generated image.
GRAY_BANDS = {
    'signal-watchtower': (54, 106),
    'expedition-tent': (159,),
    'stone-ring-campfire': (120, 170),
    'field-table-bench': (199,),
    'supply-crates': (221, 255),
    'trail-marker-sign': (73, 129),
    'beach-training-net': (154, 201),
    'zen-stone-cairn': (78, 132),
}
TOL = 36
SPREAD = 24

for path in sorted(SOURCE.glob('*.png')):
    name = path.stem
    image = Image.open(path).convert('RGBA')
    pix = image.load()
    w, h = image.size
    bands = GRAY_BANDS.get(name, ())

    def neutral_bg(r, g, b, a):
        if a == 0:
            return True
        if max(r, g, b) - min(r, g, b) > SPREAD:
            return False
        if bands and any(abs(r - value) <= TOL for value in bands):
            return True
        # Thin grid lines in these fake alpha previews are nearly pure black
        # or white, while the props use warm colored outlines and highlights.
        if max(r, g, b) <= 12 or min(r, g, b) >= 249:
            return True
        if name == 'shell-grotto' and r > 246 and g > 246 and b > 246:
            return True
        return False

    # The clock uses a saturated green checkerboard, unlike the neutral-gray
    # transparency mockups used by the other props.
    if name == 'coastal-clock-post':
        for y in range(h):
            for x in range(w):
                r, g, b, a = pix[x, y]
                if a and g > r + 20 and g > b + 15:
                    pix[x, y] = (0, 0, 0, 0)

    # Flood-fill neutral/green background from the border, then clear matching
    # interior checker squares (behind mesh, legs, and transparent cutouts).
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if neutral_bg(*pix[x, y]):
                i = y * w + x
                if not seen[i]: seen[i] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if neutral_bg(*pix[x, y]):
                i = y * w + x
                if not seen[i]: seen[i] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        pix[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny*w+nx
                if not seen[i] and neutral_bg(*pix[nx,ny]):
                    seen[i] = 1; q.append((nx,ny))
    # Remove the same checker colors even when the generated grid is enclosed
    # by a rope mesh or object silhouette. The art itself uses saturated/warm
    # colors; checking near-neutral values avoids keying wood, cloth, or stone.
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a and neutral_bg(r, g, b, a):
                pix[x, y] = (0, 0, 0, 0)

    # The generated outputs sometimes leave thin non-neutral grid lines outside
    # the subject. Establish the crop from the warm/saturated sprite silhouette,
    # not from those residual preview marks.
    subject = Image.new('L', (w, h), 0)
    sp = subject.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a and max(r, g, b) - min(r, g, b) > 28:
                sp[x, y] = 255
    bbox = subject.getbbox()
    if not bbox:
        raise RuntimeError(f'{name}: no colored subject pixels found')
    x0, y0, x1, y1 = bbox
    pad = 12
    image = image.crop((max(0,x0-pad), max(0,y0-pad), min(w,x1+pad), min(h,y1+pad)))
    if name == 'signal-watchtower':
        # The fake checker was painted as a warm circular halo around the
        # beacon. Remove its two flat swatches while retaining the saturated
        # red lantern, flame, ropes, and timber.
        p = image.load()
        # The model drew a checker halo behind the beacon. The lamp is an
        # isolated silhouette in the first 120 px of the cropped sprite; clip
        # to its traced outline so no mock-transparency cells remain there.
        lamp = Image.new('L', image.size, 0)
        ImageDraw.Draw(lamp).polygon([
            (134, 15), (157, 15), (164, 22), (169, 31), (171, 43),
            (177, 51), (177, 83), (172, 94), (165, 103), (127, 103),
            (120, 94), (116, 83), (116, 52), (123, 44), (124, 31), (128, 22),
        ], fill=255)
        for y in range(min(100, image.height)):
            for x in range(image.width):
                if (78 <= x <= 212 and not lamp.getpixel((x, y))):
                    p[x, y] = (0, 0, 0, 0)
    image.save(DEST / f'{name}.png', optimize=True)
    print(f'{name}: {w}x{h} -> {image.width}x{image.height}')
