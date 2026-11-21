import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {PECAS_ENCAIXE} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js';
import {AJUSTES_DOCAS,registroEncaixe,itensEncaixe,pecasCostaAjustadas} from '../js/engine/docas-encaixe.js';
import {TENTACULOS_SUPERIORES,faseMarSuperior,limitesMarSuperior,desenharMarSuperior} from '../js/engine/docas-mar-superior.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-encaixe/manifest.json'));
assert.equal(m.sheets.length,4);assert.equal(m.refinement.pieces.length,5);
for(const id of m.refinement.pieces){const p=PECAS_ENCAIXE[id];assert.equal(p.sheet,'refino');assert.equal(p.rect[2],p.plant[2]*2);assert.deepEqual(p.plant,m.baseFrames[id].plant,'world dimensions unchanged');}
for(const id of ['palmeira-a','palmeira-b','palmeira-d','palmeira-e','arvore-seca']){
 assert(AJUSTES_DOCAS[id].oculta);assert(!itensEncaixe(2.5).some(p=>p.encaixe===id),'ghost tree absent from depth list');
}
assert(itensEncaixe(2.5).some(p=>p.encaixe==='palmeira-c'),'grounded palm retained');
const before=JSON.stringify(docas.costaOeste),crystal=pecasCostaAjustadas(docas.costaOeste).find(p=>p.id==='cristais');
assert.equal(JSON.stringify(docas.costaOeste),before);
const right=docas.costaOeste.x+(crystal.x+crystal.w)*docas.costaOeste.escala;
assert(right<335,'west cluster clears annex roof at x=335');
const c=registroEncaixe('cristal-c'),annex=registroEncaixe('anexo-cais');assert(c.x+c.w<=annex.x,'small east cluster clears annex');
assert(c.w<PECAS_ENCAIXE['cristal-c'].plant[2]);assert.equal(c.foot,598);
const boxes=registroEncaixe('caixas-b');assert(boxes.foot<556,'boxes clear the dock barrel');
assert.equal(TENTACULOS_SUPERIORES.length,3);
assert.deepEqual(limitesMarSuperior({left:-100,right:100,top:-500,bottom:0},2.5),{left:-40,right:40,top:-200,bottom:0});
assert.equal(faseMarSuperior(0,true),faseMarSuperior(30,true));assert.notEqual(faseMarSuperior(0,false),faseMarSuperior(3,false));
let depth=0,calls=[];
const ctx=new Proxy({save(){depth++;},restore(){depth--;},createRadialGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:(...args)=>calls.push([k,args]);}});
const draw=(t,reduced)=>{calls=[];desenharMarSuperior(ctx,2.5,t,reduced,{left:-400,right:1800,top:-1000,bottom:-100});return JSON.stringify(calls);};
assert.notEqual(draw(0,false),draw(3,false),'negative-Y sea is alive');assert.equal(draw(0,true),draw(3,true),'negative-Y reduced motion stable');assert.equal(depth,0);
console.log('Cirúrgico: 5 refinos sem mudança de escala, cristal livre da cabana, 5 árvores removidas, props separados e mar negativo animado/estável OK.');
