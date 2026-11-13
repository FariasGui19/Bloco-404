import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/rota-mare.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { moveWithCollision } from '../js/game/collision.js';
import { criarEstadoNado, atualizarNado, aguaDoDegrau, podeNadar } from '../js/game/nado.js';
import { getCoastFieldForMap } from '../js/engine/coast-field.js';
import { usePortal } from '../js/game/portals.js';
import { atualizarPassagemNado } from '../js/game/passagem-nado.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { cartaMare } from '../js/ui/rota-mare-hud.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';

globalThis.window={addEventListener(){},removeEventListener(){}};
globalThis.document={getElementById(){return null;}};
state.save.loaded=false;
state.progress={archetype:'mare_astral',flags:{rota_livre_enseada_aberta:true,gate_comporta_aquario_mare:true},nado:{nivel:4,provas:{},respeito:.3}};
for(const name of ['darsena-marinha','baliza-navegacao','alga-longa','alga-vermelha','peixe-recife','peixe-abissal','lula-astral','coral-profundo','rocha-arco','esteira-nado']) assert(existsSync(`assets/sprites/oceano-vivo/${name}.png`));
assert(map.aguaPraia.length>=56 && map.aguaPraia[0].length>=96);
assert(map.aguaPraia.every(r=>/^D+$/.test(r)),'rota é mar, sem ilhas artificiais');
for(const item of [...map.vidaRota,...map.fundoMar,...map.encontrosMare]) assert(podeNadar(map,item.x,item.y));
const agua=aguaDoDegrau(4), field=getCoastFieldForMap(map);
// Travessia diagonal em ambos sentidos, com colisão real e sem apertar E.
for(const [spawn,target] of [['vindo_da_enseada',{x:87.5,y:30.5}],['vindo_da_darsena',{x:2.5,y:15.5}]]) {
 await loadMap(map.id,spawn);
 const p=state.player, n=criarEstadoNado();
 for(let i=0;i<1400 && Math.hypot(p.x-target.x,p.y-target.y)>.15;i++) {
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
  moveWithCollision(map,p,dx/d*.09,dy/d*.09,.25,agua);
  atualizarNado(n,{map,x:p.x,y:p.y,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhoLivre:true,mergulhar:false});
 }
 assert(n.ativo && Math.hypot(p.x-target.x,p.y-target.y)<.15,`travessia livre ${spawn}`);
 assert.notEqual(findNearestInteraction()?.data.id,spawn==='vindo_da_enseada'?'rota_mare_para_darsena':'rota_mare_para_enseada','passagem aberta não exige E');
}
const n=criarEstadoNado(); n.ar=12;
for(let i=0;i<40;i++) atualizarNado(n,{map,x:24.5,y:15.5,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:true});
assert(n.submerso && n.ar<11);const baixo=n.ar;let respiro=false;
for(let i=0;i<30;i++){atualizarNado(n,{map,x:24.5,y:15.5,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:false});respiro ||= n.respiroVisual>0;}
assert(!n.submerso && n.ar>baixo && respiro);
const c=cartaMare(map,{x:56,y:32},'vindo_da_enseada');assert.equal(c.x,.5);assert.equal(c.y,.5);assert.equal(c.destino.nome,'DÁRSENA');
assert.equal(cartaMare(map,{x:56,y:32},'vindo_da_darsena').destino.nome,'ENSEADA');
// O acesso continua protegido; quando bloqueado, explica o motivo por E.
await loadMap('ilha_enseada_ecos','vindo_da_darsena_mare');
const gate=state.portals.find(p=>p.id==='retorno_darsena_mare');
// A zona da Enseada é alcançável por água a partir da costa.
Object.assign(state.player,{x:24.5,y:15.5});
for(let i=0;i<100;i++) {const dx=28.5-state.player.x,dy=12.5-state.player.y,d=Math.hypot(dx,dy);if(d<.1)break;moveWithCollision(state.world.currentMap,state.player,dx/d*.08,dy/d*.08,.25,agua);}
assert(Math.hypot(state.player.x-28.5,state.player.y-12.5)<.2,'passagem da Enseada acessível nadando');
state.progress.flags.rota_livre_enseada_aberta=false; assert.equal(await usePortal(gate),false);
state.progress.flags.rota_livre_enseada_aberta=true;state.progress.archetype='motor_bio_forja';assert.equal(await usePortal(gate),false);
Object.assign(state.player,{x:gate.x+.5,y:gate.y+.5}); assert.match(getInteractionPrompt(findNearestInteraction()),/INATIVO/);
state.progress.archetype='mare_astral';state.world.portalLockUntil=0;state.player.nado={...criarEstadoNado(),ativo:true,ar:7,profundidade:1.6,submerso:true};
// Inicializar fora da zona, entrar e disparar a troca automática.
Object.assign(state.player,{x:26.5,y:12.5});assert.equal(atualizarPassagemNado(),false);
Object.assign(state.player,{x:28.5,y:12.5});assert(await atualizarPassagemNado());
assert.equal(state.world.currentMapId,map.id);assert.equal(state.player.nado.ar,7,'troca não restaura ar');
// Entrada da base: colisão e zona no mesmo ponto, sem prompt.
state.world.portalLockUntil=0;Object.assign(state.player,{x:84,y:30.5});atualizarPassagemNado();
Object.assign(state.player,{x:87.5,y:30.5});assert(await atualizarPassagemNado());
assert.equal(state.world.currentMapId,'sala_mare'); assert.equal(state.player.nado.ar,7);
// A comporta já aberta permite emergir e sair do aquário para a base.
for(let i=0;i<65;i++) moveWithCollision(state.world.currentMap,state.player,-.05,0,.25,agua);
assert(state.player.x<14.5,'aquário acessível a partir da base');
for(let i=0;i<85;i++) moveWithCollision(state.world.currentMap,state.player,.05,0,.25,agua);
assert(state.player.x>18.0,'arco acessível nadando a partir da base');
state.world.portalLockUntil=0;assert.equal(atualizarPassagemNado(),false,'chegada não rebate automaticamente');
// Ir para o outro lado da zona e voltar oferece o retorno nadando.
Object.assign(state.player,{x:16.7,y:5.5});atualizarPassagemNado();
Object.assign(state.player,{x:18.5,y:5.5});assert(await atualizarPassagemNado());
assert.equal(state.world.currentSpawnId,'vindo_da_darsena');
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
Object.assign(state.save,{loaded:true,activeSlot:1,profileName:'Maré'});assert(saveGame());state.progress={};state.world.currentMapId='hub_saguao';
assert(loadSaveIntoState(1));assert(state.progress.flags.rota_livre_enseada_aberta);assert.equal(state.world.currentMapId,map.id);
await loadMap(state.world.currentMapId,state.world.currentSpawnId);assert(podeNadar(map,state.player.x,state.player.y));
console.log('Mar aberto: rotas nadáveis, passagem automática, carta 2D, fôlego e save OK.');
