import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/rota-mare.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';
import { podeNadar, criarEstadoNado, atualizarNado } from '../js/game/nado.js';
import { getCoastFieldForMap } from '../js/engine/coast-field.js';
import { controlarSolturaAposSubida } from '../js/game/nado-voo.js';
import { iniciarMissoesEncontros, encontroProximo, realizarEncontro, encontroConcluido, posicaoEncontro, direcaoEncontro } from '../js/game/encontros-mare.js';
import { getQuestState, startQuest } from '../js/game/quests.js';

globalThis.window={addEventListener(){},removeEventListener(){}};
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
for (const n of ['tartaruga-resgate','arraia-curiosa','peixe-guia','rede-perdida','coral-ferido','coral-restaurado','eco-perola','anel-cuidado','bolhas-subida','respiro-superficie']) {
  const path=`assets/sprites/mare-encontros/${n}.png`;assert(existsSync(path) && statSync(path).size<200000,`sprite ${n}`);
}
assert.equal(map.encontrosMare.length,6);
for(const ponto of map.encontrosMare) assert(podeNadar(map,ponto.x,ponto.y),`${ponto.id} debaixo d'água`);
state.progress={archetype:'mare_astral', flags:{rota_livre_enseada_aberta:true}, inventory:[],nado:{nivel:4,respeito:0,provas:{}}};
state.save.loaded=false;await loadMap(map.id,'vindo_da_enseada');
const player=state.player, n=criarEstadoNado();player.nado=n;
const ir=id=>{const p=map.encontrosMare.find(e=>e.id===id);player.x=p.x;player.y=p.y;};
ir('tartaruga');
assert.equal(iniciarMissoesEncontros(map,player,state.progress),false,'não cria missões na superfície');
assert.equal(realizarEncontro(map,player,state.progress),null,'não interage na superfície');
Object.assign(n,{ativo:true,submerso:true,profundidade:1.7});
state.progress.archetype='motor_bio_forja'; assert.equal(realizarEncontro(map,player,state.progress),null,'rota não concede ações a outro arquétipo');
state.progress.archetype='mare_astral';
assert(iniciarMissoesEncontros(map,player,state.progress));
assert(!iniciarMissoesEncontros(map,player,state.progress),'não reinicia missões');
assert.equal(encontroProximo(map,player,state.progress).item.id,'tartaruga');
assert.equal(realizarEncontro(map,player,state.progress).ok,false,'tartaruga aguarda retirada da rede');
assert(!encontroConcluido(state.progress,'tartaruga'));
startQuest(state.progress,'mare_salva_vidas');
ir('rede');assert.equal(realizarEncontro(map,player,state.progress).id,'rede');
assert.equal(realizarEncontro(map,player,state.progress),null,'rede não conta duas vezes');
// Recarregar no meio não repõe a rede nem reinicia o contador.
Object.assign(state.save,{loaded:true,activeSlot:1,profileName:'Maré'});assert(saveGame());
state.progress={};assert(loadSaveIntoState(1));await loadMap(map.id,'vindo_da_enseada');
assert(encontroConcluido(state.progress,'rede'));assert.equal(getQuestState(state.progress,'jardim_de_retorno').objectives[0].current,1);
state.player.nado=n;
ir('tartaruga');assert.equal(realizarEncontro(map,player,state.progress).id,'tartaruga');
assert.equal(getQuestState(state.progress,'mare_salva_vidas').objectives[0].current,1);
assert.equal(state.progress.faunaCurada,1);assert(state.progress.nado.respeito>0);
const turtle=map.encontrosMare.find(e=>e.id==='tartaruga');
assert.deepEqual(posicaoEncontro(turtle,state.progress,0,true),posicaoEncontro(turtle,state.progress,30,true));
assert.notDeepEqual(posicaoEncontro(turtle,state.progress,0),posicaoEncontro(turtle,state.progress,30));
ir('coral');const garden=realizarEncontro(map,player,state.progress);
assert.equal(garden.concluidas[0].id,'jardim_de_retorno');assert.equal(getQuestState(state.progress,'jardim_de_retorno').status,'completed');
for (const id of ['arraia','peixe','perola']) { ir(id); assert.equal(realizarEncontro(map,player,state.progress).id,id); }
assert.equal(getQuestState(state.progress,'testemunhas_do_azul').status,'completed');
assert.equal(encontroProximo(map,player,state.progress,Infinity),null);
assert.deepEqual(state.progress.inventory.sort(),['registro_jardim_mare','registro_testemunhas_azul']);
assert.equal(state.progress.completedQuests.filter(id=>id==='jardim_de_retorno').length,1);
// Round-trip, incluindo estados visuais e missões completas.
Object.assign(state.save,{loaded:true,activeSlot:1,profileName:'Maré'});assert(saveGame());
state.progress={};assert(loadSaveIntoState(1));await loadMap(map.id,'vindo_da_enseada');
assert(encontroConcluido(state.progress,'coral'));assert(encontroConcluido(state.progress,'tartaruga'));
assert.equal(getQuestState(state.progress,'testemunhas_do_azul').status,'completed');
ir('coral');state.player.nado=n;assert.equal(realizarEncontro(map,player,state.progress),null);
// S ascende mesmo com Espaço segurado, sem mergulhar de novo até soltá-lo.
const dirPlayer={x:0,y:0,nado:{perspectiva3d:true,voo:{heading:0}}};
assert.equal(direcaoEncontro(dirPlayer,{x:1,y:0}),'↑');
assert.equal(direcaoEncontro(dirPlayer,{x:0,y:1}),'→');
assert.equal(direcaoEncontro(dirPlayer,{x:-1,y:0}),'↓');
const controle={};assert(controlarSolturaAposSubida(controle,true,true));
assert(controlarSolturaAposSubida(controle,false,true));assert(!controlarSolturaAposSubida(controle,false,false));
assert(!controlarSolturaAposSubida(controle,false,true));
const field=getCoastFieldForMap(map);n.profundidade=1.8;n.submerso=true;n.ativo=true;
atualizarNado(n,{map,x:24,y:15,field,dt:.05,arvore:state.progress.nado,mareAstral:true,mergulhar:false});
assert(n.subindoVisual,'bolhas seguem subida física');
console.log('Encontros: duas missões, ordem, exclusividade, save, retorno e subida sem remergulho OK.');
