#!/usr/bin/env python3
"""Isola peças das quatro referências JPEG de saguão; Pillow/NumPy/SciPy.
Fundo quadriculado está incorporado: limpeza aproximada, não alpha original.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import binary_propagation, label
R = Path(__file__).resolve().parent.parent
source=R/'assets/source-art/saguao'; out=R/'assets/sprites/saguao'

def clean(frame, dark=False):
    a=np.asarray(frame.convert('RGB')).astype(np.int16)
    hi=a.max(2); lo=a.min(2)
    candidate=(hi-lo <= (14 if dark else 18)) & (lo >= (19 if dark else 82)) & (hi <= (86 if dark else 211))
    seed=np.zeros(candidate.shape,bool); seed[0,:]=seed[-1,:]=True; seed[:,0]=seed[:,-1]=True
    bg=binary_propagation(seed & candidate, mask=candidate)
    fg=~bg
    # Evitar ruído solto do JPEG sem eliminar pequenos detalhes contíguos.
    labels,n=label(fg); sizes=np.bincount(labels.ravel()); keep=sizes>=18; keep[0]=False
    alpha=(keep[labels]*255).astype('uint8')
    return Image.fromarray(np.dstack((a.astype('uint8'),alpha)))

def norm(img,w,h, scale=1):
    box=img.getchannel('A').getbbox()
    if not box: return Image.new('RGBA',(w,h))
    im=img.crop(box); im.thumbnail((int(w*scale),int(h*scale)),Image.Resampling.LANCZOS)
    dst=Image.new('RGBA',(w,h)); dst.alpha_composite(im,((w-im.width)//2,h-im.height)); return dst

props=Image.open(source/'Gemini_Generated_Image_n8qochn8qochn8qo.jpg')
# Seleção de peças totalmente dentro das células: planta, lixeira, carrinho.
for name,c,r in [('vaso',1,1),('reciclagem',2,1),('carrinho',1,2),('bebedouro',2,2)]:
    cell=props.crop((c*300+4,r*299+4,(c+1)*300-4,min((r+1)*299-4,896)))
    norm(clean(cell),256,256,.95).save(out/f'{name}.png')

nexo=Image.open(source/'Gemini_Generated_Image_mwsl25mwsl25mwsl.jpg')
# Cinco quadros por direção na metade esquerda: frente, lado e costas.
atlas=Image.new('RGBA',(5*128,3*192))
for row in range(3):
 for col in range(5):
    frame=nexo.crop((round(col*126.4)+3,round(row*210.75)+3,round((col+1)*126.4)-3,round((row+1)*210.75)-3))
    atlas.alpha_composite(norm(clean(frame),128,192,.96),(col*128,row*192))
atlas.save(out/'nexo-caminhada.png')

trav=Image.open(source/'Gemini_Generated_Image_hbilpjhbilpjhbil.jpg')
# Segunda linha tem uma sequência frontal-lateral, terceira costas. Coluna 4 da
# segunda linha está invertida e é omitida; a última retorna à pose inicial.
atlas=Image.new('RGBA',(6*160,2*192))
for row,cols in enumerate([[0,1,2,3,2,1],[0,1,2,1,0,1]]):
 for i,col in enumerate(cols):
    frame=trav.crop((round(col*1365/8)+2,round((row+1)*192)+3,round((col+1)*1365/8)-2,round((row+2)*192)-3))
    atlas.alpha_composite(norm(clean(frame),160,192,.96),(i*160,row*192))
atlas.save(out/'viajante.png')

# Apenas painel; o portal na folha parece ativo mesmo quando o gate está fechado,
# e os quadros do projetor misturam transparências com quadriculado opaco.
panel=Image.open(source/'Gemini_Generated_Image_ptsx0eptsx0eptsx.jpg')
atlas=Image.new('RGBA',(8*160,176))
for col in range(8):
    frame=panel.crop((round(col*1365/8)+4,305,round((col+1)*1365/8)-4,482))
    atlas.alpha_composite(norm(clean(frame,True),160,176,.96),(col*160,0))
atlas.save(out/'painel-animado.png')
# Os cinco primeiros quadros mostram fluxo contido; os outros extrapolam a moldura.
atlas=Image.new('RGBA',(5*170,192))
for col in range(5):
    frame=panel.crop((round(col*1365/8)+2,552,round((col+1)*1365/8)-2,745))
    atlas.alpha_composite(norm(clean(frame,True),170,192,.97),(col*170,0))
atlas.save(out/'portal-animado.png')
# Aceno frontal e consulta lateral do tablet. O console cortado não é usado.
for name,row in [('nexo-aceno',0),('nexo-tablet',3)]:
    atlas=Image.new('RGBA',(5*128,192))
    for col in range(5):
        frame=nexo.crop((632+round(col*126.4)+3,605 if row == 3 else 3,632+round((col+1)*126.4)-3,843 if row == 3 else 207))
        atlas.alpha_composite(norm(clean(frame),128,192,.96),(col*128,0))
    atlas.save(out/f'{name}.png')
