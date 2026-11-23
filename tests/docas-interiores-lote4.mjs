import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SUPERFICIES_INTERIORES_LOTE4 as details} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote4.js';
import {INTERIORES_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores.js';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {podePisarDocas} from '../js/game/docas-navigation.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-interiores-lote4/manifest.json'));
assert.equal(m.count,10);assert.equal(details.length,10);assert.equal(new Set(details.map(s=>s.sprite)).size,10);
assert.equal(readdirSync('assets/source-art/docas-interiores-lote4').filter(n=>n.endsWith('.png')).length,10);
const main=readFileSync('js/main.js','utf8');
for(const s of details){
 const r=m.assets.find(r=>r.id===s.name);assert(r);
 assert.equal(createHash('sha256').update(readFileSync(`assets/source-art/docas-interiores-lote4/${s.name}.png`)).digest('hex'),r.sourceSha256);
 const b=readFileSync(`assets/sprites/docas-interiores-lote4/${s.name}.png`);assert.equal(b[25],6);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],r.size);assert(r.size.every(n=>n<=512));assert(main.includes(`id: '${s.sprite}'`));
 const [a,b0,c,d]=s.box;assert(a>=1&&b0>a);if(s.plane!=='floor'){assert(b0<=(s.plane==='left'?(s.room==='crt'?8:9):(s.room==='crt'?10:12)));assert(c>=0&&d<=92);}
}
const themes=Object.values(INTERIORES_DOCAS);
for(const [i,kind] of ['cordame','interferencia','goteira'].entries())for(let j=0;j<3;j++)assert.equal(!!themes[j].sound[kind],i===j,'exclusive acoustic identity');
// Sample the whole wall polygon, not just its center. The previous regression
// only checked centroids and missed the front wall/apron of both cabins.
let probes=0;
for(const o of docas.navegacaoDocas.obstaculos.filter(o=>['cabana-oeste','cabana-leste','abrigo-oeste'].includes(o.id))){
 const cx=o.poly.reduce((s,p)=>s+p[0],0)/o.poly.length,cy=o.poly.reduce((s,p)=>s+p[1],0)/o.poly.length;
 for(let i=0;i<o.poly.length;i++){const a=o.poly[i],b=o.poly[(i+1)%o.poly.length];for(let j=0;j<=20;j++){
  const t=j/20,x=(a[0]+(b[0]-a[0])*t)*.98+cx*.02,y=(a[1]+(b[1]-a[1])*t)*.98+cy*.02;
  assert(!podePisarDocas(docas.navegacaoDocas,x*2.5/64,y*2.5/22,.25),o.id+' wall is solid');probes++;
 }}
}
console.log(`Lote 4: exactly ten original registered RGBA details; room bounds, distinct acoustic identities and ${probes} cabin-wall probes OK.`);
