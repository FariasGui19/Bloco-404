import assert from 'node:assert/strict';
import {docas,cabanaOeste,cabanaLeste,galpao} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {state} from '../js/game/state.js';
import {canStandAt} from '../js/game/collision.js';
import {findNearestInteraction} from '../js/game/interactions.js';
import {CROMATICA_MAPS,iniciarMareCromatica,registrarMareCromatica,recompilarMareCromatica,abrirEstacaoCromatica,estabilizarAncoraCromatica,lerMareCromatica} from '../js/game/mare-cromatica.js';
for(const map of [docas,cabanaOeste,cabanaLeste,galpao]){
 assert(CROMATICA_MAPS.includes(map.id));state.world.currentMap=map;state.world.currentMapId=map.id;state.objects=map.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));state.portals=map.portals;state.actors=[];state.collectibles=[];state.fauna=[];state.progress={flags:{},archetype:'mare_astral'};
 const spawn=map.spawnPoints.inicio;assert(canStandAt(map,spawn.x,spawn.y,.25,state.player),`${map.id}: spawn seguro`);
 const queue=[[Math.floor(spawn.x),Math.floor(spawn.y)]],seen=new Set([queue[0].join(',')]),hits=new Set();
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];state.player.x=x+.5;state.player.y=y+.5;const n=findNearestInteraction();if(n)hits.add(n.data.id);for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const X=x+dx,Y=y+dy,k=X+','+Y;if(!seen.has(k)&&canStandAt(map,X+.5,Y+.5,.25,state.player)){queue.push([X,Y]);seen.add(k);}}}
 for(const o of [...state.objects,...state.portals])assert(hits.has(o.id),`${map.id}: ${o.id} inacessível por colisão/prioridade`);
 for(const [key,pos] of Object.entries(map.spawnPoints))assert(canStandAt(map,pos.x,pos.y,.25,state.player),`${map.id}: spawn ${key}`);
}
const p={archetype:'mare_astral',flags:{}};assert(iniciarMareCromatica(p));for(const f of ['costa','acampamento','estacao'])assert(registrarMareCromatica(p,'fragmentos',f));for(const f of ['casa','vigilia'])assert(registrarMareCromatica(p,'fitas',f));assert(recompilarMareCromatica(p));assert(abrirEstacaoCromatica(p));for(const a of ['origem','retorno','memoria'])assert(registrarMareCromatica(p,'paineis',a));assert.equal(estabilizarAncoraCromatica(p),'total');assert.equal(lerMareCromatica(p).sincronizacao,4);
console.log('Docas: rotas, prioridades, spawns, interiores e estado da missão OK.');
assert.equal(docas.meta.docasCamadas,true);assert(!docas.meta.docasReferencia);assert.equal(docas.geometriaDocas.escala,2.5);assert.equal(docas.estruturasDocas.filter(o=>!o.id.startsWith('lote3_')&&!o.id.startsWith('lote5_')&&!o.id.startsWith('lote6_')&&!o.id.startsWith('lote7_')&&!o.id.startsWith('lote8_')&&!o.id.startsWith('lote9_')&&!o.id.startsWith('lote10_')&&!o.id.startsWith('lote11_')&&!['palmeira','mata','caixas'].includes(o.id)).length,10);assert(docas.layout.length>=100 && docas.layout[0].length>=62);
