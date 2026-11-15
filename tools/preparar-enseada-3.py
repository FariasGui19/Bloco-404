"""Remove the generated gray checkerboards and crop the first 3 Enseada 3.0 assets.

The generator rendered transparency as a checkerboard pattern in RGB. These
background colors are keyed by their neutral-gray values (the sprites' own
colors are preserved), then the remaining alpha bounds are cropped tightly.
"""
from collections import deque
from pathlib import Path
from PIL import Image

SOURCE = Path('assets/source-art/enseada-3')
DEST = Path('assets/sprites/enseada-3')
DEST.mkdir(parents=True, exist_ok=True)

ASSETS = {
    'estacao-666-cliff-gate': (183, 227),
    'plateau-waterfall-wide': (197, 237),
    'reef-portal-arch': (71, 143),
    'western-grove-arch': (193, 255),
    'western-palm-grove': (193, 255),
    'echo-monolith-dais': (197, 239),
    'rock-pool-oasis': (71, 143),
    'wooden-pier-sailboat': (176, 228),
    'stone-path-cobble': (193, 255),
    'plateau-waterfall-wide-b': (193, 235),
}
TOLERANCE = 30
NEUTRAL_SPREAD = 28

for name, shades in ASSETS.items():
    image = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    pixels = image.load()
    w, h = image.size

    def is_background(r, g, b, a):
        if not a:
            return True
        if max(r, g, b) - min(r, g, b) > NEUTRAL_SPREAD:
            return False
        # The image model faked alpha with a gray checkerboard plus thin white
        # graph lines. Include both shades and their antialiased edge pixels.
        return any(abs(r - shade) <= TOLERANCE for shade in shades) or r >= 247 or r <= 14

    # The generated checkerboard was composited over the pier and sails too,
    # so those neutral squares are interior rather than flood-fillable. Remove
    # their two near-gray value bands; the real sail is warm cream and the pier
    # is brown, so neither is keyed by this narrow neutral-color test.
    if name == 'wooden-pier-sailboat':
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a and max(r, g, b) - min(r, g, b) <= 28 and any(abs(r - shade) <= TOLERANCE for shade in shades):
                    pixels[x, y] = (0, 0, 0, 0)

    visited = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_background(*pixels[x, y]):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_background(*pixels[x, y]):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and is_background(*pixels[nx, ny]):
                    visited[idx] = 1
                    queue.append((nx, ny))

    # Drop generated stray pixels and locate the core sprite. Related pieces
    # (for example detached coral and foam) are retained if they are large and
    # close to the main silhouette.
    alpha = image.getchannel('A')
    visited = bytearray(w * h)
    components = []
    for y in range(h):
        for x in range(w):
            first = y * w + x
            if visited[first] or alpha.getpixel((x, y)) == 0:
                continue
            queue = deque([(x, y)])
            visited[first] = 1
            points = []
            x0 = x1 = x
            y0 = y1 = y
            while queue:
                cx, cy = queue.popleft()
                points.append((cx, cy))
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1),
                               (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1), (cx + 1, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        idx = ny * w + nx
                        if not visited[idx] and alpha.getpixel((nx, ny)) > 0:
                            visited[idx] = 1
                            queue.append((nx, ny))
            components.append((len(points), (x0, y0, x1 + 1, y1 + 1), points))

    if not components:
        raise RuntimeError(f'{name}: background key removed all pixels')
    components.sort(key=lambda item: item[0], reverse=True)
    core = components[0][1]
    pad = 10
    keep_bounds = []
    for area, bounds, points in components:
        x0, y0, x1, y1 = bounds
        close_to_core = not (x1 < core[0] or x0 > core[2] or y1 < core[1] or y0 > core[3])
        # Tiny marks on the extreme left edge of these two renders are model
        # artifacts, not detached pieces of the pool or reef portal.
        edge_speck = name in {'rock-pool-oasis', 'reef-portal-arch'} and x0 <= w * 0.06 and area < 1_000
        if edge_speck or area < 20 or (area != components[0][0] and (area < 160 or not close_to_core)):
            for px, py in points:
                pixels[px, py] = (0, 0, 0, 0)
        else:
            keep_bounds.append(bounds)

    x0 = max(0, min(b[0] for b in keep_bounds) - pad)
    y0 = max(0, min(b[1] for b in keep_bounds) - pad)
    x1 = min(w, max(b[2] for b in keep_bounds) + pad)
    y1 = min(h, max(b[3] for b in keep_bounds) + pad)
    cropped = image.crop((x0, y0, x1, y1))
    # Remove the small glyph-like generation artifacts visible at the lower
    # left margins of these two source renders, without cropping their islands.
    cp = cropped.load()
    if name == 'rock-pool-oasis':
        for yy in range(440, min(475, cropped.height)):
            for xx in range(26, min(58, cropped.width)):
                cp[xx, yy] = (0, 0, 0, 0)
    elif name == 'reef-portal-arch':
        for yy in range(490, min(525, cropped.height)):
            for xx in range(min(26, cropped.width)):
                cp[xx, yy] = (0, 0, 0, 0)
    cropped.save(DEST / f'{name}.png', optimize=True)
    print(f'{name}: {w}x{h} -> {cropped.width}x{cropped.height}')
