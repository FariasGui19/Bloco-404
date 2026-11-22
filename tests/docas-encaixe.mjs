import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SPRITES_ENCAIXE,PECAS_ENCAIXE} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js';
import {itensEncaixe,substituidaPeloEncaixe,caixaEncaixe,encaixeAtivo} from '../js/engine/docas-encaixe.js';
import {ordenarProfundidadeDocas} from '../js/engine/docas-view.js';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const manifest=JSON.parse(readFileSync('assets/sprites/docas-encaixe/manifest.json'));
assert.equal(SPRITES_ENCAIXE.length,4);assert(SPRITES_ENCAIXE.length<=10);
assert.equal(Object.keys(PECAS_ENCAIXE).length,33);
assert.equal(createHash('sha256').update(readFileSync(manifest.source)).digest('hex'),manifest.sha256,'same supplied reference');
assert.deepEqual(manifest.frames,PECAS_ENCAIXE);
for(const sheet of SPRITES_ENCAIXE){
 const png=readFileSync(sheet.src),info=manifest.sheets.find(s=>s.id===sheet.id);
 assert.equal(png.readUInt32BE(0),0x89504e47);assert.equal(png[25],6,'RGBA');
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],info.size);
 const pieces=Object.values(PECAS_ENCAIXE).filter(p=>sheet.id===`docas_encaixe_${p.sheet}`);
 for(const p of pieces){
  const [x,y,w,h]=p.rect;assert(x>=4&&y>=4&&x+w<=info.size[0]-4&&y+h<=info.size[1]-4);
  assert(p.plant.every(Number.isFinite));assert(Number.isFinite(p.foot));
  for(const q of pieces){if(p===q)continue;const [qx,qy,qw,qh]=q.rect;assert(x+w<=qx||qx+qw<=x||y+h<=qy||qy+qh<=y,'frames do not overlap');}
 }
}
assert.equal(encaixeAtivo(docas),false,'missing atlas safely falls back to prior renderer');
for(const id of ['cabana-oeste','galpao','torre','farol'])assert(substituidaPeloEncaixe(docas.estruturasDocas.find(s=>s.id===id)));
assert(!substituidaPeloEncaixe({id:'cais_deck',x:1800,y:1400}));
assert(!substituidaPeloEncaixe({id:'lote10_fogueira',x:464*2.5,y:497*2.5}),'interactive fire retained');
const order=ordenarProfundidadeDocas([...itensEncaixe(2.5),{player:true,y:450*2.5}]);
const index=id=>order.findIndex(p=>p.encaixe===id),player=order.findIndex(p=>p.player);
assert(index('central_fundos')<player&&player<index('galpao'),'player behind workshop, ahead of rear cabin');
assert.deepEqual(caixaEncaixe('galpao',2.5).foot,465*2.5);
assert.equal(caixaEncaixe('missing',2.5),null);
console.log('Encaixe: quatro atlas RGBA, 33 recortes registrados, gutters, referência, fallback e z-sort OK.');
