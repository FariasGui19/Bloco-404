"""Recorta fundos gerados e gera sprites pequenos RGBA para o raycaster.
Requer Pillow. Os originais ficam em assets/source-art/cidadela-404.
"""
from collections import deque
from pathlib import Path
from PIL import Image

src = Path('assets/source-art/cidadela-404')
dst = Path('assets/sprites/cidadela-404')
dst.mkdir(parents=True, exist_ok=True)

# Os fundos são diferentes em cada original: verde, quadriculado e cinza.
def background(name, pixel):
    r, g, b = pixel[:3]
    if name == 'imp-glitch': return g > 110 and g > r * 1.6 and g > b * 1.6
    if name == 'vigilante': return min(r, g, b) > 175 and max(r, g, b)-min(r,g,b) < 18
    return 95 < r < 145 and 95 < g < 145 and 95 < b < 145 and max(r,g,b)-min(r,g,b) < 14

for name in ['imp-glitch', 'vigilante', 'cyber-orbe']:
    image = Image.open(src / f'{name}.png').convert('RGBA')
    w, h = image.size
    pixels = image.load()
    visited = bytearray(w*h)
    todo = deque()
    def enqueue(x,y):
        i=y*w+x
        if not visited[i] and background(name,pixels[x,y]):
            visited[i]=1; todo.append((x,y))
    for x in range(w): enqueue(x,0); enqueue(x,h-1)
    for y in range(h): enqueue(0,y); enqueue(w-1,y)
    while todo:
        x,y=todo.popleft(); pixels[x,y]=(0,0,0,0)
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h: enqueue(nx,ny)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((256,256), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

# Assets desta etapa usam fundo magenta explícito. A remoção por cor também
# limpa áreas fechadas, como o espaço dentro das alças dos canhões.
for name in ['canhao-mare', 'canhao-nucleo', 'canhao-dominio', 'canhao-bio',
             'terminal-memoria', 'portal-retorno', 'predador-echovore', 'monitor-nulo',
             'canhao-mare-recuo', 'canhao-nucleo-recuo', 'canhao-dominio-recuo', 'canhao-bio-recuo',
             'imp-ataque', 'orbe-ataque', 'echovore-ataque', 'vigilante-ataque', 'projetil-estatica',
             'prop-gerador', 'prop-caixa', 'prop-barril', 'prop-drone', 'prop-coluna',
             'prop-reator', 'prop-terminal', 'prop-antena', 'prop-ventilacao', 'prop-sinalizador']:
    image = Image.open(src / f'{name}.png').convert('RGBA')
    if name == 'prop-ventilacao':
        # Apenas uma das duas unidades geradas.
        image = image.crop((0, 0, image.width//2, image.height))
    if name == 'canhao-bio-recuo':
        # A chama foi gerada na lateral, fora da boca frontal: removê-la.
        image = image.crop((72, 0, image.width, image.height))
    if name == 'terminal-memoria':
        # O gerador devolveu três perspectivas; apenas a primeira é usada.
        image = image.crop((0, 0, 469, image.height))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    max_size = 160 if name.startswith('prop-') else 192 if name.endswith(('-recuo', '-ataque')) or name == 'projetil-estatica' else 256
    image.thumbnail((max_size,max_size), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

# Superfícies de parede não têm canal alfa. 128px já supera a resolução útil
# do framebuffer e evita baixar os originais de produção durante o jogo.
for name in ['parede-metal', 'parede-tijolo', 'parede-eclusa']:
    image=Image.open(src / f'{name}.png').convert('RGB').resize((128,128), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)
