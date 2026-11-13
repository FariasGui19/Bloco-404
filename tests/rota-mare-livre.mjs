// node --experimental-default-type=module tests/rota-mare-livre.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/rota-mare.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { moveWithCollision, canStandAt } from '../js/game/collision.js';
import { criarEstadoNado, atualizarNado, aguaDoDegrau, podeNadar } from '../js/game/nado.js';
import { getCoastFieldForMap } from '../js/engine/coast-field.js';
import { usePortal } from '../js/game/portals.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { posicaoVidaRota } from '../js/game/vida-rota-mare.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.document = { getElementById() { return null; } };
state.save.loaded = false;
state.progress = { archetype:'mare_astral', flags:{rota_livre_enseada_aberta:true}, nado:{nivel:4,provas:{},respeito:.3} };
for (const name of ['tartaruga','arraia','golfinho','cardume','agua-viva','cavalo-marinho','peixe-lanterna','alga','espuma-respiro','bolhas']) assert(existsSync(`assets/sprites/rota-mare/${name}.png`));
for (const i of map.vidaRota) assert(podeNadar(map,i.x,i.y),`${i.tipo} deve viver na água`);
assert.deepEqual(posicaoVidaRota(map.vidaRota[0],0,10,true),posicaoVidaRota(map.vidaRota[0],0,20,true));
assert.notDeepEqual(posicaoVidaRota(map.vidaRota[0],0,10),posicaoVidaRota(map.vidaRota[0],0,20));
const agua=aguaDoDegrau(4), field=getCoastFieldForMap(map);
for (const [spawn,target] of [['vindo_da_enseada',44.5],['vindo_da_darsena',3.5]]) {
  await loadMap(map.id,spawn);
  const entity=state.player; assert(canStandAt(map,entity.x,entity.y,.25,entity));
  const start=entity.x, dir=Math.sign(target-start), n=criarEstadoNado();
  let viuAgua=false;
  for (let step=0;step<600 && Math.abs(entity.x-target)>.15;step++) {
    moveWithCollision(map,entity,dir*.09,0,.25,agua);
    atualizarNado(n,{map,x:entity.x,y:entity.y,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhoLivre:true,mergulhar:false});
    if(n.ativo) viuAgua=true;
  }
  assert(viuAgua && Math.abs(entity.x-target)<.15,`travessia de ${spawn} chega à outra margem sem teleporte: ${entity.x}`);
  assert.equal(findNearestInteraction()?.data.id,dir>0?'rota_mare_para_darsena':'rota_mare_para_enseada');
}
// O fôlego é consumido submerso, recarrega após emergir e dispara o efeito uma vez.
const n=criarEstadoNado(); n.ar=12;
for(let i=0;i<40;i++) atualizarNado(n,{map,x:24.5,y:15.5,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:true});
assert(n.submerso && n.ar<11);
const baixo=n.ar;
let viuRespiro=false;
for(let i=0;i<30;i++) { atualizarNado(n,{map,x:24.5,y:15.5,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:false}); viuRespiro ||= n.respiroVisual>0; }
assert(!n.submerso && n.ar>baixo && viuRespiro);
for(let i=0;i<50;i++) atualizarNado(n,{map,x:24.5,y:15.5,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:true});
assert(n.ar < n.arMax,'Maré Astral ainda precisa respirar');
await loadMap('ilha_enseada_ecos','vindo_da_darsena_mare');
const gate=state.portals.find(p=>p.id==='retorno_darsena_mare');
state.progress.flags.rota_livre_enseada_aberta=false;
assert.equal(await usePortal(gate),false,'não atravessa com flag fechada');
state.progress.flags.rota_livre_enseada_aberta=true; state.progress.archetype='motor_bio_forja';
assert.equal(await usePortal(gate),false,'não atravessa com outro arquétipo');
Object.assign(state.player,{x:gate.x+.5,y:gate.y+.5});
assert.match(getInteractionPrompt(findNearestInteraction()),/INATIVO/);
// Portal real e round-trip do save: recomeça na margem de entrada, nunca no vazio.
state.progress.archetype='mare_astral'; state.world.portalLockUntil=0;
assert(await usePortal(gate));
assert.equal(state.world.currentMapId,map.id); assert.equal(state.world.currentSpawnId,'vindo_da_enseada');
const store=new Map(); globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
Object.assign(state.save,{loaded:true,activeSlot:1,profileName:'Maré'});
assert(saveGame()); state.progress={}; state.world.currentMapId='hub_saguao';
assert(loadSaveIntoState(1)); assert(state.progress.flags.rota_livre_enseada_aberta);
assert.equal(state.world.currentMapId,map.id); assert.equal(state.world.currentSpawnId,'vindo_da_enseada');
await loadMap(state.world.currentMapId,state.world.currentSpawnId);
assert(canStandAt(map,state.player.x,state.player.y,.25,state.player),'retorno de save na margem segura');
state.world.portalLockUntil=0;
const destino=state.portals.find(p=>p.id==='rota_mare_para_darsena');
assert(await usePortal(destino)); assert.equal(state.world.currentMapId,'sala_mare');
console.log('Rota de Maré: travessia bidirecional, fôlego, superfície, fauna, portões e save OK.');
