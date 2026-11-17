import assert from 'node:assert/strict';
import {iniciarMareCromatica,lerMareCromatica,registrarMareCromatica,recompilarMareCromatica,abrirEstacaoCromatica,estabilizarAncoraCromatica,avancarMareCromatica,perfilSincronizacao,colapsarMareCromatica} from '../js/game/mare-cromatica.js';
import { superficie,contencao,fenda } from '../js/data/worlds/arquipelago-rotas-perdidas/mare-cromatica.js';
import { map as original } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction } from '../js/game/interactions.js';
import { state } from '../js/game/state.js';
const fresh = () => ({archetype:'mare_astral',flags:{},inventory:['existente']});
const p=fresh(),before=JSON.stringify(p);assert.equal(lerMareCromatica(p).sincronizacao,1);assert.equal(JSON.stringify(p),before,'leitura deve ser pura');
assert(!iniciarMareCromatica({}));assert(iniciarMareCromatica(p));assert(!iniciarMareCromatica(p));
assert.deepEqual(perfilSincronizacao(p,'ilha_enseada_ecos'),{custo:1,recarga:1,alcance:1});
assert.deepEqual(perfilSincronizacao(p,'mare_cromatica_superficie'),{custo:2,recarga:1.6,alcance:.55});
assert(!abrirEstacaoCromatica(p));assert(!registrarMareCromatica(p,'paineis','origem'));
assert(registrarMareCromatica(p,'fragmentos','costa'));assert(!registrarMareCromatica(p,'fragmentos','costa'));
assert(recompilarMareCromatica(p));assert.equal(lerMareCromatica(p).sincronizacao,2);assert(abrirEstacaoCromatica(p));
for(const id of ['origem','retorno','memoria']) assert(registrarMareCromatica(p,'paineis',id));
assert.equal(estabilizarAncoraCromatica(p),'parcial');assert.equal(estabilizarAncoraCromatica(p),null);assert.equal(p.flags.cromatica_ancora_estavel,true);
const total=fresh();iniciarMareCromatica(total);for(const id of ['costa','acampamento','estacao'])registrarMareCromatica(total,'fragmentos',id);recompilarMareCromatica(total);abrirEstacaoCromatica(total);
for(const id of ['casa','vigilia'])registrarMareCromatica(total,'fitas',id);for(const id of ['origem','retorno','memoria'])registrarMareCromatica(total,'paineis',id);
assert.equal(estabilizarAncoraCromatica(total),'total');assert.deepEqual(perfilSincronizacao(total,'mare_cromatica_contencao'),{custo:1,recarga:1,alcance:1});assert.deepEqual(total.inventory,['existente']);
const fail=fresh();iniciarMareCromatica(fail);registrarMareCromatica(fail,'fragmentos','costa');fail.mareCromatica.restante=.05;assert(avancarMareCromatica(fail,.1));assert.equal(lerMareCromatica(fail).desfecho,'colapso');assert(!colapsarMareCromatica(fail));assert(iniciarMareCromatica(fail));assert.equal(lerMareCromatica(fail).restante,600);assert.equal(lerMareCromatica(fail).colapsos,1);assert.deepEqual(lerMareCromatica(fail).fragmentos,['costa']);
assert.equal(original.id,'ilha_enseada_ecos');assert(original.objects.some(o=>o.id==='acampamento_vigilia_enseada'&&o.interacao));
assert.equal(superficie.portals.length,2);assert(!superficie.actors.length);
// Checa a rota e a prioridade real de interação no runtime, não só tiles.
for(const map of [superficie,contencao,fenda]) {
 state.world.currentMap=map;state.objects=map.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));state.portals=map.portals;state.actors=[];state.collectibles=[];state.fauna=[];state.progress.flags={};
 const step=.5,w=map.layout[0].length,h=map.layout.length,start=map.spawnPoints.inicio;
 assert(canStandAt(map,start.x,start.y,.25),`${map.id}: spawn bloqueado`);
 const q=[[Math.round(start.x/step),Math.round(start.y/step)]],seen=new Set(q.map(a=>a.join(','))),found=new Set();
 for(let i=0;i<q.length;i++) {const [x,y]=q[i];state.player.x=x*step;state.player.y=y*step;const n=findNearestInteraction();if(n)found.add(n.data.id);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(a<0||b<0||a>=w/step||b>=h/step||seen.has(k)||!canStandAt(map,a*step,b*step,.25))continue;seen.add(k);q.push([a,b]);}}
 for(const o of [...map.objects.filter(o=>o.id.startsWith('cromatica_')),...map.portals])assert(found.has(o.id),`${map.id}: interação inacessível ${o.id}`);
}
console.log('Maré Cromática: rotas, progressão, resultados, isolamento e redenção OK.');
// Saves antigos e novos preservam as descobertas sem migrar outros sistemas.
const memory=new Map();globalThis.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)??null,removeItem:k=>memory.delete(k)};
const {createNewSave,saveGame,loadSaveIntoState}=await import('../js/game/save.js');
createNewSave(1,'Teste');state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';
state.progress=total;state.world.currentMapId='mare_cromatica_contencao';state.world.currentSpawnId='inicio';assert(saveGame());
state.progress={};assert(loadSaveIntoState(1));assert.equal(lerMareCromatica(state.progress).desfecho,'total');assert.deepEqual(state.progress.inventory,['existente']);
console.log('Maré Cromática: save e carregamento preservam resultado e inventário.');
// A inserção do alerta não deve bloquear os painéis ou o retorno originais.
const { map:estacao }=await import('../js/data/worlds/arquipelago-rotas-perdidas/estacao-666.js');
state.progress.flags={cidadela_estavel:true,frequencia666Registrada:true};state.world.currentMap=estacao;
state.objects=estacao.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));state.portals=estacao.portals;state.actors=[];state.fauna=[];state.collectibles=[];
const queue=[[7,17]],seen=new Set(),found=new Set();
for(let i=0;i<queue.length;i++){const [x,y]=queue[i],key=`${x},${y}`;if(seen.has(key)||!canStandAt(estacao,x/2,y/2,.25))continue;seen.add(key);state.player.x=x/2;state.player.y=y/2;const n=findNearestInteraction();if(n)found.add(n.data.id);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
for(const o of [...estacao.objects.filter(o=>o.interacao),...estacao.portals])assert(found.has(o.id),`Limiar: interação bloqueada ${o.id}`);
console.log('Limiar 66.6: alerta novo e interações antigas acessíveis.');
