import assert from 'node:assert/strict';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {state} from '../js/game/state.js';
import {canStandAt,moveWithCollision,hitsWall,tileAt} from '../js/game/collision.js';
import {podePisarDocas} from '../js/game/docas-navigation.js';
import {findNearestInteraction} from '../js/game/interactions.js';
state.world.currentMap=docas;state.world.currentMapId=docas.id;
state.objects=docas.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));state.portals=docas.portals;state.actors=[];state.fauna=[];state.collectibles=[];state.progress={flags:{},archetype:'mare_astral'};
const nav=docas.navegacaoDocas,step=.25,r=.25,start=docas.spawnPoints.inicio;
const queue=[[Math.floor(start.x/step),Math.floor(start.y/step)]],seen=new Set([queue[0].join(',')]),hits=new Set(),sectors=new Set();let moves=0;
for(let i=0;i<queue.length;i++){
 const [x,y]=queue[i],px=(x+.5)*step,py=(y+.5)*step;
 state.player.x=px;state.player.y=py;
 const interaction=findNearestInteraction();if(interaction)hits.add(interaction.data.id);
 const plantX=px*64/nav.escala,plantY=py*22/nav.escala;
 if(plantX<460)sectors.add('oeste');if(plantY>620)sectors.add('pier');if(plantX>1300&&plantY>440)sectors.add('torre');if(plantX>800&&plantY>460&&plantY<520)sectors.add('patio');if(plantX>1000&&plantY<370)sectors.add('subida');if(plantX<1000&&plantY<215)sectors.add('farol');if(plantX>1200&&plantY<250)sectors.add('nucleo');
 for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
  const X=x+dx,Y=y+dy,k=X+','+Y,nx=(X+.5)*step,ny=(Y+.5)*step;
  if(seen.has(k)||!canStandAt(docas,nx,ny,r,state.player))continue;
  const actor={x:px,y:py};moveWithCollision(docas,actor,dx*step,dy*step,r);
  if(Math.hypot(actor.x-nx,actor.y-ny)>1e-8)continue;
  assert(canStandAt(docas,actor.x,actor.y,r,actor));moves++;seen.add(k);queue.push([X,Y]);
 }
}
for(const o of [...state.objects,...state.portals])assert(hits.has(o.id),o.id+' reachable by real substepped movement');
assert.equal(sectors.size,7,JSON.stringify([...sectors]));
for(const p of nav.obstaculos){
 const x=p.poly.reduce((v,a)=>v+a[0],0)/p.poly.length*nav.escala/64,y=p.poly.reduce((v,a)=>v+a[1],0)/p.poly.length*nav.escala/22;
 assert(hitsWall(docas,x,y,r),p.id+' solid center');
}
for(const [x,y] of [[0,0],[600,780],[1450,500],[900,330],[1500,150]])assert(!podePisarDocas(nav,x*2.5/64,y*2.5/22,r),'deep water/cliff blocked');
for(const [x,y,radius] of [[NaN,3,0],[3,Infinity,0],[3,4,-1]])assert(!podePisarDocas(nav,x,y,radius));
// A continuous map must not quantize sub-tile coordinates back to centers.
assert.notEqual(tileAt(docas,0,0),tileAt(docas,start.x,start.y));
console.log(`Docas: ${moves} real movement edges; seven sectors, every interaction/door and final anchor reachable; ${nav.obstaculos.length} solid footprints and water/cliff probes blocked.`);
