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


def defringe_white_halo(image, passes=2):
    pixels = image.load()
    w, h = image.size
    for _ in range(passes):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                if min(r, g, b) > 195 and (max(r, g, b) - min(r, g, b)) < 38:
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] == 0:
                            to_clear.append((x, y))
                            break
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)


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
    # Lote #6
    'piscina-mare-viva': 200,
    'cais-madeira-pesca': 215,
    'coral-luminescente-azul': 185,
    'estela-navegadores': 205,
    'banco-algas-douradas': 180,
    'rede-cristal-ecos': 200,
    'gruta-concha-mar': 205,
    'jardim-pedras-equilibrio': 185,
    'bau-deriva-naufragio': 175,
    'caixa-suprimentos-mar': 175,
    # Lote #7 — Quadros B de animação + peças vivas de organização/orla
    'acampamento-vigilia-fogueira-b': 200,
    'portal-caminho-correntes-b': 210,
    'farolete-baia-enseada-b': 210,
    'totem-eco-instavel-b': 190,
    'carrilhao-vento-bambu-b': 190,
    'banco-algas-douradas-b': 180,
    'barco-expedicao-enseada-b': 220,
    'trilha-pedras-costa': 130,
    'cardume-orla-vivo': 140,
    'bandeirola-vento-expedicao': 185,
    # Lote #8 — Quadros B de estruturas/água + vida marinha/aérea
    'piscina-mare-viva-b': 200,
    'fonte-termal-enseada-b': 200,
    'espelho-eco-arquetipo-b': 200,
    'coral-luminescente-azul-b': 185,
    'rede-cristal-ecos-b': 200,
    'lanterna-marinha-flutuante-b': 130,
    'baliza-mare-boia-b': 155,
    'cais-madeira-pesca-b': 215,
    'ondulacao-mar-crista': 155,
    'borboletas-costa-vivas': 140,
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
    if name in (
        'carrilhao-vento-bambu', 'carrilhao-vento-bambu-b',
        'santuario-lumeo-pedra',
        'banco-algas-douradas', 'banco-algas-douradas-b',
        'barco-expedicao-enseada-b', 'bandeirola-vento-expedicao',
        'rede-cristal-ecos', 'rede-cristal-ecos-b', 'gruta-concha-mar',
    ):
        remove_enclosed_white_pockets(image, min_area=18)
    if name in (
        'coral-luminescente-azul', 'coral-luminescente-azul-b',
        'rede-cristal-ecos', 'rede-cristal-ecos-b',
        'banco-algas-douradas', 'banco-algas-douradas-b',
        'cardume-orla-vivo', 'ondulacao-mar-crista',
    ):
        defringe_white_halo(image, passes=3)
    if name == 'borboletas-costa-vivas':
        remove_enclosed_white_pockets(image, min_area=12)
        for _ in range(14):
            w_b, h_b = image.size
            px_b = image.load()
            to_del = []
            for yy in range(h_b):
                for xx in range(w_b):
                    r, g, b, a = px_b[xx, yy]
                    if a == 0:
                        continue
                    if min(r, g, b) > 196 and (max(r, g, b) - min(r, g, b)) < 58:
                        for nx, ny in ((xx - 1, yy), (xx + 1, yy), (xx, yy - 1), (xx, yy + 1)):
                            if 0 <= nx < w_b and 0 <= ny < h_b and px_b[nx, ny][3] == 0:
                                to_del.append((xx, yy))
                                break
            if not to_del:
                break
            for xx, yy in to_del:
                px_b[xx, yy] = (0, 0, 0, 0)
    box = image.getbbox()
    if not box:
        raise ValueError(f'Sprite vazio: {name}')
    image = image.crop(box)
    if name == 'ondulacao-mar-crista':
        # Dissolve cantos retos da placa inferior em transição orgânica na água.
        w_i, h_i = image.size
        px_i = image.load()
        for yy in range(int(h_i * 0.52), h_i):
            fy = (yy - h_i * 0.52) / max(1, h_i * 0.48)
            for xx in range(w_i):
                r, g, b, a = px_i[xx, yy]
                if a == 0:
                    continue
                if yy >= int(h_i * 0.88):
                    px_i[xx, yy] = (0, 0, 0, 0)
                    continue
                fx = abs(xx - w_i * 0.5) / (w_i * 0.5)
                fade = max(0.0, 1.0 - (fy * 1.25 + fx * 0.72 - 0.30))
                if fade < 1.0:
                    px_i[xx, yy] = (r, g, b, int(a * max(0.0, fade)))
    image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)
