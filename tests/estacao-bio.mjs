import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
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
// Teste de conectividade real inclui hitboxes no runtime, não apenas walkMask.
const runtimeSeen = new Set(), queue = [[9,10]];
for (let i=0; i<queue.length; i++) {
  const [x,y] = queue[i], key=`${x},${y}`;
  if (runtimeSeen.has(key) || !canStandAt(map,x+.5,y+.5,.28,state.player)) continue;
  runtimeSeen.add(key); queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
}
for (const item of map.collectibles) {
  assert([...runtimeSeen].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x-item.x,y-item.y)<=1.25;}),`${item.id}: acesso real à interação`);
}
assert(runtimeSeen.has('8,10'),'retorno acessível mesmo com as estruturas');
assert(state.objects.find(o=>o.id==='bio_terminal_principal').bloqueia);
assert(state.objects.find(o=>o.id==='bio_reator_patio').bloqueia);
assert(state.objects.find(o=>o.id==='bio_estufa_principal').bloqueia);
assert.equal(state.objects.filter(o=>o.sprite==='bio_reator').length,1);
for (const id of ['bio_ponte_patio','bio_ponte_estufa']) {
  const bridge=state.objects.find(o=>o.id===id);
  assert(bridge && bridge.camada==='fundo' && !bridge.bloqueia, `${id}: travessia visual sem bloquear`);
  assert(canStandAt(map,bridge.x,bridge.y,.28,state.player),`${id}: centro atravessável`);
}
assert(!state.objects.some(o=>o.id==='bio_entrada_portal'), 'portal genérico antigo não deve voltar');
assert(await loadMap('hub_saguao')); setZoom(.3); assert.equal(camera.targetZoom,.3);
console.log('Estação Bio: caminhos, objetivos, retorno, gate e zoom OK.');
