// Percurso automatizado pela geometria real, sem teleporte entre objetivos.
// A invulnerabilidade isola navegação e progressão do balanceamento de combate.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ARCHIVES,CITADEL_DECOR } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { KEYS,wallAt,canMove,nearestInteraction,updateCitadel,getCitadelRuntime,clearCitadelRuntime } from '../js/game/cidadela-fps.js';
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
globalThis.document={getElementById:()=>null};
state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';
state.progress={archetype:'mare_astral',inventory:['preservado'],flags:{},activeQuest:{id:'embarque_dimensional',stage:'limiar_preparado',status:'active'}};
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
for(let i=0;i<3;i++) {
  const a=CITADEL_ARCHIVES[i], k=KEYS[i];
  walkTo(a.x,a.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,'archive');interact();assert(state.progress.flags[a.flag]);
  const xpBefore=JSON.stringify(state.progress.archetypeProgress);interact();assert.equal(JSON.stringify(state.progress.archetypeProgress),xpBefore,'rever não concede XP novamente');
  walkTo(k.x,k.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,'key');interact();assert(state.progress.flags[k.flag]);
}
assert(state.progress.flags.cidadela_arquivo_recompensa);const xpArchives=JSON.stringify(state.progress.archetypeProgress);
walkTo(25.5,6.5);g.angle=Math.atan2(g.boss.y-state.player.y,g.boss.x-state.player.x);
input.keys.space=true;for(let i=0;i<1300 && !g.boss.dead;i++)step();input.keys.space=false;
assert(g.boss.dead,'Vigilante deve ser vencível com tiros e recarga em condições controladas');
assert(state.progress.flags.cidadela_estavel);assert(state.progress.flags.cidadela_recompensa);
assert.notEqual(JSON.stringify(state.progress.archetypeProgress),xpArchives);assert.equal(state.progress.activeQuest.status,'completed');
const xpFinal=JSON.stringify(state.progress.archetypeProgress);assert(loadSaveIntoState(1));
for(const a of CITADEL_ARCHIVES) assert(state.progress.flags[a.flag],'arquivo salvo');
assert.equal(JSON.stringify(state.progress.archetypeProgress),xpFinal);assert.deepEqual(state.progress.inventory,['preservado']);
// Após recarregar, a dimensão se mantém estabilizada e pode ser atravessada até a saída.
await loadMap('cidadela_404');clearCitadelRuntime();step();const stable=getCitadelRuntime();assert(stable.boss.dead);assert.equal(stable.enemies.length,0);
walkTo(2.5,6.5);state.world.portalLockUntil=0;interact();await new Promise(r=>setTimeout(r,900));
assert.equal(state.world.currentMapId,'estacao_limiar_666');assert.equal(state.world.currentSpawnId,'vindo_da_cidadela');
console.log('Cidadela: percurso completo a pé, arquivos, recompensa única, chefe, save e retorno OK.');
