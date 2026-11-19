"""Recorta as peças do cais da imagem fornecida pelo usuário (Pillow).
Uso: python tools/preparar-docas-cais.py caminho/para/image-1.png
A planta local usa a referência normalizada para 1568 × 617, sem moldura.
"""
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/sprites/docas-cais-sul'
SIZE = (1568, 617)
S = 3
LANCZOS = Image.Resampling.LANCZOS


def points(text):
    return [tuple(map(float, p.split(','))) for p in text.split()]


def silhouette(box, shapes, holes=(), lines=()):
    x, y, r, b = box
    mask = Image.new('L', ((r-x)*S, (b-y)*S))
    draw = ImageDraw.Draw(mask)

    def local(s):
        return [(round((u-x)*S), round((v-y)*S)) for u, v in points(s)]

    for s in shapes:
        draw.polygon(local(s), fill=255)
    for width, s in lines:
        draw.line(local(s), fill=255, width=round(width*S), joint='curve')
    for s in holes:
        draw.polygon(local(s), fill=0)
    return mask.resize((r-x, b-y), LANCZOS)


def save(name, image):
    # Remove RGB invisível dos recortes para não embutir a arte inteira.
    alpha = image.getchannel('A')
    compact = Image.new('RGBA', image.size)
    compact.paste(image, (0, 0), alpha.point(lambda p: 255 if p else 0))
    compact.save(OUT / (name + '.png'), optimize=True)


def cut(name, box, shapes, holes=(), lines=(), fade_right=0):
    image = art.crop(box)
    alpha = silhouette(box, shapes, holes, lines)
    # The reference ends mid-rock: blend the final side into the game coast.
    if fade_right:
        px = alpha.load()
        for x in range(alpha.width-fade_right, alpha.width):
            t = (alpha.width-x-1)/fade_right
            for y in range(alpha.height):
                px[x,y] = round(px[x,y]*t*t*(3-2*t))
    image.putalpha(alpha)
    save(name, image)


def main():
    # Hull and wheelhouse share one rigid layer. Cut the openings in the rails;
    # trace the narrow lines separately instead of carrying a patch of water.
    cut('pesqueiro', (42, 16, 652, 584), [
        '52,444 67,429 107,415 78,380 79,371 117,354 164,344 157,309 180,291 233,274 275,266 275,217 259,202 260,192 294,179 326,172 325,151 331,148 329,134 338,126 347,131 349,147 359,153 358,170 377,179 389,177 433,184 459,200 462,212 448,218 445,294 474,309 477,319 457,330 453,345 465,358 486,353 506,339 515,289 533,256 553,253 562,246 578,239 599,245 620,247 639,254 647,273 642,290 633,318 621,348 600,376 574,407 545,431 535,463 509,488 470,513 415,536 361,552 299,567 239,579 181,581 132,571 99,560 80,544 69,514 68,505 56,503 53,464',
        '374,179 378,95 374,88 375,60 350,49 349,41 356,41 379,50 379,28 383,22 390,23 391,33 390,56 405,64 417,66 417,74 400,76 394,69 394,89 391,98 394,181',
        '523,333 523,83 530,68 530,39 534,32 542,33 545,42 543,73 548,78 546,111 544,325',
        '194,309 196,244 190,235 190,225 196,220 199,209 204,212 204,219 211,225 213,235 207,245 207,304',
    ], [
        '82,376 110,363 118,363 121,388 139,402 164,407 164,394 160,383 144,366 121,363 166,351 172,362 177,394 175,413 162,414 140,405 104,388',
        '76,438 98,429 106,426 108,448 101,452 82,446',
    ], [
        (5,'379,64 322,93 274,146 245,188 232,224 209,257'),
        (3,'383,67 353,111 319,152 300,183'),
        (4,'384,60 424,100 449,145 469,199 469,269'),
        (3,'399,74 447,125 491,165 521,194'),
        (8,'312,92 363,117 411,141 468,165 509,184 543,198 575,199'),
        (4,'320,94 319,111 305,118'),
        (3,'382,93 409,129 430,184'),
        (3,'391,83 414,127 457,198 476,229 476,267'),
        (4,'533,78 519,121 505,160 467,250 451,272'),
        (5,'542,84 555,133 567,158 588,197 606,242'),
        (4,'544,102 554,160 553,182 557,208 565,244'),
        (5,'242,183 239,202 239,216 227,238 222,265 211,280'),
        (5,'95,315 100,340 100,367'), (5,'124,330 127,354 127,370'),
        (5,'463,288 490,278 523,267 555,260 588,251 618,250'),
        (6,'449,305 476,286 508,277 536,268'),
        (4,'483,243 483,270'), (4,'507,231 507,259'),
    ])
    cut('deck', (528, 97, 1198, 489), [
        '532,254 609,223 672,200 746,171 814,149 875,132 973,103 1019,98 1067,112 1116,126 1158,144 1190,158 1180,177 1131,199 1081,225 1034,249 982,275 924,302 856,330 793,351 738,358 677,383 636,390 576,339 533,298',
        '680,351 718,341 715,398 709,412 695,415 690,407 686,367',
        '813,309 862,301 855,370 851,391 840,402 819,398 815,390',
        '1012,228 1031,222 1030,305 1017,324 1009,319',
    ])
    cut('guarda-fundo', (638, 13, 1040, 214), [
        '650,137 659,130 671,131 680,137 678,188 670,201 652,204 649,193',
        '776,111 785,104 799,106 807,113 805,193 800,206 785,208 776,202',
        '883,70 892,62 906,63 915,70 914,129 906,143 890,145 881,137',
        '999,28 1007,18 1025,16 1035,23 1032,101 1022,111 1004,111 998,103',
    ], lines=[(9,'673,165 716,156 754,146 778,137'),(9,'807,131 843,119 884,105'),(10,'911,98 940,88 971,81 999,72')])
    cut('estaca-oeste', (641, 343, 687, 491), [
        '648,354 658,347 679,346 683,353 680,414 679,475 670,484 652,487 644,477 644,397',
    ])
    cut('estaca-meio', (754, 295, 798, 475), [
        '760,308 771,299 786,300 792,307 789,445 790,459 782,468 768,471 754,464 757,385',
    ])
    cut('rede', (907, 190, 1135, 418), [
        '910,260 924,250 942,252 944,265 944,388 946,399 936,409 918,411 907,400 910,380',
        '1095,204 1105,194 1118,190 1129,199 1127,314 1117,324 1102,321 1094,314',
        '944,290 971,283 998,274 1022,263 1050,251 1074,239 1086,232 1094,211 1097,238 1087,252 1081,264 1075,280 1063,295 1049,302 1038,313 1025,325 1007,330 986,343 956,353 944,350',
    ], [
        '948,299 961,294 957,303 950,303', '988,293 1001,285 997,295 989,301',
        '1019,281 1031,274 1029,285 1022,292', '1041,274 1054,265 1051,277 1044,285',
        '960,320 974,314 978,323 960,337', '1006,310 1017,303 1014,316 1005,320',
        '1061,269 1073,255 1070,275 1059,287',
    ])
    cut('estaca-leste', (1160, 108, 1206, 305), [
        '1168,119 1180,111 1194,112 1201,119 1199,181 1200,268 1194,292 1181,299 1169,294 1164,283 1165,184',
    ])
    cut('bote', (930, 304, 1184, 452), [
        '937,375 953,364 974,353 1005,342 1033,331 1061,322 1093,314 1120,307 1142,308 1160,306 1174,310 1179,319 1177,334 1168,352 1151,370 1132,387 1105,404 1079,416 1048,430 1019,437 991,445 965,446 943,439 939,420 943,407 942,390',
    ])
    cut('amarracao', (0, 417, 66, 554), [
        '2,434 7,422 16,420 26,426 29,436 24,451 23,530 17,546 9,549 4,538 7,493 6,450',
    ], lines=[(5,'23,446 38,446 62,441')])
    cut('boia-rede', (567, 465, 602, 506), [
        '578,470 588,468 599,478 599,490 592,500 582,503 570,495 569,488',
    ])
    cut('barril', (1024, 34, 1080, 122), [
        '1025,56 1032,45 1044,37 1057,35 1067,40 1078,57 1078,91 1074,107 1065,116 1046,120 1032,111 1025,96',
    ])
    # Only the face and the glowing foothold; the island surface stays playable.
    cut('rocha-amarra', (1189, 151, 1568, 436), [
        '1197,221 1221,221 1238,209 1260,220 1279,231 1326,224 1346,228 1362,221 1398,215 1411,221 1426,200 1447,181 1468,178 1483,166 1500,175 1522,168 1545,161 1559,177 1564,196 1558,226 1552,259 1561,312 1568,350 1553,391 1564,425 1546,431 1518,425 1499,417 1482,404 1469,391 1460,376 1426,377 1403,370 1377,367 1350,354 1325,347 1304,359 1290,346 1264,354 1240,355 1224,341 1208,342 1193,332 1197,304 1195,268',
    ], fade_right=42)
    water()
    stairs()


def water():
    # Only the open water and the thin reflections are retained. Erode the
    # mask around wood and coast first so bobbing cannot uncover baked ghosts.
    box = (0, 0, *SIZE)
    water_mask = silhouette(box, [
        '0,0 56,0 160,31 258,57 318,92 376,129 468,160 530,186 569,193 651,198 748,239 857,264 909,294 1183,311 1232,340 1290,354 1363,371 1436,402 1520,432 1568,437 1568,617 0,617',
    ])
    keep = Image.new('L', SIZE, 255)
    for name, x, y in [('pesqueiro',42,16),('deck',528,97),('guarda-fundo',638,13),
                       ('estaca-oeste',641,343),('estaca-meio',754,295),('rede',907,190),
                       ('estaca-leste',1160,108),('bote',930,304),('amarracao',0,417),('boia-rede',567,465)]:
        # Pixels adjacent to the silhouette are left to the game water.
        with Image.open(OUT / (name+'.png')) as sprite:
            a = ImageOps.expand(sprite.getchannel('A'),border=8).filter(ImageFilter.MaxFilter(13))
            keep.paste(0,(x-8,y-8,x-8+a.width,y-8+a.height),a)
    mask = Image.new('L', SIZE)
    mask.paste(water_mask,(0,0),keep)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    # Dissolve into the regular sea, never a rectangular shoreline overlay.
    mx = mask.load()
    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            t=min(1,x/65,(SIZE[0]-x-1)/112,y/40,(SIZE[1]-y-1)/40)
            mx[x,y]=round(mx[x,y]*t*t*(3-2*t)*.87)
    result = art.copy()
    result.putalpha(mask)
    save('reflexos', result)


def stairs():
    # Pedra nova para a passagem: degraus projetados no mesmo eixo do deck.
    # Rasterizamos faces e lascas em alta resolução e usamos a rocha da referência
    # para que a alvenaria tenha o mesmo grão dos elementos ao lado.
    box = (1006, 31, 1324, 213)
    w, h = box[2]-box[0], box[3]-box[1]
    canvas = Image.new('RGBA', (w*S, h*S))
    texture = ImageOps.autocontrast(ImageOps.grayscale(art.crop((1200, 228, 1427, 349)))).resize((w*S,h*S), LANCZOS)
    rng = random.Random(404)

    def lerp(a,b,t):
        return (a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)

    def polygon(poly, color, outline='#1a1725', width=1):
        pixels = [(round((x-box[0])*S), round((y-box[1])*S)) for x,y in poly]
        mask = Image.new('L',canvas.size)
        ImageDraw.Draw(mask).polygon(pixels,fill=255)
        base = Image.new('RGB',canvas.size,color)
        grain = ImageOps.colorize(texture, tuple(int(c*.50) for c in color), tuple(min(255,int(c*1.55)) for c in color))
        canvas.paste(Image.blend(base,grain,.82), (0,0), mask)
        if outline:
            ImageDraw.Draw(canvas).line(pixels+[pixels[0]],fill=outline,width=round(width*S),joint='curve')

    # Cheek wall anchors the apron in the cliff. Uneven blocks break the
    # rectangular side silhouette, with the lowest stones lost to the tide.
    polygon([(1308,90),(1320,101),(1313,120),(1315,132),(1297,150),
             (1289,151),(1278,168),(1254,181),(1248,193),(1211,207),
             (1195,200),(1176,202),(1149,188),(1183,155)],(46,49,76),width=2)
    for j in range(6):
        x=1309-j*20; y=109+j*15
        polygon([(x,y),(x+5,y+5),(x-13,y+22),(x-21,y+24),
                 (x-25,y+15),(x-17,y+8)],(57-j*3,57-j*2,82+j),width=.8)

    for i in range(6):
        a=(1148-i*21,40+i*12)
        b=(1308-i*21,90+i*12)
        c=(b[0]-20,b[1]+5)
        d=(a[0]-20,a[1]+5)
        # Risers with a progressively colder water stain near the bottom.
        polygon([d,c,(c[0],c[1]+9),(d[0],d[1]+9)], (61-i*3,52+i,69+i*4))
        polygon([b,c,(c[0],c[1]+9),(b[0],b[1]+10)], (49-i*3,45+i,64+i*4))
        cuts=[0,.29+rng.uniform(-.08,.08),.63+rng.uniform(-.08,.08),1]
        for j in range(3):
            p,q=cuts[j:j+2]; aa,bb,cc,dd=lerp(a,b,p),lerp(a,b,q),lerp(d,c,q),lerp(d,c,p)
            n=rng.randrange(-6,10)
            u,v=lerp(dd,cc,.14),lerp(dd,cc,.88)
            polygon([aa,bb,cc,v,(v[0]-5,v[1]+1.8),u,(dd[0]+2,dd[1]+1),dd],
                    (116+n-i*6,99+n-i*3,114+n+i*2), width=1.2)
            dctx=ImageDraw.Draw(canvas)
            def stroke(vertices, color, width):
                dctx.line([((x-box[0])*S,(y-box[1])*S) for x,y in vertices],fill=color,width=width)
            stroke([(u[0],u[1]-1.5),(v[0],v[1]-1.5)],(135-i*8,111-i*2,139+i*6),S)
            for k in range(12):
                v1=lerp(lerp(aa,bb,rng.uniform(.12,.88)),lerp(dd,cc,rng.uniform(.12,.88)),rng.uniform(.2,.7))
                x,y=v1
                stroke([v1,(x+rng.uniform(1,4),y+rng.uniform(-1,2))],rng.choice(['#393044','#60576d','#937c93']),rng.choice([1,2,3]))
    # Small patches of the wash lap over the bottom stones. They are part
    # of the stair art, not an extension of the walkable polygon.
    wash=Image.new('RGBA',canvas.size)
    dctx=ImageDraw.Draw(wash)
    for coords, color, width in [
        ([(1153,182),(1163,184),(1174,189),(1181,188),(1192,191),(1202,187),(1217,183)],(72,174,218,85),5),
        ([(1167,184),(1177,187),(1185,187)],(141,207,234,125),2),
        ([(1193,188),(1202,186),(1209,183)],(140,202,240,140),2),
        ([(1226,174),(1234,171),(1242,165)],(110,163,221,91),2),
    ]:
        dctx.line([((x-box[0])*S,(y-box[1])*S) for x,y in coords],fill=color,width=width*S,joint='curve')
    canvas.alpha_composite(wash)
    save('escada-mare',canvas.resize((w,h),LANCZOS))


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    art = Image.open(sys.argv[1]).convert('RGB').resize(SIZE, LANCZOS)
    main()
