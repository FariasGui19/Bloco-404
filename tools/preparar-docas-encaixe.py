#!/usr/bin/env python3
"""Three clean RGBA atlases from the supplied reference, not a flattened map.
Pillow required. Source pixels are never synthesized/upscaled. Plant: 1568x882.
Masks, registration and atlas gutters are reproducible; no gameplay data writes.
"""
from pathlib import Path
import json, hashlib
from PIL import Image, ImageDraw, ImageFilter, ImageChops
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/sprites/docas-neblina/referencia.png'
OUT=ROOT/'assets/sprites/docas-encaixe'
# Tight silhouettes in normalized plant coordinates. Small ground skirts retain
# painted contact shadows; no sea or dock is extracted into these atlases.
GROUPS={
'estruturas':[
 ('cabana-oeste',[(467,404),(489,375),(523,336),(560,349),(600,369),(641,385),(696,416),(689,428),(672,428),(674,488),(693,499),(683,517),(643,525),(587,512),(541,500),(496,477),(490,435),(473,429)],505),
 ('central_fundos',[(558,284),(593,261),(695,237),(744,284),(739,296),(738,351),(755,362),(744,380),(716,396),(694,399),(663,386),(607,373),(574,352),(571,304),(559,300)],385),
 ('galpao',[(783,370),(809,354),(851,339),(890,342),(927,357),(959,380),(968,394),(958,405),(949,405),(949,458),(926,475),(880,479),(840,464),(808,451),(805,400),(790,392)],465),
 ('cabana-leste',[(1095,424),(1137,400),(1240,378),(1295,421),(1304,435),(1284,442),(1286,492),(1261,516),(1218,537),(1175,527),(1134,510),(1119,482),(1115,450),(1102,449)],519),
 ('torre',[(1324,342),(1350,331),(1350,317),(1357,313),(1361,328),(1385,340),(1377,352),(1370,356),(1378,453),(1371,464),(1351,466),(1331,459),(1337,440),(1342,371),(1330,365)],462),
 ('farol',[(866,182),(875,164),(883,115),(883,75),(879,69),(883,42),(891,31),(897,28),(900,18),(907,16),(915,29),(924,33),(927,46),(931,72),(923,82),(927,146),(939,161),(935,183),(910,195),(884,190)],188),
 ('camara',[(1080,145),(1099,123),(1131,111),(1154,89),(1178,56),(1201,37),(1235,29),(1269,33),(1291,55),(1307,92),(1317,120),(1358,133),(1376,153),(1372,178),(1354,193),(1314,207),(1265,218),(1205,215),(1146,198),(1098,177)],218),
 ('porta',[(954,157),(952,132),(955,120),(962,113),(970,111),(979,117),(986,127),(986,153),(977,159)],157),
 ('anexo-oeste',[(335,399),(354,385),(410,368),(461,391),(463,403),(450,410),(449,445),(426,457),(391,450),(356,440),(347,421),(339,419)],451),
 ('anexo-cais',[(1012,554),(1033,539),(1073,529),(1111,540),(1133,556),(1123,568),(1123,601),(1100,613),(1054,615),(1026,600),(1023,571)],610),
],
'relevo':[
 ('penhasco',[(792,390),(799,336),(790,301),(807,269),(824,250),(827,202),(846,179),(874,170),(888,151),(924,145),(952,149),(979,132),(1004,123),(1040,122),(1077,104),(1116,91),(1155,80),(1193,84),(1237,97),(1280,117),(1325,132),(1362,159),(1380,199),(1381,254),(1373,284),(1352,304),(1337,331),(1324,360),(1303,389),(1271,405),(1242,398),(1196,409),(1160,415),(1119,409),(1080,420),(1046,425),(1008,420),(969,433),(930,416),(892,421),(846,414),(810,408)],420),
 ('escada',[(1007,181),(1023,180),(1030,199),(1040,220),(1054,240),(1081,254),(1111,263),(1142,274),(1135,294),(1113,308),(1090,325),(1071,338),(1048,352),(1025,360),(1009,346),(1022,334),(1041,321),(1062,307),(1075,293),(1077,283),(1059,273),(1042,255),(1022,236),(1011,211)],352),
 ('patio',[(454,429),(489,395),(540,377),(600,366),(660,368),(715,385),(766,399),(802,397),(852,411),(915,425),(980,413),(1034,401),(1082,423),(1134,438),(1190,443),(1246,464),(1290,492),(1329,522),(1347,558),(1314,580),(1266,600),(1194,608),(1130,612),(1080,606),(1030,593),(985,582),(938,577),(889,562),(840,553),(790,537),(748,537),(720,546),(685,548),(649,536),(620,530),(575,518),(533,505),(490,487),(464,459)],575),
],
'vida':[
 ('palmeira-d',[(642,239),(649,216),(650,193),(641,187),(649,171),(664,158),(681,155),(702,159),(721,173),(728,190),(714,198),(711,181),(697,187),(689,213),(686,242)],240),
 ('palmeira-e',[(751,245),(758,213),(752,202),(760,188),(776,172),(792,167),(808,172),(821,182),(825,200),(813,207),(808,190),(798,203),(787,229),(783,247)],244),

 ('palmeira-a',[(511,336),(511,306),(514,281),(506,275),(494,285),(498,265),(512,252),(529,244),(547,247),(559,260),(552,282),(546,272),(540,273),(535,293),(534,333)],333),
 ('palmeira-b',[(573,262),(575,223),(568,211),(558,220),(561,201),(574,185),(591,176),(613,178),(632,193),(640,211),(626,207),(621,218),(609,199),(603,212),(597,237),(594,262)],261),
 ('palmeira-c',[(1013,505),(1019,466),(1028,440),(1016,436),(1013,450),(1007,433),(1018,417),(1034,405),(1051,403),(1072,412),(1086,430),(1077,443),(1065,426),(1058,439),(1053,426),(1047,451),(1037,490),(1035,505)],502),
 ('arvore-seca',[(350,392),(365,351),(364,324),(352,312),(346,295),(350,283),(358,304),(368,304),(374,285),(383,273),(383,258),(390,256),(392,277),(387,291),(402,288),(419,272),(430,257),(426,245),(417,239),(419,231),(433,237),(442,226),(449,228),(443,242),(454,245),(469,240),(478,244),(470,253),(452,257),(437,266),(427,286),(408,305),(393,313),(387,342),(390,379),(379,395)],391),
 ('cristal-a',[(799,279),(811,274),(815,252),(819,246),(825,264),(829,249),(836,245),(842,272),(849,282),(858,274),(862,286),(875,289),(880,309),(863,319),(841,319),(814,309)],314),
 ('cristal-b',[(1086,408),(1098,396),(1109,399),(1115,383),(1122,390),(1128,369),(1133,365),(1140,389),(1148,390),(1154,382),(1160,400),(1177,398),(1182,410),(1165,422),(1127,428),(1101,423)],423),
 ('cristal-c',[(1005,767),(1016,752),(1019,736),(1024,737),(1031,754),(1038,744),(1044,755),(1056,743),(1063,757),(1065,775),(1081,785),(1072,802),(1048,801),(1027,790)],793),
 ('caixa-a',[(747,479),(769,473),(786,481),(783,502),(769,510),(749,501)],505),
 ('caixas-b',[(720,535),(739,526),(751,530),(754,524),(772,520),(788,528),(786,546),(758,561),(739,564),(721,555)],556),
 ('barris-a',[(705,425),(715,420),(725,425),(725,434),(738,436),(741,450),(737,458),(720,459),(705,450)],455),
 ('barris-b',[(801,580),(812,575),(823,579),(825,600),(818,612),(805,611),(800,602)],609),
 ('caixa-c',[(942,658),(960,652),(979,661),(979,679),(963,689),(944,682)],684),
 ('barril-c',[(904,626),(915,622),(926,628),(929,648),(923,660),(911,661),(904,652)],656),
 ('cerca',[(452,450),(462,448),(464,465),(480,473),(481,460),(487,460),(490,481),(507,488),(508,476),(514,477),(516,492),(531,500),(530,486),(537,487),(539,506),(548,508),(548,498),(554,499),(556,522),(548,525),(529,515),(506,505),(481,493),(460,483)],515),
 ('runa',[(873,506),(891,497),(921,498),(949,507),(959,519),(943,532),(913,541),(885,530)],532),
]}

def object_mask(im,name,poly):
 mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon(poly,fill=255)
 if name.startswith('palmeira') or name=='arvore-seca':
  import numpy as np
  a=np.array(im);m=np.array(mask)
  r,g,b=a[:,:,0].astype(float),a[:,:,1].astype(float),a[:,:,2].astype(float)
  if name.startswith('palmeira'):
   sky=((b-r)>28)&((b-g)>18)&(b>55)
  else:sky=(b>g*1.18)&(b>r*1.08)&(r>65)&(g>55)
  m[sky]=0;mask=Image.fromarray(m)
  if name.startswith('palmeira'):mask=mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
 return mask

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 im=Image.open(SRC).convert('RGBA').resize((1568,882),Image.Resampling.LANCZOS)
 frames={};sheets=[]
 for group,items in GROUPS.items():
  atlas=Image.new('RGBA',(2048,1024));cx=4;cy=4;rowh=0
  for name,poly,foot in items:
   box=(min(x for x,y in poly)-2,min(y for x,y in poly)-2,max(x for x,y in poly)+3,max(y for x,y in poly)+3)
   mask=object_mask(im,name,poly)
   # Ground is separate from every sortable building/prop, never a flat
   # screenshot. Transparent holes get covered by their own registered pieces.
   if group=='relevo':
    if name in ['patio','penhasco']:mask=mask.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(2.2))
    for other_group,objects in GROUPS.items():
     if other_group=='relevo':continue
     for object_name,outline,_ in objects:mask=ImageChops.subtract(mask,object_mask(im,object_name,outline))
   mask=mask.filter(ImageFilter.GaussianBlur(.35))
   crop=im.crop(box);crop.putalpha(mask.crop(box));cw,ch=crop.size
   if cx+cw+4>atlas.width:cx=4;cy+=rowh+8;rowh=0
   if cy+ch+4>atlas.height:raise ValueError('Atlas overflow')
   atlas.alpha_composite(crop,(cx,cy))
   ox,oy={'cristal-c':(0,-181),'caixa-c':(0,-84),'barril-c':(0,-55)}.get(name,(0,0))
   frames[name]={'sheet':group,'rect':[cx,cy,cw,ch],'plant':[box[0]+ox,box[1]+oy,cw,ch],'foot':foot+oy,'layer':'ground' if group=='relevo' or name=='runa' else 'object'}
   cx+=cw+8;rowh=max(rowh,ch)
  atlas=atlas.crop((0,0,2048,cy+rowh+4))
  import numpy as np
  pixels=np.array(atlas);pixels[pixels[:,:,3]==0]=0;atlas=Image.fromarray(pixels)
  atlas.save(OUT/f'{group}.png',optimize=True)
  sheets.append({'id':f'docas_encaixe_{group}','src':f'assets/sprites/docas-encaixe/{group}.png','size':list(atlas.size)})
 manifest={'version':1,'source':str(SRC.relative_to(ROOT)),'sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'plant':[1568,882],'gutter':4,'sheets':sheets,'frames':frames}
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
 js='// Generated by tools/preparar-docas-encaixe.py; source registration, not gameplay geometry.\n'
 js+='export const SPRITES_ENCAIXE='+json.dumps([{k:s[k] for k in ['id','src']} for s in sheets],ensure_ascii=False)+';\n'
 js+='export const PECAS_ENCAIXE='+json.dumps(frames,ensure_ascii=False)+';\n'
 (ROOT/'js/data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js').write_text(js)
 print(f'{len(sheets)} RGBA atlases, {len(frames)} independently anchored pieces')
if __name__=='__main__':main()
