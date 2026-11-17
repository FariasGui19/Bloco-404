import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { circleHitsPolygon, getBlockingObject, canStandAt, moveWithCollision } from '../js/game/collision.js';
import { findNearestInteraction } from '../js/game/interactions.js';

// O centro e o raio são testados, incluindo arestas, concavidades e fora.
const rect = [[0,0],[2,0],[2,2],[0,2]], origin = {x:0,y:0};
assert(circleHitsPolygon(1,1,.2,origin,rect));
assert(circleHitsPolygon(2.1,1,.2,origin,rect));
assert(!circleHitsPolygon(2.3,1,.2,origin,rect));
state.world.currentMap = map;
state.objects = map.objects.map(o => ({...o, x:o.x+.5, y:o.y+.5, renderType:'object'}));
state.portals = map.portals.map(p => ({...p, renderType:'portal'}));
state.actors = [];
for (const [x,y,id] of [[10.3,14.9,'colisao_corpo_montanha'],
  [25.4,32.7,'colisao_face_acampamento'], [51.9,29.5,'colisao_face_promontorio']]) {
  assert.equal(getBlockingObject(x,y,.25)?.id,id, `posição da captura ${x},${y}`);
  assert(!canStandAt(map,x,y,.25,state.player));
}
for (const id of ['colisao_corpo_montanha','colisao_face_acampamento','colisao_face_promontorio']) {
  const obj = state.objects.find(o=>o.id===id);
  assert(obj?.superficieSomente && obj.poligonosColisao?.length && obj.renderizar === false);
}
// Árvores bloqueiam pelo pé e não pela copa; exceção da escada não fecha a passagem.
const arvore = state.objects.find(o => o.id === 'enseada_vegetacao_1');
assert(arvore.bloqueia && getBlockingObject(arvore.x,arvore.y,.1));
for (const id of ['espelho_arquetipos_enseada','estela_navegadores_enseada','pedras_fonte_cristal_enseada']) {
  const o=state.objects.find(o=>o.id===id);
  assert(o.bloqueia && getBlockingObject(o.x,o.y,.1), `${id}: colisão`);
}
const piscina = state.objects.find(o=>o.id==='piscina_mare_viva_enseada');
assert(getBlockingObject(piscina.x-1.5,piscina.y-1.5,.1), 'água termal não é piso plano');
// Caminha pela escada real (não apenas verifica os pontos isolados).
const p={x:16.7,y:32.7};
for (const [x,y] of [[16.4,32.4],[16.1,32.1],[15.8,31.8],[15.5,31.5],[15.2,31.2],[14.9,30.9],[14.6,30.6]]) {
  moveWithCollision(map,p,x-p.x,y-p.y,.2);
  assert(Math.hypot(p.x-x,p.y-y)<.001,'escada transitável');
}
// Busca usando colisões efetivas e seletor de interação, a partir da praia.
const start=map.spawnPoints.vindo_da_praia, q=[[Math.round(start.x*2),Math.round(start.y*2)]], seen=new Set(), reach=[];
for(let i=0;i<q.length;i++) {
  const [ix,iy]=q[i], key=`${ix},${iy}`; if(seen.has(key))continue; seen.add(key);
  const x=ix/2,y=iy/2;if(!canStandAt(map,x,y,.2,state.player))continue;reach.push([x,y]);
  q.push([ix+1,iy],[ix-1,iy],[ix,iy+1],[ix,iy-1]);
}
for (const id of ['espelho_arquetipos_enseada','piscina_mare_viva_enseada','gruta_concha_enseada',
  'estela_navegadores_enseada','totem_eco_enseada','jardim_pedras_enseada']) {
  assert(reach.some(([x,y]) => {Object.assign(state.player,{x,y});return findNearestInteraction()?.data.id===id;}), `${id}: interação acessível`);
}
// A faixa arenosa do promontório permanece transitável até a beira d'água.
const rampa = {x:50.1,y:30.3};
for (let i=1;i<=60;i++) {
  const x=50.1+.16*i/60, y=30.3-3.78*i/60;
  moveWithCollision(map,rampa,x-rampa.x,y-rampa.y,.2);
  assert(Math.hypot(rampa.x-x,rampa.y-y)<.02, 'rampa livre entre as faces rochosas');
}

console.log('Relevo, elementos sólidos, escada, rampa e interações da Enseada OK.');
