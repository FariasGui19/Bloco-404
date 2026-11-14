// Percurso automatizado pela geometria real, sem teleporte entre objetivos.
// A invulnerabilidade isola navegação e progressão do balanceamento de combate.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ARCHIVES,CITADEL_DECOR,CITADEL_POSTGAME } from '../js/data/worlds/cidadela-404/cidadela.js';
import { citadelMissions } from '../js/game/cidadela-missoes.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { KEYS,wallAt,canMove,nearestInteraction,updateCitadel,getCitadelRuntime,clearCitadelRuntime } from '../js/game/cidadela-fps.js';
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
globalThis.document={getElementById:()=>null};
state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';
state.progress={archetype:'mare_astral',inventory:['preservado'],flags:{cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true,cidadela_estavel:true,cidadela_final_visto:true},activeQuest:{id:'embarque_dimensional',stage:'limiar_preparado',status:'active'}};
state.world.portalLockUntil=0;await loadMap('cidadela_404');clearCitadelRuntime();
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:100000,ultimate:{cooldown:0}});
const input={keys:{},pressed:new Set(),mouseDeltaX:0};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
step();const g=getCitadelRuntime();g.angle=0;
for(const o of [...CITADEL_ARCHIVES,...CITADEL_DECOR]) assert(canMove(map,{cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true},o.x,o.y,.1),`objeto ${o.id??o.type} fora do piso`);
for(const name of ['gerador','caixa','barril','drone','coluna','reator','terminal','antena','ventilacao','sinalizador']) {
  const p=`assets/sprites/cidadela-404/prop-${name}.png`;assert(existsSync(p));assert.equal(readFileSync(p)[25],6,`${name} deve ter transparência`);
}
// Encontra centros transitáveis com as portas no estado real do save.
function pathTo(tx,ty) {
  const p=state.player, flags=state.progress.flags, start=[Math.floor(p.x),Math.floor(p.y)];
  const queue=[start], parent=new Map([[start.join(','),null]]);let end;
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i]; if(x===tx&&y===ty){end=[x,y];break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
      if(!parent.has(k)&&!wallAt(map,flags,nx+.5,ny+.5)){parent.set(k,[x,y]);queue.push([nx,ny]);}
    }
  }
  assert(end,`sem rota para ${tx},${ty}`);const path=[];
  while(end){path.push(end);end=parent.get(end.join(','));}return path.reverse();
}
function walkTo(x,y) {
  const path=pathTo(Math.floor(x),Math.floor(y));
  for(const [cx,cy] of path) for(const [axis,target] of [['x',cx+.5],['y',cy+.5]]) {
    let guard=0;
    while(Math.abs(state.player[axis]-target)>.05 && guard++<40) {
      const delta=target-state.player[axis];
      input.keys={};input.keys[axis==='x'?(delta>0?'w':'s'):(delta>0?'d':'a')]=true;
      step();
    }
    assert(guard<40,`colisão impediu ${axis} no percurso para ${cx},${cy}`);
  }
  input.keys={};
}
function interact() {input.pressed.add('e');step();}

const post=CITADEL_POSTGAME;
function visit(o,kind=o.kind) {
  walkTo(o.x,o.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,kind,`alvo ${kind} alcançável`);interact();
}
assert(g.boss.dead);assert.equal(g.enemies.length,0);
input.pressed.add('j');step();assert.equal(g.panel,'missions');assert(state.world.fpsPaused);
input.pressed.add('j');step();assert.equal(g.panel,null);assert(!state.world.fpsPaused);
// Missões não aceitam objetos prematuramente nem descontam recursos.
visit(post.reles[0]);assert.equal(citadelMissions(state.progress).rede.status,'available');
visit(post.transmissor);assert.equal(citadelMissions(state.progress).vozes.status,'available');
visit(post.sonda);assert.equal(citadelMissions(state.progress).rede.status,'active');
for(const i of [2,0,1]) visit(post.reles[i]);
assert.equal(citadelMissions(state.progress).reles,3);
const before=JSON.stringify(state.progress.archetypeProgress);visit(post.sonda);
assert(state.progress.flags.cidadela_rede_concluida);assert(getCitadelRuntime().localProgress.achieved.includes('cidadela_rede_concluida'));assert.notEqual(JSON.stringify(state.progress.archetypeProgress),before);
const after=JSON.stringify(state.progress.archetypeProgress);visit(post.sonda);assert.equal(JSON.stringify(state.progress.archetypeProgress),after);
visit(post.transmissor);assert.equal(citadelMissions(state.progress).vozes.status,'active');
visit(post.registros[1]);assert.equal(citadelMissions(state.progress).registros,1);
assert(loadSaveIntoState(1));assert.equal(citadelMissions(state.progress).registros,1,'missão parcial persistida');
await loadMap('cidadela_404');clearCitadelRuntime();step();
for(const i of [0,2]) visit(post.registros[i]);
visit(post.transmissor);assert(state.progress.flags.cidadela_vozes_concluida);assert(getCitadelRuntime().localProgress.achieved.includes('cidadela_vozes_concluida'));
const xp=JSON.stringify(state.progress.archetypeProgress);visit(post.transmissor);visit(post.registros[0]);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
visit(post.treino);let runtime=getCitadelRuntime();assert(runtime.training);assert.equal(runtime.enemies.length,3);
visit(post.treino);assert(!runtime.training);assert.equal(runtime.enemies.length,0);
visit(post.treino);runtime.enemies.forEach(e=>{e.hp=0;e.death=0});step();assert(!runtime.training);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
assert(loadSaveIntoState(1));assert.equal(citadelMissions(state.progress).vozes.status,'completed');
await loadMap('cidadela_404');clearCitadelRuntime();step();assert.equal(getCitadelRuntime().enemies.length,0);
walkTo(2.5,6.5);state.world.portalLockUntil=0;interact();await new Promise(r=>setTimeout(r,900));assert.equal(state.world.currentMapId,'estacao_limiar_666');
console.log('Cidadela pós-vitória: percurso, duas missões, save, recompensas únicas, treino e saída OK.');
