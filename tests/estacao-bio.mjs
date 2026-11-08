import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { setZoom, camera } from '../js/engine/camera.js';
assert.equal(map.layout.length,72); assert(map.layout.every(row=>row.length===72));
const seen=new Set(), q=[[9,10]];
for(let i=0;i<q.length;i++){const [x,y]=q[i],k=`${x},${y}`; if(seen.has(k)||map.walkMask[y]?.[x]!=='.')continue;seen.add(k);q.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
for(const item of map.collectibles) assert(seen.has(`${item.x},${item.y}`),`objetivo ${item.id} acessível`);
assert(seen.has('8,10'));
assert.equal(praia.portals.find(p=>p.id==='trilha_estacao_bio').requiresFlag,'gate_teleferico_quebrado');
assert(praia.spawnPoints.vindo_da_estacao);
state.save.loaded=false;state.save.activeSlot=null;state.progress={flags:{},inventory:[]};
assert(await loadMap(map.id)); setZoom(.3); assert.equal(camera.targetZoom,.85);
assert(await loadMap('hub_saguao')); setZoom(.3); assert.equal(camera.targetZoom,.3);
console.log('Estação Bio: caminhos, objetivos, retorno, gate e zoom OK.');
