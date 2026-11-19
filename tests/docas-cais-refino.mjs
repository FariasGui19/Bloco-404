import assert from 'node:assert/strict';
import { criarOndasCais } from '../js/engine/docas-mar.js';
import { docas, ESCALA_DOCAS } from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import { canStandAt } from '../js/game/collision.js';
import { state } from '../js/game/state.js';
const polys=docas.geometriaDocas.terraPolys??docas.geometriaDocas.polys;
const ondas=criarOndasCais(polys);
assert.deepEqual(ondas,criarOndasCais(polys));
assert(ondas.length>50 && ondas.length<=1000);
state.world.currentMap=docas;state.objects=[];state.actors=[];
for(const id of ['tentaculo-cais','bote-cais']){
 const m=docas.marDocas.find(x=>x.id===id);assert(m,`${id} ausente`);
 assert.equal(canStandAt(docas,m.x*ESCALA_DOCAS/64,m.y*ESCALA_DOCAS/22,.25),false,`${id} deve estar fora do piso`);
}
assert(!docas.estruturasDocas.some(x=>x.id==='lote6_bote'));
for(const id of ['cais_rochas','cais_cristais'])assert(docas.estruturasDocas.some(x=>x.id===id));
console.log('Cais: ondas determinísticas, bote e tentáculo no mar e peças costeiras OK.');
