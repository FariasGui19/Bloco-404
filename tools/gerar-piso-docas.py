#!/usr/bin/env python3
"""Textura de areia escura determinística para o piso da ilha; requer Pillow."""
from PIL import Image, ImageDraw, ImageFilter
import random
r=random.Random(404)
base=Image.new('RGB',(64,64));base.putdata([(r.randrange(48,84),r.randrange(43,70),r.randrange(53,79)) for _ in range(64*64)])
base=base.resize((512,512),Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(2))
d=ImageDraw.Draw(base,'RGBA')
for i in range(9500):
 x,y=r.randrange(512),r.randrange(512)
 color=r.choice([(183,166,158,32),(17,18,26,75),(117,111,116,40)])
 d.point((x,y),fill=color)
for i in range(1200):
 x,y=r.randrange(512),r.randrange(512);w=r.randrange(2,7);d.ellipse((x,y,x+w,y+max(1,w//3)), fill=(30,30,39,90));d.point((x,y),fill=(158,151,149,60))
base.save('assets/sprites/docas-reconstrucao/piso-areia.png',optimize=True)

# Reaproveitamento de flora existente, tingida para o clima noturno.
for nome,caminho in [('palmeira','assets/sprites/enseada-norte/palmeira-media.png'),('mata','assets/sprites/enseada-norte/arvores-redondas.png'),('caixas','assets/sprites/enseada-8/pilha-caixas-madeira-recortado.png')]:
 im=Image.open(caminho).convert('RGBA');r,g,b,a=im.split()
 im=Image.merge('RGBA',(r.point(lambda v:int(v*.38)),g.point(lambda v:int(v*.48)),b.point(lambda v:int(v*.8)),a))
 im.thumbnail((512,512),Image.Resampling.LANCZOS);im.save(f'assets/sprites/docas-reconstrucao/{nome}.png',optimize=True)
