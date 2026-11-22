import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PECAS_INTERIORES_LOTE3,SUPERFICIES_INTERIORES_LOTE3} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote3.js';
import {APOIOS_MOBILIA_DOCAS,caixaMobiliaDocas} from '../js/engine/docas-apoios-interiores.js';
import {planoDetalheDocas} from '../js/engine/docas-superficies-interiores.js';
import {cabanaOeste,cabanaLeste,galpao} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const manifest=JSON.parse(readFileSync('assets/sprites/docas-interiores-lote3/manifest.json'));
assert.equal(manifest.count,10);assert.equal(readdirSync('assets/source-art/docas-interiores-lote3').filter(n=>n.endsWith('.png')).length,10);
assert.equal(PECAS_INTERIORES_LOTE3.length,4);assert.equal(SUPERFICIES_INTERIORES_LOTE3.length,6);
const main=readFileSync('js/main.js','utf8');
for(const r of manifest.assets){assert.equal(createHash('sha256').update(readFileSync('assets/source-art/docas-interiores-lote3/'+r.id+'.png')).digest('hex'),r.sourceSha256);assert(main.includes('assets/sprites/docas-interiores-lote3/'+r.id+'.png'));}
let n=0;
for(const map of [cabanaOeste,cabanaLeste,galpao])for(const o of map.objects.filter(o=>o.docasProp)){
 n++;assert(o.docasAsset);const support=APOIOS_MOBILIA_DOCAS[o.docasAsset];assert(support);assert.equal(support.contacts.length,3);
 const r=caixaMobiliaDocas(o,{width:512,height:400});assert(r.width<=(o.docasSize[0]+o.docasSize[1])*32*1.081);
 const u=r.flip?1-support.front[0]:support.front[0];assert(Math.abs(r.x+u*r.width-r.frontX)<1e-8);assert(Math.abs(r.y+support.front[1]*r.height-r.frontY)<1e-8);
}
assert.equal(n,18);
for(const s of SUPERFICIES_INTERIORES_LOTE3){const p=planoDetalheDocas(s);assert.equal(p.length,4);for(const xy of p)assert(xy.every(Number.isFinite));}
console.log('Lote 3: ten original assets, four furniture replacements, six plane-mapped details; all 18 footprints retain grounded, bounded paintings.');
