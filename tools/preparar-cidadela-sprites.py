"""Recorta fundos gerados e gera sprites pequenos RGBA para o raycaster.
Requer Pillow. Os originais ficam em assets/source-art/cidadela-404.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

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

# Efeitos pequenos. O croma mais seletivo preserva os roxos de Domínio e do
# projétil; a versão de Núcleo chegou dentro de um falso quadriculado.
for name in ['disparo-mare','disparo-nucleo','disparo-dominio','disparo-bio',
             'selo-mare','selo-nucleo','selo-dominio','selo-bio',
             'projetil-echo','projetil-orbe']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name == 'selo-nucleo': image=image.crop((493,175,915,610))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>185 and b>185 and g<85 and abs(r-b)<55:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((128,128), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

# Adereços e personagens da exploração após o reator ser estabilizado.
for name in ['nexo-sonda','baliza-escuta','rele-emergencia','rele-ativo',
             'fragmento-sinal','painel-transmissao','registro-sobrevivente','nucleo-estavel']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((160,160), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

# As duas imagens de passagem são exibidas só durante a troca dimensional.
cutscenes=Path('assets/cutscenes')
cutscenes.mkdir(parents=True,exist_ok=True)
for source,target in [('transicao-travessia','cidadela-transicao-entrada'),('transicao-retorno','cidadela-transicao-retorno')]:
    image=Image.open(src / f'{source}.png').convert('RGB')
    image.thumbnail((1280,720), Image.Resampling.LANCZOS)
    image.save(cutscenes / f'{target}.jpg',quality=83,optimize=True,progressive=True)
    print(target,image.size)

# Fendas opcionais, cofres, impacto e poses de colapso.
for name in ['fenda-instavel','fenda-selada','cofre-fechado','cofre-aberto',
             'imp-colapso','orbe-colapso','echovore-colapso','impacto-disparo',
             'onda-fenda','terminal-estabilizacao']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name == 'fenda-instavel':
        # O original veio cortado nas bordas. Isola o anel central completo
        # e remove o campo externo para não ocupar toda a visão do jogador.
        image=image.crop((450,70,960,695))
        mask=Image.new('L', image.size, 0)
        ImageDraw.Draw(mask).ellipse((5,5,image.width-5,image.height-5), fill=255)
        image.putalpha(ImageChops.multiply(image.getchannel('A'),mask))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((160,160),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Poses de caminhada/hover, dois quadros CRT e pulsos de equipamentos.
for name in ['imp-passo-a','imp-passo-b','echovore-passo-a','echovore-passo-b',
             'orbe-movimento-a','orbe-movimento-b','nulo-transmissao-a','nulo-transmissao-b',
             'reator-pulso','gerador-pulso']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Ícones da progressão local. Alguns originais vieram com múltiplas peças
# ou um quadro quadriculado falso; isola-se somente a figura central.
for name in ['progressao-mare-corrente','progressao-mare-sonar',
             'progressao-nucleo-vetor','progressao-nucleo-carga',
             'progressao-dominio-corte','progressao-dominio-guarda',
             'progressao-bio-blindagem','progressao-bio-reparo',
             'progressao-emblema','progressao-nexo']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name=='progressao-dominio-corte': image=image.crop((400,70,1000,675))
    if name=='progressao-bio-blindagem': image=image.crop((440,0,970,768))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>185 and b>185 and g<85 and abs(r-b)<55:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Ícone vazio: {name}')
    image=image.crop(box)
    image.thumbnail((96,96),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Ecos, estação de escuta e detalhes ambientais desta visita. A arte do
# terminal ativo contém três gabinetes; conserva apenas o gabinete central.
for name in ['eco-ressonante','eco-liberado','ancora-silencio','ancora-ativa',
             'gravador-perdido','mapa-sinal','terminal-ecos','terminal-ecos-ativo',
             'luz-emergencia','rele-memoria']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name=='terminal-ecos-ativo': image=image.crop((510,0,900,768))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>100 and b>100 and g<90 and min(r,b)-g>70:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((160,160),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Quadros adicionais priorizam avisos de ataque e estados interativos. No
# original da fenda, só o anel interior está completo; o restante veio cortado.
for name in ['imp-ataque-b','orbe-ataque-b','echovore-ataque-b','vigilante-ataque-b',
             'fenda-aviso','terminal-escuta-pulso-a','terminal-escuta-pulso-b',
             'portal-pulso-a','portal-pulso-b','eco-ressonante-pulso']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name=='fenda-aviso':
        image=image.crop((355,5,1050,735))
        mask=Image.new('L',image.size,0)
        ImageDraw.Draw(mask).ellipse((1,1,image.width-2,image.height-2),fill=255)
        image.putalpha(ImageChops.multiply(image.getchannel('A'),mask))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Quadro vazio: {name}')
    image=image.crop(box)
    image.thumbnail((192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Novos elementos da oficina: controles, emissores, núcleo e vestígios.
for name in ['vigilia-controle-off','vigilia-controle-on','vigilia-pulso-aviso',
             'vigilia-pulso-ativo','vigilia-terminal','vigilia-nucleo-apagado',
             'vigilia-nucleo-vivo','vigilia-tubos','vigilia-bancada','vigilia-sentinela']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>100 and b>100 and g<90 and min(r,b)-g>70:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((160,160),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Quadros de retorno da arma, emblemas de habilidade, dano e passagem.
for name in ['base-canhao-mare-retorno','base-canhao-nucleo-retorno',
             'base-canhao-dominio-retorno','base-canhao-bio-retorno',
             'base-habilidade-mare','base-habilidade-nucleo',
             'base-habilidade-dominio','base-habilidade-bio',
             'base-dano-visor','base-travessia-anel']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=512 if name=='base-travessia-anel' else 256 if 'canhao' in name else 128
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Resposta de dano/queda e pictogramas da interface. A cruz veio cercada por
# margens brancas externas; recorte antes de remover o fundo magenta.
for name in ['refino-imp-dano','refino-orbe-dano','refino-echo-dano',
             'refino-imp-queda','refino-orbe-queda','refino-echo-queda',
             'refino-hud-vida','refino-hud-municao','refino-hud-energia','refino-hud-eco']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name=='refino-hud-vida':
        image=image.crop((int(image.width*.26),0,int(image.width*.74),image.height))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((128,128) if 'hud' in name else (192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Recarga, assistência visual e respostas de impacto. Todos os originais usam
# um fundo magenta; os PNGs finais têm transparência e carregamento tardio.
for name in ['acabamento-recarga-mare','acabamento-recarga-nucleo',
             'acabamento-recarga-dominio','acabamento-recarga-bio',
             'acabamento-suprimento','acabamento-escudo','acabamento-bloqueio',
             'acabamento-interacao','acabamento-impacto-metal','acabamento-impacto-escudo']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=256 if 'recarga' in name else 160 if 'suprimento' in name else 128
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Vistas direcionais aproximadas e estados do Vigilante. Os originais usam
# fundo magenta; a projeção continua billboard e espelha a vista lateral.
for name in ['vida-imp-lateral','vida-imp-costas','vida-orbe-lateral','vida-orbe-costas',
             'vida-echo-lateral','vida-echo-costas','vida-vigilante-aviso',
             'vida-vigilante-aberto-a','vida-vigilante-aberto-b','vida-vigilante-dano']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>110 and b>110 and g<85 and min(r,b)-g>85:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=256 if 'vigilante' in name else 192
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Refino das passadas direcionais: um perfil aproximado do Imp, seis
# laterais em movimento e três quadros de costas para alternar com o repouso.
# O magenta gerado possui um gradiente claro nos cantos; o limiar também
# remove esse fundo, evitando margens falsas na caixa do sprite.
for name in ['passada-imp-lateral','passada-imp-lateral-a','passada-imp-lateral-b','passada-imp-costas',
             'passada-echo-lateral-a','passada-echo-lateral-b','passada-echo-costas',
             'passada-orbe-lateral-a','passada-orbe-lateral-b','passada-orbe-costas']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>140 and b>140 and g<160 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Rastro final de disparo/habilidade e sinais confinados ao ecrã dos CRTs.
for name in ['polimento-disparo-mare','polimento-disparo-nucleo','polimento-disparo-dominio','polimento-disparo-bio',
             'polimento-habilidade-mare','polimento-habilidade-nucleo','polimento-habilidade-dominio','polimento-habilidade-bio',
             'polimento-crt-escuta','polimento-crt-eco']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>140 and b>140 and g<150 and min(r,b)-g>65:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((128,128),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Poses direcionais de aviso/dano e o sinal de ressonância elevada.
for name in ['combate-imp-lateral-aviso','combate-imp-costas-aviso','combate-imp-lateral-dano',
             'combate-orbe-lateral-aviso','combate-orbe-costas-aviso','combate-orbe-lateral-dano',
             'combate-echo-lateral-aviso','combate-echo-costas-aviso','combate-echo-lateral-dano',
             'combate-eco-alerta']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>140 and b>140 and g<160 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=128 if name=='combate-eco-alerta' else 192
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Queda direcional, reação vista de costas e preparação final do Vigilante.
for name in ['fecho-imp-costas-dano','fecho-imp-lateral-queda','fecho-imp-costas-queda',
             'fecho-orbe-costas-dano','fecho-orbe-lateral-queda','fecho-orbe-costas-queda',
             'fecho-echo-costas-dano','fecho-echo-lateral-queda','fecho-echo-costas-queda',
             'fecho-vigilante-aviso']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>140 and b>140 and g<160 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Colapsos direcionais e identidade visual dos arquivos opcionais.
for name in ['memoria-imp-lateral-colapso','memoria-imp-costas-colapso',
             'memoria-orbe-lateral-colapso','memoria-orbe-costas-colapso',
             'memoria-echo-lateral-colapso','memoria-echo-costas-colapso',
             'memoria-arquivo-origem','memoria-arquivo-retorno',
             'memoria-arquivo-memoria','memoria-arquivo-lido']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>140 and b>140 and g<160 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=128 if name=='memoria-arquivo-lido' else 192
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Preparação/disparo de inimigos e quadros intermediários dos módulos.
for name in ['ritmo-imp-carga','ritmo-imp-disparo','ritmo-orbe-carga','ritmo-orbe-disparo',
             'ritmo-echo-carga','ritmo-echo-disparo','ritmo-habilidade-mare',
             'ritmo-habilidade-nucleo','ritmo-habilidade-dominio','ritmo-habilidade-bio']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            # Preserva os violetas do efeito de Domínio.
            if r>185 and b>185 and g<100 and abs(r-b)<55:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=128 if name.startswith('ritmo-habilidade-') else 192
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Reações de disparo em perfil/costas e armas durante recarga interrompida.
for name in ['resposta-imp-lateral-disparo','resposta-imp-costas-disparo',
             'resposta-orbe-lateral-disparo','resposta-orbe-costas-disparo',
             'resposta-echo-lateral-disparo','resposta-echo-costas-disparo',
             'resposta-recarga-mare','resposta-recarga-nucleo',
             'resposta-recarga-dominio','resposta-recarga-bio']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>185 and b>185 and g<100 and abs(r-b)<55:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    image.thumbnail((192,192),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Marcos do radar e terminais de registro disponíveis nesta rodada.
for name in ['rota-terminal-amarela','rota-terminal-vermelha','rota-icone-azul',
             'rota-icone-amarela','rota-icone-reator','rota-icone-saida',
             'rota-icone-guia','rota-icone-diario']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>95 and b>95 and g<145 and min(r,b)-g>55:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=192 if name.startswith('rota-terminal-') else 96
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Terminal azul e ícone vermelho pendentes, colapso/escudo do Vigilante,
# célula de energia, drops de craft, bancada de síntese e pulso da sonda.
for name in ['rota-terminal-azul','rota-icone-vermelha','vigilante-queda','vigilante-colapso',
             'vigilante-escudo-impacto','suprimento-energia','drop-sucata-codigo',
             'drop-nucleo-estatica','bancada-sintese','sonda-nexo-pulso']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    if name=='vigilante-colapso':
        # Remove a faixa estreita de piso sob os joelhos antes do recorte.
        image=image.crop((0,0,image.width,int(image.height*0.925)))
    elif name=='vigilante-escudo-impacto':
        image=image.crop((0,0,image.width,int(image.height*0.94)))
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>120 and b>120 and g<150 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=96 if name=='rota-icone-vermelha' else 256 if name.startswith('vigilante-') else 192 if name in ('rota-terminal-azul','bancada-sintese') else 160
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

# Barril de estática e explosão, escudo de campo, Vigilante Fase 2, terminal
# de ronda, sentinela ativa, reator estável, Imp de elite e quadro de entrada.
for name in ['barril-estatica','barril-explosao','escudo-campo','vigilante-sobretensao',
             'terminal-ronda','vigilia-sentinela-ativo','prop-reator-estavel',
             'imp-elite','imp-elite-ataque']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>120 and b>120 and g<150 and min(r,b)-g>60:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=256 if name=='vigilante-sobretensao' else 224 if name in ('prop-reator-estavel','imp-elite','imp-elite-ataque') else 192 if name in ('terminal-ronda','barril-explosao') else 160
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

cutscenes = Path('assets/cutscenes')
cutscenes.mkdir(parents=True, exist_ok=True)
entry_art = Image.open(src / 'cidadela-entrada-corredor.jpg').convert('RGB')
entry_art.thumbnail((1280, 720), Image.Resampling.LANCZOS)
entry_art.save(cutscenes / 'cidadela-entrada-corredor.jpg', quality=88, optimize=True)
print('cidadela-entrada-corredor.jpg', entry_art.size)

# Lote 3: parede da Oficina, Vigilante acorrentado, treino e transmissor ativos,
# projétil e colapso do elite, pulso cinético, ícones de relíquias e retorno pós-vitória.
wall_workshop = Image.open(src / 'parede-oficina.png').convert('RGB')
side = min(wall_workshop.size)
left = (wall_workshop.width - side) // 2
top = (wall_workshop.height - side) // 2
wall_workshop = wall_workshop.crop((left, top, left + side, top + side)).resize((128, 128), Image.Resampling.LANCZOS)
wall_workshop.save(dst / 'parede-oficina.png', optimize=True)
print('parede-oficina', wall_workshop.size)

for name in ['vigilante-inerte-acorrentado','nucleo-treino-ativo','painel-transmissor-ativo',
             'projetil-elite','imp-elite-colapso','golpe-cinetico-pulso',
             'reliquia-selo-codigo','reliquia-nucleo-vigilante']:
    image=Image.open(src / f'{name}.png').convert('RGBA')
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            if r>160 and b>160 and g<110 and min(r,b)-g>90:
                pixels[x,y]=(0,0,0,0)
    box=image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image=image.crop(box)
    size=256 if name=='vigilante-inerte-acorrentado' else 192 if name in ('nucleo-treino-ativo','painel-transmissor-ativo','imp-elite-colapso','golpe-cinetico-pulso') else 128
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png',optimize=True)
    print(name,image.size)

return_art = Image.open(src / 'cidadela-retorno-estavel.jpg').convert('RGB')
return_art.thumbnail((1280, 720), Image.Resampling.LANCZOS)
return_art.save(cutscenes / 'cidadela-retorno-estavel.jpg', quality=88, optimize=True)
print('cidadela-retorno-estavel.jpg', return_art.size)

# Lote 4: direcionais e dano do elite, parede da Arena do Reator, registros distintos,
# ícones de materiais para HUD/Códex, aviso do núcleo do Vigilante e travessia do anel.
from collections import deque

def remove_border_magenta(img):
    pixels = img.load()
    w, h = img.size
    visited = bytearray(w * h)
    q = deque()
    def is_bg(r, g, b):
        return r > 155 and b > 155 and g < 120 and min(r, b) - g > 75
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = pixels[x, y]
            if is_bg(r, g, b):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = pixels[x, y]
            if is_bg(r, g, b):
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
                    r, g, b, _ = pixels[nx, ny]
                    if is_bg(r, g, b):
                        visited[idx] = 1
                        q.append((nx, ny))

wall_arena = Image.open(src / 'parede-arena.png').convert('RGB')
side_a = min(wall_arena.size)
left_a = (wall_arena.width - side_a) // 2
top_a = (wall_arena.height - side_a) // 2
wall_arena = wall_arena.crop((left_a, top_a, left_a + side_a, top_a + side_a)).resize((128, 128), Image.Resampling.LANCZOS)
wall_arena.save(dst / 'parede-arena.png', optimize=True)
print('parede-arena', wall_arena.size)

for name in ['imp-elite-lateral','imp-elite-costas','imp-elite-dano',
             'registro-entrada','registro-forja',
             'drop-sucata-hud','drop-nucleo-hud','vigilante-nucleo-aviso']:
    image = Image.open(src / f'{name}.png').convert('RGBA')
    remove_border_magenta(image)
    px = image.load()
    for yy in range(image.height):
        for xx in range(image.width):
            r, g, b, a = px[xx, yy]
            if a == 0:
                continue
            if name == 'drop-nucleo-hud':
                if r > 155 and b > 155 and g < 110 and abs(r - b) < 38:
                    px[xx, yy] = (0, 0, 0, 0)
            elif r > 155 and b > 155 and g < 115 and min(r, b) - g > 75:
                px[xx, yy] = (0, 0, 0, 0)
    box = image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image = image.crop(box)
    size = 224 if name.startswith('imp-elite') else 160 if name.startswith('registro-') or name == 'vigilante-nucleo-aviso' else 96
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

crossing_art = Image.open(src / 'cidadela-travessia-anel.jpg').convert('RGB')
crossing_art.thumbnail((1280, 720), Image.Resampling.LANCZOS)
crossing_art.save(cutscenes / 'cidadela-travessia-anel.jpg', quality=88, optimize=True)
print('cidadela-travessia-anel.jpg', crossing_art.size)

# Lote 5: golpes [V] por arquétipo, sobrecarga E1M1, placa secreta, console do reator,
# piso da arena, troféu 100% da Cidadela e aurora da Estação 66.6 no retorno.
floor_arena = Image.open(src / 'piso-arena.png').convert('RGB')
side_f = min(floor_arena.size)
left_f = (floor_arena.width - side_f) // 2
top_f = (floor_arena.height - side_f) // 2
floor_arena = floor_arena.crop((left_f, top_f, left_f + side_f, top_f + side_f)).resize((128, 128), Image.Resampling.LANCZOS)
floor_arena.save(dst / 'piso-arena.png', optimize=True)
print('piso-arena', floor_arena.size)

for name in ['melee-mare','melee-nucleo','melee-dominio','melee-bio',
             'celula-sobrecarga-doom','placa-secreta-404','prop-console-reator','trofeu-cidadela-404']:
    image = Image.open(src / f'{name}.png').convert('RGBA')
    remove_border_magenta(image)
    px = image.load()
    for yy in range(image.height):
        for xx in range(image.width):
            r, g, b, a = px[xx, yy]
            if a > 0 and r > 155 and b > 155 and g < 115 and min(r, b) - g > 75:
                px[xx, yy] = (0, 0, 0, 0)
    box = image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image = image.crop(box)
    size = 192 if name.startswith('melee-') or name == 'prop-console-reator' else 160 if name == 'placa-secreta-404' else 128
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)

aurora_art = Image.open(src / 'cidadela-aurora-limiar.jpg').convert('RGB')
aurora_art.thumbnail((1280, 720), Image.Resampling.LANCZOS)
aurora_art.save(cutscenes / 'cidadela-aurora-limiar.jpg', quality=88, optimize=True)
print('cidadela-aurora-limiar.jpg', aurora_art.size)

# Lote 6: passadas/queda/ataque lateral do elite, ataque Fase 2 do Vigilante,
# piso da Oficina da Vigília e 4 explosões visuais exclusivas de Ultimate [F].
floor_office = Image.open(src / 'piso-oficina.png').convert('RGB')
side_o = min(floor_office.size)
left_o = (floor_office.width - side_o) // 2
top_o = (floor_office.height - side_o) // 2
floor_office = floor_office.crop((left_o, top_o, left_o + side_o, top_o + side_o)).resize((128, 128), Image.Resampling.LANCZOS)
floor_office.save(dst / 'piso-oficina.png', optimize=True)
print('piso-oficina', floor_office.size)

for name in ['imp-elite-passo-a','imp-elite-passo-b','imp-elite-lateral-ataque','imp-elite-queda',
             'vigilante-fase2-ataque','ultimate-mare','ultimate-nucleo','ultimate-dominio','ultimate-bio']:
    image = Image.open(src / f'{name}.png').convert('RGBA')
    remove_border_magenta(image)
    px = image.load()
    for yy in range(image.height):
        for xx in range(image.width):
            r, g, b, a = px[xx, yy]
            if a == 0:
                continue
            if name == 'ultimate-dominio':
                if r > 175 and b > 175 and g < 95 and abs(r - b) < 34:
                    px[xx, yy] = (0, 0, 0, 0)
            elif r > 155 and b > 155 and g < 115 and min(r, b) - g > 75:
                px[xx, yy] = (0, 0, 0, 0)
    box = image.getbbox()
    if not box: raise ValueError(f'Sprite vazio: {name}')
    image = image.crop(box)
    size = 256 if name == 'vigilante-fase2-ataque' else 224 if name.startswith('imp-elite') else 256
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    image.save(dst / f'{name}.png', optimize=True)
    print(name, image.size)



