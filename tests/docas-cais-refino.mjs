import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarOndasCais } from '../js/engine/docas-mar.js';
import { docas, ESCALA_DOCAS as escala } from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import { plantaCais, SPRITES_CAIS_SUL } from '../js/data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { canStandAt, moveWithCollision } from '../js/game/collision.js';
import { state } from '../js/game/state.js';

const { terraPolys, deckPoly, escadaPoly } = docas.geometriaDocas;
const ondas = criarOndasCais(terraPolys);
assert.deepEqual(ondas, criarOndasCais(terraPolys));
assert(ondas.length > 50 && ondas.length <= 1000);
for (const { id, src } of SPRITES_CAIS_SUL) {
  const png = readFileSync(src);
  const nome = id.replace('docas_cais_sul_', '');
  const peca = [...docas.caisSul.pecas, docas.caisSul.rocha].find(p => p.id === nome);
  assert.equal(png.readUInt32BE(0), 0x89504e47);
  assert.equal(png[25], 6, `${nome} usa transparência RGBA`);
  assert.equal(png.readUInt32BE(16), peca?.w ?? docas.caisSul.largura);
  assert.equal(png.readUInt32BE(20), peca?.h ?? docas.caisSul.altura);
}
for (const id of ['pesqueiro', 'bote', 'deck', 'escada-mare', 'rede']) {
  assert(docas.caisSul.pecas.some(p => p.id === id), `${id} deve estar na cena`);
}
assert(!docas.estruturasDocas.some(p => ['pier', 'barco', 'lote6_bote'].includes(p.id)));

state.world.currentMap = docas; state.objects = []; state.actors = [];
const pos = ([x,y]) => [x*escala/64,y*escala/22];
const player = {...docas.spawnPoints.inicio};
for (const [id,local] of [['pesqueiro',[350,515]],['bote',[1040,415]],['água ao sul',[860,470]],['água atrás da guarda',[800,124]]]) {
  assert(!canStandAt(docas, ...pos(plantaCais(local)), .25, player), `${id} não pode virar piso`);
}
const ilha = pos([860,513]);
const inPoly = ([x,y],p) => p.reduce((inside,[a,b],i) => {
  const [c,d] = p[(i+1)%p.length];
  return (b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a ? !inside : inside;
},false);
const cellPlant = ([x,y]) => [(x+.5)*64/escala,(y+.5)*22/escala];
const cellKey = p => p.join(',');
function encontrarCaminho(permiteCelula) {
  const inicio = [Math.floor(player.x),Math.floor(player.y)];
  const fim = ilha.map(Math.floor), queue = [inicio], prev = new Map([[cellKey(inicio),null]]);
  for (let i=0; i<queue.length; i++) {
    const [x,y] = queue[i];
    if (x===fim[0] && y===fim[1]) {
      const rota=[];
      for (let p=queue[i];p;p=prev.get(cellKey(p))) rota.unshift(p);
      return rota;
    }
    for (const [nx,ny] of [[x,y-1],[x+1,y],[x,y+1],[x-1,y]]) {
      const p = [nx,ny];
      if (!prev.has(cellKey(p)) && permiteCelula(p) && canStandAt(docas,nx+.5,ny+.5,.25,player)) {
        prev.set(cellKey(p),queue[i]); queue.push(p);
      }
    }
  }
}
const soEscada = p => inPoly(p,escadaPoly) && !inPoly(p,deckPoly) && !terraPolys.some(q => inPoly(p,q));
assert.equal(encontrarCaminho(p => !soEscada(cellPlant(p))), undefined, 'sem a escada não deve haver ponte invisível');
const rota = encontrarCaminho(() => true);
assert(rota?.some(p => soEscada(cellPlant(p))), 'rota do spawn à ilha atravessa a escada');
for (const [x,y] of [...rota,...rota.slice(0,-1).reverse()]) {
  moveWithCollision(docas,player,x+.5-player.x,y+.5-player.y,.25);
  assert(Math.hypot(player.x-x-.5,player.y-y-.5)<.01, 'travessia e retorno devem respeitar a colisão real');
}
console.log('Cais sul: recortes, escala, bloqueio dos cascos e rota de ida e volta pela escada OK.');
