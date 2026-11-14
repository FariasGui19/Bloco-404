// Percurso automatizado pela geometria real, sem teleporte entre objetivos.
// A invulnerabilidade isola navegação e progressão do balanceamento de combate.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ARCHIVES,CITADEL_DECOR,CITADEL_POSTGAME,CITADEL_BREACHES,CITADEL_BREACH_CONSOLE } from '../js/data/worlds/cidadela-404/cidadela.js';
import { sealedFlag, cacheFlag, breachSummary } from '../js/game/cidadela-fendas.js';
import { citadelMissions } from '../js/game/cidadela-missoes.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { usePortal } from '../js/game/portals.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { KEYS,wallAt,canMove,visible,nearestInteraction,updateCitadel,getCitadelRuntime,clearCitadelRuntime } from '../js/game/cidadela-fps.js';
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


for(const b of CITADEL_BREACHES) {
  assert(canMove(map,state.progress.flags,b.x,b.y,.1));assert(canMove(map,state.progress.flags,b.cache.x,b.cache.y,.1));
  for(const [x,y] of b.spawns)assert(canMove(map,state.progress.flags,x,y,.1));
}
for(const name of ['fenda-instavel','fenda-selada','cofre-fechado','cofre-aberto','imp-colapso','orbe-colapso','echovore-colapso','impacto-disparo','onda-fenda','terminal-estabilizacao']) {
 const file=`assets/sprites/cidadela-404/${name}.png`;assert(existsSync(file));assert.equal(readFileSync(file)[25],6,`${name} com transparência`);
}
function go(o,kind){walkTo(o.x,o.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,kind);interact();}
const [first,second,third]=CITADEL_BREACHES;
go(CITADEL_BREACH_CONSOLE,'breach_console');assert.match(g.message,/FENDAS SELADAS 0/);
go(first.cache,'breach_cache');assert.match(g.message,/BLOQUEADO/);assert(!state.progress.flags[cacheFlag(first.id)]);
go(first,'breach');assert.equal(g.breach.wave,1);assert.equal(g.enemies.length,0);assert.equal(breachSummary(state.progress).quest.status,'active');
// Pausa congela preparação; cancelar remove apenas os ecos da tentativa.
input.pressed.add('p');step();const before=g.breach.prep;step(80);assert.equal(g.breach.prep,before);input.pressed.add('p');step();
step(65);assert.equal(g.enemies.length,2);for(const e of g.enemies){assert(Math.hypot(e.x-state.player.x,e.y-state.player.y)>1.3);e.cooldown=999;}
// A fenda não dispara em cima do jogador nem através de cobertura.
g.breach.pulse=0;step(20);assert.equal(g.breach.windup,0);assert(!g.shots.some(s=>s.kind==='breach_shot'));
Object.assign(state.player,{x:5.5,y:5.5});assert(!visible(map,state.progress.flags,first.x,first.y,state.player.x,state.player.y));
g.breach.pulse=0;step(20);assert.equal(g.breach.windup,0);assert(!g.shots.some(s=>s.kind==='breach_shot'));
// O pulso é avisado antes de aparecer, com física de projétil real.
walkTo(5.5,7.5);
let guard=0;while(!g.breach.windup && guard++<180)step();assert(g.breach.windup>0);assert.match(g.message,/PULSO EM PREPARAÇÃO/);
guard=0;while(!g.shots.some(s=>s.kind==='breach_shot') && guard++<45)step();assert(g.shots.some(s=>s.kind==='breach_shot'));
go(first,'breach');assert.equal(g.breach,null);assert.equal(g.enemies.length,0);assert.equal(g.shots.length,0);assert(!state.progress.flags[sealedFlag(first.id)]);
// A morte cancela a tentativa e não sela nem dá recompensa.
interact();step(65);state.player.health=0;state.player.deathTimer=.01;step();
assert.equal(g.breach,null);assert.equal(g.enemies.length,0);assert(!state.progress.flags[sealedFlag(first.id)]);
state.player.invulnerable=100000;go(first,'breach');step(65);
// Recomeça e termina a primeira fenda usando os disparos normais.
guard=0;
while(g.breach && guard++<2200){
 const living=g.enemies.filter(e=>e.hp>0);if(living.length){const e=living[0];g.angle=Math.atan2(e.y-state.player.y,e.x-state.player.x);input.keys.space=true;}else input.keys.space=false;
 step();
}
input.keys.space=false;assert(guard<2200,'ondas precisam ser vencíveis com arma normal');assert(state.progress.flags[sealedFlag(first.id)]);assert(g.localProgress.achieved.includes(sealedFlag(first.id)));
assert(loadSaveIntoState(1));assert(state.progress.flags[sealedFlag(first.id)]);assert(!state.progress.flags[cacheFlag(first.id)]);
await loadMap('cidadela_404');clearCitadelRuntime();step();getCitadelRuntime().angle=0;
const xpBefore=JSON.stringify(state.progress.archetypeProgress);go(first.cache,'breach_cache');assert(state.progress.flags[cacheFlag(first.id)]);assert(getCitadelRuntime().localProgress.achieved.includes(cacheFlag(first.id)));assert.notEqual(JSON.stringify(state.progress.archetypeProgress),xpBefore);
let xpAfter=JSON.stringify(state.progress.archetypeProgress);interact();assert.equal(JSON.stringify(state.progress.archetypeProgress),xpAfter);
// Abandonar uma fenda pela saída não a sela; selos anteriores sobrevivem.
go(second,'breach');step(65);assert(getCitadelRuntime().breach);walkTo(2.5,6.5);state.world.portalLockUntil=0;interact();
await new Promise(r=>setTimeout(r,1000));assert.equal(state.world.currentMapId,'estacao_limiar_666');
state.world.portalLockUntil=0;assert(await usePortal({id:'travessia_666',destino:{mapId:'cidadela_404',spawnId:'inicio'}}));
clearCitadelRuntime();step();getCitadelRuntime().angle=0;
assert(!getCitadelRuntime().breach);assert(!state.progress.flags[sealedFlag(second.id)]);assert(state.progress.flags[cacheFlag(first.id)]);
// As demais ondas usam dano controlado para isolar persistência e objetivos.
for(const b of [second,third]) {
 go(b,'breach');const r=getCitadelRuntime();step(65);assert.equal(r.enemies.filter(e=>e.hp>0).length,2);
 for(const e of r.enemies){e.hp=0;e.death=0;}step();assert.equal(r.breach.wave,2);step(65);assert.equal(r.enemies.filter(e=>e.hp>0).length,3);
 for(const e of r.enemies){e.hp=0;e.death=0;}step();assert(state.progress.flags[sealedFlag(b.id)]);go(b.cache,'breach_cache');assert(state.progress.flags[cacheFlag(b.id)]);
}
assert.equal(breachSummary(state.progress).quest.status,'completed');assert(state.progress.flags.cidadela_fendas_concluidas);
xpAfter=JSON.stringify(state.progress.archetypeProgress);go(first,'breach');assert.equal(getCitadelRuntime().breach,null);go(first.cache,'breach_cache');assert.equal(JSON.stringify(state.progress.archetypeProgress),xpAfter);
assert(loadSaveIntoState(1));assert.equal(breachSummary(state.progress).caches,3);assert.equal(breachSummary(state.progress).quest.status,'completed');
console.log('Fendas: percurso, bloqueio, pausa, pulso, cancelamento, combate, saves e XP único OK.');
