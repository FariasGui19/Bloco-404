import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';
import { canStandAt } from '../js/game/collision.js';
import { state } from '../js/game/state.js';

const obj = id => { const o=map.objects.find(v=>v.id===id); assert(o,id); return o; };
for (const [name,id] of [['cais-barco','cais_enseada_visual'],['pedras','travessia_pedras_agua'],['rede','rede_treino_praia_enseada']]) {
  assert(existsSync(`assets/sprites/enseada-cais-revisao/${name}.png`));
  assert(existsSync(`assets/sprites/enseada-cais-revisao/${name}-fonte.png`));
  assert.equal(obj(id).bloqueia,false);
}
assert.equal(obj('cais_enseada_visual').sprite,'enseada_cais_barco');
assert.equal(obj('travessia_pedras_agua').sprite,'enseada_cais_pedras');
assert.equal(obj('rede_treino_praia_enseada').sprite,'enseada_cais_rede');
// Amostras abaixo da marcação são água também na grade de colisão.
for (const [x,y] of [[29,63],[36,63],[41,62],[46,60],[48,57]]) {
 assert('YyDdX'.includes(map.aguaPraia[y][x]),`corte ${x},${y} em água`);
 assert.equal(map.walkMask[y][x],'#');
}
const opts={celulasGrama:map.celulasGrama,ajusteSolo:map.ajusteSolo,
 ajusteSoloCentral:map.ajusteSoloCentral,ajusteSoloSudeste:map.ajusteSoloSudeste,
 trilhaEstacaoPortal:map.trilhaEstacaoPortal,areiaPraiaSul:map.areiaPraiaSul};
const surface=createBeachSurface(map.aguaPraia,8,opts);
for(const [x,y] of [[35.72,56.63],[41.73,55.77],[43.79,51.31],[42.24,45.99]]) {
 const i=(Math.floor(y*8)*surface.width+Math.floor(x*8))*4;
 assert(surface.pixels[i]>surface.pixels[i+1] && surface.pixels[i+3]===255,`areia em ${x},${y}`);
}
// Interações do setor continuam acessíveis a partir da ilha sem andar sobre água.
state.objects=map.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));
const spawn=map.spawnPoints.vindo_da_praia,queue=[[Math.round(spawn.x*2),Math.round(spawn.y*2)]],seen=new Set(),reach=[];
for(let i=0;i<queue.length;i++){
 const [a,b]=queue[i],key=`${a},${b}`;if(seen.has(key))continue;seen.add(key);
 const x=a/2,y=b/2;if(!canStandAt(map,x,y,.2,state.player))continue;reach.push([x,y]);
 queue.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);
}
for(const id of ['rede_treino_praia_enseada','travessia_pedras_agua','cais_madeira_pesca_enseada','barco_expedicao_enseada']) {
 const o=obj(id);assert(reach.some(([x,y])=>Math.hypot(x-o.x-.5,y-o.y-.5)<=o.interacao.distancia),`${id} acessível`);
}
console.log('Praia sul: corte, areia, peças e interações OK.');
// Pés aproximados dos seis postes, medidos no sprite já posicionado:
// os dois pares de entrada ficam na praia, o par da ponta sobre água.
const cais=obj('cais_enseada_visual');
const ancoraX=cais.x+.5, ancoraY=cais.y+.5;
for (const [dx,dy,emTerra] of [[-174,-138,true],[-111,-179,true],[-120,-108,true],[-48,-139,true],[-56,-75,false],[2,-109,false]]) {
 const x=ancoraX+(dy/16+dx/32)/2, y=ancoraY+(dy/16-dx/32)/2;
 const tile=map.aguaPraia[Math.floor(y)]?.[Math.floor(x)] ?? '';
 assert(emTerra ? 'SMT'.includes(tile) : 'YyDdX'.includes(tile),`pé do cais em ${x},${y}: ${tile}`);
}
assert.equal(obj('rede_treino_praia_enseada').larguraPx,205);
