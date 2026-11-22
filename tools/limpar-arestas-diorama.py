"""Remove resíduo magenta das bordas; nunca regrava folhas originais do mapa.
Requer Pillow. Os painéis ilustrados devem estar previamente com alfa no fundo.
"""
from PIL import Image
from pathlib import Path
root=Path('assets/sprites/enseada-fpv-polimento')
items=[(root/'moldura-fonte.png', root/'moldura-fonte.png'),(root/'moldura-gruta.png',root/'moldura-gruta.png'),
       (Path('assets/sprites/enseada-animacao-lote6/mata-densa.png'),root/'mata-sem-franja.png'),
       (Path('assets/sprites/enseada-animacao-lote7/palmeira-alta.png'),root/'palmeira-sem-franja.png')]
for src,dst in items:
 im=Image.open(src).convert('RGBA');px=im.load(); w,h=im.size
 # Só altera tons contaminados pelo magenta próximos ao alfa. Escurece os
 # pixels em vez de abrir um halo transparente na borda texturizada.
 for y in range(h):
  for x in range(w):
   r,g,b,a=px[x,y]
   if not (a and r>40 and b>40 and g<r*.48 and g<b*.48): continue
   if not any(0<=x+dx<w and 0<=y+dy<h and px[x+dx,y+dy][3]==0 for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-2,0),(2,0),(0,-2),(0,2))): continue
   px[x,y]=(min(r,g+15),g,min(b,g+17),a)
 im.save(dst,optimize=True)
 print(dst)
