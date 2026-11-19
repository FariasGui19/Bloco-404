#!/usr/bin/env python3
"""Remove a proa embutida no deck e fragmentos de estruturas nos reflexos.
Máscaras idempotentes em coordenadas dos recortes; não altera planta ou colisão.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
# Outline includes the old bow, its rim and the crate on that bow, not boards.
PROA_DECK=[(0,142),(46,137),(78,145),(111,154),(121,167),(119,189),(110,222),(97,250),(76,276),(0,224)]
AGUA_LIVRE=[(0,586),(600,586),(700,540),(1000,500),(1568,450),(1568,617),(0,617)]

def limpar():
    p=ROOT/'assets/sprites/docas-cais-sul'
    for name,poly,remove in [('deck',PROA_DECK,True),('reflexos',AGUA_LIVRE,False)]:
        source=ROOT/'assets/source-art/docas-pesqueiro-03/deck-antes.png' if name=='deck' else p/f'{name}.png'
        im=Image.open(source).convert('RGBA')
        mask=Image.new('L',im.size,255 if remove else 0)
        ImageDraw.Draw(mask).polygon(poly,fill=0 if remove else 255)
        if name=='deck':
            # Rebuild ONLY the walkable board surface hidden by the old bow.
            # Donor is another part of this same deck, no new generated style.
            floor=Image.new('L',im.size)
            ImageDraw.Draw(floor).polygon([(27,155),(147,106),(296,56),(456,10),(498,4),(579,29),(654,61),(552,114),(450,162),(334,216),(245,251),(152,276),(99,271),(31,223)],fill=255)
            hard=ImageChops.multiply(ImageChops.invert(mask),floor)
            feather=hard.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.GaussianBlur(4))
            patchmask=ImageChops.multiply(ImageChops.lighter(hard,feather),floor)
            donor=Image.new('RGBA',im.size)
            # Long-axis offset stays well inside the board plane, away from
            # posts/front fascia. The old short offset copied a dark edge.
            donor.paste(im,(-280,78))
            patchmask=ImageChops.multiply(patchmask,donor.getchannel('A'))
            im.putalpha(ImageChops.multiply(im.getchannel('A'),mask))
            im.paste(donor,(0,0),patchmask)
        else:
            im.putalpha(ImageChops.multiply(im.getchannel('A'),mask))
        # Do not leave invisible reference RGB in the corrected asset.
        out=Image.new('RGBA',im.size)
        out.paste(im,(0,0),im.getchannel('A').point(lambda a:255 if a else 0))
        out.save(p/f'{name}.png',optimize=True)
        print('limpo:',name)

if __name__=='__main__':limpar()
