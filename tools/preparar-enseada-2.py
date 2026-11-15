from collections import deque
from pathlib import Path
import sys
from PIL import Image

src = Path('assets/source-art/enseada-2')
dst = Path('assets/sprites/enseada-2')
dst.mkdir(parents=True, exist_ok=True)


def remove_border_bg(image, mode='dark'):
    pixels = image.load()
    w, h = image.size
    visited = bytearray(w * h)
    q = deque()

    def is_bg(r, g, b, a):
        if a == 0:
            return True
        if mode == 'white':
            return min(r, g, b) > 218 and max(r, g, b) - min(r, g, b) < 28
        return r < 24 and g < 24 and b < 24

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b, a):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b, a):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))

    while q:
        cx, cy = q.popleft()
        pixels[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    r, g, b, a = pixels[nx, ny]
                    if is_bg(r, g, b, a):
                        visited[idx] = 1
                        q.append((nx, ny))


def remove_enclosed_white_pockets(image, min_area=40):
    pixels = image.load()
    w, h = image.size
    visited = bytearray(w * h)

    def is_pure_white(r, g, b, a):
        return a > 0 and min(r, g, b) >= 244 and max(r, g, b) - min(r, g, b) <= 12

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx] or not is_pure_white(*pixels[x, y]):
                continue
            comp = []
            q = deque([(x, y)])
            visited[idx] = 1
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and is_pure_white(*pixels[nx, ny]):
                            visited[nidx] = 1
                            q.append((nx, ny))
            if len(comp) >= min_area:
                for cx, cy in comp:
                    pixels[cx, cy] = (0, 0, 0, 0)
                    for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                        if 0 <= nx < w and 0 <= ny < h:
                            r, g, b, a = pixels[nx, ny]
                            if a > 0 and min(r, g, b) > 215 and max(r, g, b) - min(r, g, b) < 26:
                                pixels[nx, ny] = (0, 0, 0, 0)


SPECS = {
    'embarcadouro-mare-astral': 210,
    'espelho-eco-arquetipo': 200,
    'relogio-mare-solar': 170,
    'ninho-tartarugas-praia': 185,
    'poleiro-aves-costeiro': 185,
    'banco-areia-conchas': 195,
    'lanterna-marinha-flutuante': 130,
    'fonte-termal-enseada': 200,
    'banco-ostras-perola': 180,
    'carrilhao-vento-bambu': 190,
    # Lote #5
    'portal-caminho-correntes': 210,
    'portico-trilha-praia': 200,
    'barco-expedicao-enseada': 220,
    'santuario-lumeo-pedra': 185,
    'acampamento-vigilia-fogueira': 200,
    'torre-antena-escuta': 210,
    'farolete-baia-enseada': 210,
    'bancada-campo-arquetipos': 195,
    'baliza-mare-boia': 155,
    'totem-eco-instavel': 190,
}

only = set(sys.argv[1:])
for name, max_dim in SPECS.items():
    if only and name not in only:
        continue
    path = src / f'{name}.png'
    if not path.exists():
        continue
    image = Image.open(path).convert('RGBA')
    remove_border_bg(image, 'dark')
    remove_border_bg(image, 'white')
    if name in ('carrilhao-vento-bambu', 'santuario-lumeo-pedra'):
        remove_enclosed_white_pockets(image)
    box = image.getbbox()
    if not box:
        raise ValueError(f'Sprite vazio: {name}')
    image = image.crop(box)
    image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)
