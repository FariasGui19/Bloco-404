"""Prepara o segundo recorte das Docas. Requer Pillow.
Uso: python tools/preparar-docas-costa-oeste.py /caminho/para/image-2.png
Os recortes servem como material para as peças; a referência não entra no jogo.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

OUT = Path(__file__).resolve().parents[1] / 'assets/sprites/docas-costa-oeste'
S = 3
LANCZOS = Image.Resampling.LANCZOS


def poly(s):
    return [tuple(map(float, p.split(','))) for p in s.split()]


def mask(box, outlines, holes=()):
    x,y,r,b=box
    ma=Image.new('L',((r-x)*S,(b-y)*S))
    d=ImageDraw.Draw(ma)
    for value,paths in [(255,outlines),(0,holes)]:
        for path in paths:
            d.polygon([(round((u-x)*S),round((v-y)*S)) for u,v in poly(path)],fill=value)
    return ma.resize((r-x,b-y),LANCZOS)


def rgba(rgb, alpha):
    image=rgb.convert('RGBA')
    image.putalpha(alpha)
    # Transparent texels need not preserve the source photograph's RGB.
    blank=Image.new('RGBA',image.size)
    blank.paste(image,(0,0),alpha.point(lambda v:255 if v else 0))
    return blank


def save(name,image):
    image.save(OUT/(name+'.png'),optimize=True)


def cut(name,box,outlines,holes=()):
    img=rgba(art.crop(box),mask(box,outlines,holes))
    save(name,img)
    return img


def scenery():
    cut('promontorio',(128,123,281,282),[
        '130,194 142,178 148,162 151,145 167,136 187,130 208,136 224,129 236,137 248,150 246,177 263,182 267,202 278,221 272,252 247,267 220,264 206,278 183,276 164,268 153,273 131,260 131,241 145,230 158,215 148,205',
    ])
    cut('quebra-mar',(112,239,309,341),[
        '116,276 123,257 139,244 157,243 172,253 175,269 197,270 209,278 222,287 226,300 241,301 251,312 246,322 227,326 202,330 176,326 155,319 147,303 149,290 129,288',
        '255,320 265,309 276,300 286,301 296,307 303,317 302,326 277,330 257,326',
    ])
    cut('laje-mare',(403,352,507,419),[
        '405,391 414,379 420,372 432,360 453,357 464,364 468,374 482,378 488,389 501,397 495,405 483,411 458,415 436,410 414,410 405,402',
    ])
    cut('pedras-atracacao',(738,390,891,515),[
        '740,498 749,483 763,474 772,459 785,453 787,433 798,423 812,422 819,410 829,403 846,408 852,419 854,434 877,432 890,440 885,464 867,477 832,487 796,502 763,511 746,506',
    ])
    # Leaf silhouettes and trunks are cut separately; no hut behind them.
    palms=cut('palmeiras',(300,0,517,262),[
        '393,47 400,31 416,21 427,21 419,13 414,5 427,2 444,13 455,8 461,0 480,0 480,5 469,18 486,22 500,27 512,42 511,56 502,48 505,68 496,84 491,70 483,62 488,87 479,95 473,82 469,69 460,65 448,121 445,167 432,175 434,144 441,88 442,67 432,72 425,95 421,94 424,72 423,54 415,58 407,78 401,80 402,59 408,42 398,54',
        '303,123 307,105 320,94 327,85 338,83 351,88 362,87 368,77 385,76 397,83 388,95 395,93 411,93 426,108 423,116 413,109 399,108 411,117 420,133 414,145 405,135 397,128 400,149 391,158 385,146 383,126 375,125 378,151 382,173 390,202 397,223 411,248 400,254 387,230 381,211 374,190 363,158 360,137 354,123 349,131 348,153 341,166 334,155 333,132 324,143 317,157 309,146 313,126 308,124',
    ], ['443,63 448,57 449,65 440,79','360,122 366,127 371,143 369,150'])
    # Key lavender sky in the crown only, preserving shaded leaves and the
    # purple trunks below. The hand mask still defines the overall silhouette.
    alpha=palms.getchannel('A')
    a=alpha.load(); rgb=palms.load()
    for y in range(170):
        for x in range(alpha.width):
            r,g,b,_=rgb[x,y]
            leaf=(x<134 and y<165) or (x>=91 and y<100)
            if leaf and r>g-8 and b>g+22:
                a[x,y]=round(a[x,y]*max(0,min(1,(100-g)/38)))
    save('palmeiras',rgba(palms,alpha))
    cut('musgo-promontorio',(165,68,334,168),[
        '169,142 174,132 186,131 187,123 205,122 219,109 239,113 247,106 252,90 270,84 280,87 296,76 315,76 330,85 327,101 315,109 321,118 297,125 277,123 264,133 257,143 242,145 227,155 208,151 191,161 180,156',
    ])
    cut('cristais',(360,143,569,312),[
        '361,251 374,240 391,238 393,217 403,203 414,215 417,232 428,227 421,202 423,168 433,152 445,169 458,191 456,205 462,209 475,177 484,174 492,188 490,210 499,206 503,212 501,227 519,221 534,226 534,238 549,236 563,248 557,258 546,265 550,280 538,286 523,280 515,305 500,308 477,297 449,291 421,286 404,277 383,277 369,266',
    ])


def sea():
    box=(0,0,955,895)
    rgb=art.crop(box)
    # Only sea survives this silhouette. The east crossfade joins the old
    # berth's water without ever baking a second boat, mast or creature.
    edge=mask(box,['0,0 411,0 371,47 333,62 280,88 251,112 209,128 174,144 154,176 147,199 136,234 126,260 146,290 157,314 200,331 280,326 318,337 368,352 410,367 449,391 484,412 529,421 573,448 619,466 670,492 724,507 764,486 813,449 848,438 878,455 905,480 955,493 955,895 0,895'])
    hole=mask(box,['111,480 144,454 200,450 231,469 244,488 265,509 252,537 231,551 240,568 214,600 137,611 95,591 92,562 118,536 111,509'])
    # Patch the old creature with water of similar luminance, then the animated
    # atlas and wakes supply its own contact with the surface.
    patch=art.crop((42,609,229,773)).resize((190,171),LANCZOS)
    replacement=rgb.copy();replacement.paste(patch,(84,447))
    rgb=Image.composite(replacement,rgb,hole.filter(ImageFilter.GaussianBlur(10)))
    # Use the silhouettes of the already-shipped boat and pier as exclusion
    # masks, registered in the new recorte. Leaving a few pixels of clearance
    # prevents duplicate reflections of solid paint during heave.
    exclusion=Image.new('L',rgb.size)
    cais=OUT.parent/'docas-cais-sul'
    for name,x,y in [('pesqueiro',42,16),('amarracao',0,417),('deck',528,97),
                     ('guarda-fundo',638,13),('estaca-oeste',641,343),('estaca-meio',754,295),
                     ('rede',907,190),('boia-rede',567,465)]:
        with Image.open(cais/(name+'.png')) as img:
            a=img.getchannel('A').resize((round(img.width*.70),round(img.height*.70)),LANCZOS)
        layer=Image.new('L',rgb.size)
        layer.paste(a,(round(275+x*.70),round(390+y*.70)))
        exclusion=ImageChops.lighter(exclusion,layer)
    ma=ImageChops.subtract(edge.filter(ImageFilter.GaussianBlur(4)),
                           exclusion.filter(ImageFilter.MaxFilter(29)).filter(ImageFilter.GaussianBlur(5)))
    px=ma.load()
    for y in range(ma.height):
        for x in range(ma.width):
            t=max(0,min(1,x/66,y/48,(895-y)/71,(955-x)/160))
            px[x,y]=round(px[x,y]*t*t*(3-2*t)*.98)
    save('mar',rgba(rgb,ma))


def sand():
    box=(120,103,925,526)
    w,h=box[2]-box[0],box[3]-box[1]
    # Extract hue and grit from unoccupied sand; retain the exact tidal edge
    # only in the narrow strip with no props. Blend to the game's soil inland.
    grain=ImageOps.grayscale(art.crop((283,278,357,314)))
    grain=ImageOps.autocontrast(grain).resize((148,72),LANCZOS)
    tile=ImageOps.colorize(grain,'#6d526b','#c0938a')
    sand=Image.new('RGB',(w,h))
    for y in range(0,h,72):
        for x in range(0,w,148):sand.paste(ImageOps.mirror(tile) if (x//148+y//72)%2 else tile,(x,y))
    track=mask(box,['145,125 219,108 282,114 329,162 365,195 469,237 546,265 656,292 747,319 827,342 914,396 909,464 850,485 752,515 643,517 545,484 440,438 353,404 284,359 203,361 144,331 120,274 124,209'])
    texture=art.crop(box)
    clean=mask(box,['248,245 290,247 329,265 367,279 408,298 438,320 479,331 515,342 561,349 619,365 698,398 748,410 778,427 761,450 735,476 709,496 657,482 619,463 582,445 545,432 511,415 479,409 446,390 411,367 375,352 321,335 278,326 246,310 222,292 224,274'],[
        '395,389 418,365 433,352 464,350 491,369 510,400 500,423 459,426 425,421 399,410',
        '483,404 511,401 549,405 556,428 532,440 491,425',
    ])
    sand=Image.composite(texture,sand,clean.filter(ImageFilter.GaussianBlur(8)))
    alpha=track.filter(ImageFilter.GaussianBlur(23))
    px=alpha.load()
    for y in range(h):
        for x in range(w):
            t=min(1,(w-x-1)/105,y/30,(h-y-1)/30)
            px[x,y]=round(px[x,y]*t*t*(3-2*t))
    save('areia',rgba(sand,alpha))


def tentacle_pose():
    box=(100,441,277,592)
    outline='123,509 126,497 130,489 137,480 145,472 157,466 170,463 186,463 200,466 213,474 223,485 228,497 229,507 226,518 228,525 234,527 242,522 247,514 251,513 254,519 250,530 241,537 231,539 222,535 214,528 210,518 210,507 207,498 201,492 193,489 184,490 176,495 169,503 167,514 170,524 180,534 191,544 203,554 214,568 214,579 201,585 188,583 179,589 169,586 159,587 149,583 145,575 139,569 134,559 129,547 125,536'
    return rgba(art.crop(box),mask(box,[outline]))


def tentacle_atlas(img, density=1, frames=32, columns=8):
    w,h=img.size
    step=6*density
    atlas=Image.new('RGBA',(w*columns,h*math.ceil(frames/columns)))
    for frame in range(frames):
        phase=math.tau*frame/frames
        def inverse(x,y):
            x,y=x/density,y/density
            weight=max(0,min(1,(130-y)/110))**1.3
            tip=max(0,min(1,(x-70)/74))*weight
            # Two traveling bends, independent lift of the curled tip, and
            # a root held completely still across the entire loop.
            return ((x-weight*(7*math.sin(phase)+4*math.sin(phase*2)*weight)+3*tip*math.sin(phase))*density,
                    (y-11*tip*math.sin(phase)-3*weight*math.sin(2*phase)-5*weight*(1-math.cos(phase)))*density)
        cells=[]
        for y in range(0,h,step):
            for x in range(0,w,step):
                r,b=min(w,x+step),min(h,y+step)
                cells.append(((x,y,r,b),sum((inverse(u,v) for u,v in [(x,y),(x,b),(r,b),(r,y)]),())))
        frame_img=img.transform((w,h),Image.Transform.MESH,cells,Image.Resampling.BICUBIC)
        atlas.paste(frame_img,(frame%columns*w,frame//columns*h))
    return atlas


def stair():
    # The opposite cheek of the existing stair, in the first berth's local
    # coordinates. Foundation blocks sit below the treads, not on top of them.
    box=(982,26,1164,158)
    texture=ImageOps.autocontrast(ImageOps.grayscale(art.crop((432,371,480,402))))
    texture=texture.resize((182,132),LANCZOS)
    canvas=Image.new('RGBA',texture.size)
    rng=random.Random(1957)
    for i in range(8):
        x,y=1129-i*17,45+i*10
        for j in reversed(range(2)):
            a,b=x+j*3,y+j*9
            shape=f'{a-17},{b+2} {a-9},{b-5} {a+8},{b-6} {a+15},{b} {a+14},{b+8} {a+2},{b+13} {a-16},{b+10}'
            alpha=mask(box,[shape]); n=rng.randrange(-8,8)
            rgb=ImageOps.colorize(texture,(27+n,26+n,44+n),(96+n,84+n,115+n))
            canvas.alpha_composite(rgba(rgb,alpha))
    for x,y,w,h in [(1137,37,12,5),(1151,41,14,6),(1124,44,12,5),(1141,49,12,6),
                    (1112,49,10,6),(1124,55,13,5),(1113,62,11,4),(1101,61,8,5)]:
        alpha=mask(box,[f'{x-w},{y} {x-2},{y-h} {x+w},{y-h+1} {x+w-3},{y+4} {x-5},{y+5}'])
        rgb=ImageOps.colorize(texture,(52,46,60),(109,92,105))
        canvas.alpha_composite(rgba(rgb,alpha))
    save('escada-oeste',canvas)


if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    art=Image.open(sys.argv[1]).convert('RGB')
    if art.size!=(956,926):
        raise SystemExit('Esperado o recorte de referência 956 × 926.')
    scenery()
    sea()
    sand()
    save('tentaculo',tentacle_atlas(tentacle_pose()))
    stair()
