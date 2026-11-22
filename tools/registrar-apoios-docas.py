#!/usr/bin/env python3
"""Measure opaque contact pixels of all interior furniture RGBA paintings.
Never sample in the RAF. Rebuild after sprite crops change. Keep the hand-
authored placement function below the generated table intact.
"""
from pathlib import Path
import re,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SURFACES={'esteira-sisal','carta-parede','grelha-piso','capa-parede','lanterna-parede','tubo-valvula'}
records={}
main=(ROOT/'js/main.js').read_text()
for id,file in re.findall(r"\{ id: '(docas_interior_[^']+)', src: '([^']+)' \}",main):
    if Path(file).stem in SURFACES:continue
    im=Image.open(ROOT/file).convert('RGBA');a=np.array(im)[:,:,3];mask=a>128
    ys,xs=np.nonzero(mask);bottom=int(ys.max());row=xs[ys==bottom];x=int(row[np.argmin(abs(row-np.median(row)))])
    front=[round(x/im.width,5),round(bottom/im.height,5)]
    contacts=[]
    for lo,hi in [(0,.34),(.34,.67),(.67,1)]:
        y0,x0=np.nonzero(mask[:,int(lo*im.width):int(hi*im.width)])
        if not len(y0):continue
        x0=x0+int(lo*im.width);b=int(y0.max());row=x0[y0==b];u=int(row[np.argmin(abs(row-np.median(row)))])
        contacts.append([round(u/im.width,5),round(b/im.height,5)])
    records[id]={'front':front,'contacts':contacts}
path=ROOT/'js/engine/docas-apoios-interiores.js'
old=path.read_text();fn=old[old.index('export function caixaMobiliaDocas'):]
header="import {CONFIG} from '../config.js';\n// Generated opaque contact pixels; see tools/registrar-apoios-docas.py.\n"
path.write_text(header+'export const APOIOS_MOBILIA_DOCAS=Object.freeze('+json.dumps(records,indent=1)+');\n'+fn)
print(f'{len(records)} furniture paintings registered; no surface decal treated as furniture.')
