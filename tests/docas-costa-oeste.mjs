import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { docas, ESCALA_DOCAS } from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import { plantaCais } from '../js/data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { COSTA_OESTE as costa, ESCADA_OESTE, SPRITES_COSTA_OESTE, plantaCosta } from '../js/data/worlds/arquipelago-rotas-perdidas/costa-oeste-docas.js';
import { quadroTentaculo } from '../js/engine/docas-costa-view.js';
import { canStandAt, moveWithCollision } from '../js/game/collision.js';
import { state } from '../js/game/state.js';

assert.equal(docas.costaOeste,costa);
// A lanterna da proa e o mastro de ré do primeiro lote continuam no mesmo lugar.
for(const [referencia,primeiroLote] of [[[416,550],[201,232]],[[544,410],[386,24]]]){
  const a=plantaCosta(referencia),b=plantaCais(primeiroLote);
  assert(Math.hypot(a[0]-b[0],a[1]-b[1])<6,'encaixe entre os dois recortes');
}
const camadas=[costa.mar,costa.areia,...costa.rochas,...costa.vegetacao,costa.tentaculo,ESCADA_OESTE];
for(const {id,src} of SPRITES_COSTA_OESTE){
  const asset=readFileSync(src),d=camadas.find(p=>`docas_costa_${p.id}`===id);
  let largura,altura;
  if(src.endsWith('.webp')){
    assert.equal(asset.toString('ascii',0,4),'RIFF');
    assert.equal(asset.toString('ascii',8,16),'WEBPVP8X');
    assert(asset[20]&0x10,'WebP preserva alfa');
    largura=asset.readUIntLE(24,3)+1;altura=asset.readUIntLE(27,3)+1;
  }else{
    assert(asset.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert.equal(asset[25],6);
    largura=asset.readUInt32BE(16);altura=asset.readUInt32BE(20);
  }
  assert.equal(largura,2*d.w*(d.colunas??1));
  assert.equal(altura,2*d.h*(d.quadros?Math.ceil(d.quadros/d.colunas):1));
}
assert.equal(quadroTentaculo(costa.tentaculo,null),0,'movimento reduzido mantém a pose de repouso');
const p=costa.tentaculo,quadro=i=>quadroTentaculo(p,p.duracao*(i+.1)/p.quadros);
assert.deepEqual(Array.from({length:p.quadros},(_,i)=>quadro(i)),Array.from({length:p.quadros},(_,i)=>i));
assert.equal(quadroTentaculo(p,p.duracao),0,'loop retoma a pose inicial');

state.world.currentMap=docas;state.objects=[];state.actors=[];
const player={...docas.spawnPoints.inicio};
const grade=(p)=>plantaCosta(p).map((v,i)=>v*ESCALA_DOCAS/(i?22:64));
for(const point of [costa.tentaculo.base,[140,380],[175,307],[452,387],[791,457]]){
  assert(!canStandAt(docas,...grade(point),.25,player),`água/rocha não vira piso: ${point}`);
}
for(const point of [[470,340],[345,283],[275,270],[259,203],[699,459]]){
  assert(canStandAt(docas,...grade(point),.25,player),`faixa de areia navegável: ${point}`);
}
const start=[Math.floor(player.x),Math.floor(player.y)],fim=grade([275,270]).map(Math.floor);
const key=([x,y])=>`${x},${y}`,queue=[start],cameFrom=new Map([[key(start),null]]);
for(let i=0;i<queue.length && !cameFrom.has(key(fim));i++){
  const [x,y]=queue[i];
  for(const next of [[x,y-1],[x-1,y],[x,y+1],[x+1,y]]){
    if(cameFrom.has(key(next))||!canStandAt(docas,next[0]+.5,next[1]+.5,.25,player))continue;
    cameFrom.set(key(next),queue[i]);queue.push(next);
  }
}
assert(cameFrom.has(key(fim)),'deve existir um caminho entre o cais e o extremo da areia');
const rota=[];
for(let item=fim;item;item=cameFrom.get(key(item)))rota.unshift(item);
for(const [x,y] of [...rota,...rota.slice(0,-1).reverse()]){
  moveWithCollision(docas,player,x+.5-player.x,y+.5-player.y,.25);
  assert(Math.hypot(player.x-x-.5,player.y-y-.5)<.01);
}
console.log('Costa oeste: registro da referência, poses, borda bloqueada e ida/volta entre areia e cais OK.');
