import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {canStandAt,moveWithCollision} from '../js/game/collision.js';
import {state} from '../js/game/state.js';
import {ordenarProfundidadeDocas} from '../js/engine/docas-view.js';
const nomes=['falesia-frente','falesia-lateral','rampa-rocha','escada-rocha','plato','muro','cascalho','pilar','passarela','borda'];
for(const nome of nomes){
 const b=readFileSync(`assets/sprites/docas-relevo/${nome}.png`);
 assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${nome}: transparência RGBA`);
 assert((nome==='passarela' && docas.caisSul.pecas.some(p=>p.id==='deck')) || docas.relevoDocas.some(o=>o.id===nome),`${nome}: peça integrada`);
}
state.world.currentMap=docas;state.world.currentMapId=docas.id;state.objects=[];state.actors=[];
const player={x:docas.spawnPoints.inicio.x,y:docas.spawnPoints.inicio.y};
const start=[Math.floor(player.x),Math.floor(player.y)],end=[Math.floor(1190*ESCALA_DOCAS/64),Math.floor(220*ESCALA_DOCAS/22)];
const queue=[start],previous=new Map([[start.join(','),null]]);let found=false;
for(let i=0;i<queue.length;i++){
 const [x,y]=queue[i];if(x===end[0]&&y===end[1]){found=true;break;}
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
  if(!previous.has(key)&&canStandAt(docas,nx+.5,ny+.5,.25,player)){previous.set(key,[x,y]);queue.push([nx,ny]);}
 }
}
assert(found,'deve existir passagem entre píer, vila e platô superior');
const route=[];for(let cur=end;cur;cur=previous.get(cur.join(',')))route.push(cur);route.reverse();
player.x=route[0][0]+.5;player.y=route[0][1]+.5;
for(const [x,y] of route.slice(1)){
 moveWithCollision(docas,player,x+.5-player.x,y+.5-player.y,.25);
 assert(Math.hypot(player.x-x-.5,player.y-y-.5)<.01,'percurso com movimento real não deve ficar preso');
}
// Retorno usa as mesmas restrições físicas, em vez de apenas teleporte.
for(const [x,y] of route.slice(0,-1).reverse()){
 moveWithCollision(docas,player,x+.5-player.x,y+.5-player.y,.25);
 assert(Math.hypot(player.x-x-.5,player.y-y-.5)<.01,'retorno ao píer não deve ficar preso');
}
// Fora da faixa de piso não se atravessa a borda.
const outside={x:docas.spawnPoints.inicio.x,y:docas.spawnPoints.inicio.y};
moveWithCollision(docas,outside,0,40,.25);
assert(outside.y<100,'movimento não atravessa a margem');
// Farol e porta apoiam-se agora em terreno, sem liberar seus interiores.
for(const [x,y] of [[885,225],[970,250]])assert(canStandAt(docas,x*ESCALA_DOCAS/64,y*ESCALA_DOCAS/22,.25,player),'extensão do platô deve ter piso');
assert.deepEqual(ordenarProfundidadeDocas([{id:'estrutura',y:100},{id:'player_atras',y:90},{id:'player_frente',y:110}]).map(o=>o.id),['player_atras','estrutura','player_frente'],'oclusão ordena por pé');
console.log('Relevo: dez peças, conexão navegável por movimento real e bordas seguras OK.');
