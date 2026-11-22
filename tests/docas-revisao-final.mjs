import assert from 'node:assert/strict';
import {docas,cabanaOeste,cabanaLeste,galpao} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {INTERIORES_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores.js';
import {podePisarDocas} from '../js/game/docas-navigation.js';
import {state} from '../js/game/state.js';
import {canStandAt,moveWithCollision} from '../js/game/collision.js';
import {findNearestInteraction} from '../js/game/interactions.js';
import {desenharPisoInteriorDocas,desenharParedesInteriorDocas,desenharChaoInteriorDocas,desenharMobiliaDocas} from '../js/engine/docas-interiores.js';
import {DOCAS_FOLEY,sintetizarFoley,criarPaisagemDocas,atualizarPaisagemDocas} from '../js/game/docas-paisagem-sonora.js';
const world=([x,y])=>({x:x*2.5/64,y:y*2.5/22});
state.objects=[];state.actors=[];
const routes=[
 [[620,650],[690,620],[760,590],[800,565],[835,550],[875,530]],
 [[980,420],[1005,390],[1030,360],[1055,340],[1080,318],[1105,298],[1120,285],[1100,275],[1075,262],[1047,246],[1029,222],[1018,196],[1015,180],[988,196]],
 [[1000,180],[1040,167],[1080,167],[1100,179],[1120,185],[1150,190],[1180,200],[1220,208],[1250,198]],
];
for(const route of routes){
 const actor=world(route[0]);
 for(const pt of [...route,...route.slice(0,-1).reverse()]){
  const target=world(pt);assert(canStandAt(docas,target.x,target.y,.25,actor),pt+' standable');
  moveWithCollision(docas,actor,target.x-actor.x,target.y-actor.y,.25);
  assert(Math.hypot(actor.x-target.x,actor.y-target.y)<1e-6,pt+' direct segment and return without snag');
 }
}
for(const pt of [[1087,228],[1090,250],[1145,238],[900,330],[760,630],[980,690]]){const {x,y}=world(pt);assert(!canStandAt(docas,x,y,.25),pt+' cliff/water is not a shortcut');}
// Synthetic union regression: overlapping/collinear edges never make an
// internal wall; a narrow notch must still catch a circle (old 32-ray hole).
const area=poly=>({poly}),nav={escala:1,pisos:[area([[0,0],[128,0],[128,64],[0,64]]),area([[64,0],[192,0],[192,64],[64,64]])],obstaculos:[]};
assert(podePisarDocas(nav,1.5,1,.25),'overlap union');
assert(!podePisarDocas(nav,.1,1,.25),'full body stays on floor');
const notch={escala:1,pisos:[area([[0,0],[4,0],[4,2.021],[2.241,2.021],[2.241,2.027],[4,2.027],[4,4],[0,4]].map(([x,y])=>[x*64,y*22]))],obstaculos:[]};
assert(!podePisarDocas(notch,2,2,.25),'thin inlet between old radial probes must block the body');
assert(!podePisarDocas({...nav,obstaculos:[area([[95,20],[97,20],[97,22],[95,22]])]},1.5,1,.25),'small solid');
let interactions=0,solid=0;
for(const map of [cabanaOeste,cabanaLeste,galpao]){
 state.world.currentMap=map;state.world.currentMapId=map.id;state.objects=map.objects.map(o=>({...o,x:o.x+.5,y:o.y+.5}));state.portals=map.portals;state.progress={flags:{},archetype:'mare_astral'};
 const spawn=map.spawnPoints.inicio;assert(canStandAt(map,spawn.x,spawn.y,.25));
 const queue=[[Math.floor(spawn.x*2),Math.floor(spawn.y*2)]],seen=new Set([queue[0].join(',')]),hits=new Set();
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];state.player.x=(x+.5)/2;state.player.y=(y+.5)/2;const near=findNearestInteraction();if(near)hits.add(near.data.id);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,k=X+','+Y;if(seen.has(k)||!canStandAt(map,(X+.5)/2,(Y+.5)/2,.25,state.player))continue;const actor={x:state.player.x,y:state.player.y};moveWithCollision(map,actor,dx/2,dy/2,.25);if(Math.hypot(actor.x-(X+.5)/2,actor.y-(Y+.5)/2)>.001)continue;seen.add(k);queue.push([X,Y]);}
 }
 for(const o of [...state.objects.filter(o=>o.interacao),...state.portals]){assert(hits.has(o.id),o.id+' accessible with furniture');interactions++;}
 for(const o of state.objects.filter(o=>o.docasProp)){assert(!canStandAt(map,o.x,o.y,.25),o.id+' solid');solid++;}
 assert.equal(state.objects.filter(o=>o.docasHero).length,1,'one generated hero asset per room');
}
// Missing optional artwork must retain procedural furniture and Canvas balance.
let depth=0;const canvas=new Proxy({save(){depth++;},restore(){depth--;assert(depth>=0);},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
const beforeState=JSON.stringify(state);
for(const map of [cabanaOeste,cabanaLeste,galpao]){
 assert(desenharPisoInteriorDocas(canvas,map,2,2));assert(desenharParedesInteriorDocas(canvas,map,state));desenharChaoInteriorDocas(canvas,map,state);
 for(const o of map.objects.filter(o=>o.docasProp))assert(desenharMobiliaDocas(canvas,{...o,x:o.x+.5,y:o.y+.5},state));
}
assert.equal(depth,0);assert.equal(JSON.stringify(state),beforeState,'interior drawing never writes gameplay/save state');
const node=()=>({gain:{setTargetAtTime(v){this.value=v;}},pan:{setTargetAtTime(){}},connect(){},start(){}});
const ctx={createGain:node,createStereoPanner:node,createBufferSource:node,createBuffer(c,n){const data=new Float32Array(n);return {getChannelData:()=>data};}};
const channels=criarPaisagemDocas(ctx,node());assert.equal(channels.length,10);
for(const room of Object.values(INTERIORES_DOCAS)){
 atualizarPaisagemDocas(channels,1,room.sound,false);assert(channels.find(c=>c.kind==='interior').gain.gain.value>0);assert(channels.find(c=>c.kind==='pressagio').gain.gain.value>0);
 atualizarPaisagemDocas(channels,2,null,false);assert(channels.every(c=>c.gain.gain.value===0));
}
for(const kind of ['pressagio','interior','cordame','interferencia','goteira']){assert(DOCAS_FOLEY.includes(kind));const pcm=sintetizarFoley(kind,2000);assert.deepEqual(pcm,sintetizarFoley(kind,2000));assert(pcm.some(v=>Math.abs(v)>.02));assert(pcm.every(v=>Number.isFinite(v)&&Math.abs(v)<.6));assert(Math.abs(pcm[0])<.001&&Math.abs(pcm.at(-1))<.001);}
console.log(`Docas final: three direct exterior round trips; three furnished interiors; ${solid} solids, ${interactions} accessible interactions/exits; ten opt-in audio layers, deterministic bounded horror textures and pause fades OK.`);
