// Percurso automatizado pela geometria real, sem teleporte entre objetivos.
// A invulnerabilidade isola navegação e progressão do balanceamento de combate.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ARCHIVES,CITADEL_DECOR,CITADEL_NULL_MONITORS } from '../js/data/worlds/cidadela-404/cidadela.js';
import { inspectCitadelMonitor,crtCount,ARCHETYPE_READINGS } from '../js/game/cidadela-narrativa.js';
import { getQuestState } from '../js/game/quests.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { KEYS,wallAt,canMove,nearestInteraction,updateCitadel,getCitadelRuntime,clearCitadelRuntime, citadelSpriteFrame, wrapCitadelText } from '../js/game/cidadela-fps.js';
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
globalThis.document={getElementById:()=>null};
state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';
state.progress={archetype:'mare_astral',inventory:['preservado'],flags:{cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true},activeQuest:{id:'embarque_dimensional',stage:'limiar_preparado',status:'active'}};
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

// Estados visuais não apagam os sinais de perigo, mesmo com movimento reduzido.
const imp={type:'imp',hp:55,moving:true};
assert.equal(citadelSpriteFrame(imp,0,false),'imp_walk_a');assert.equal(citadelSpriteFrame(imp,.5,false),'imp_walk_b');
assert.equal(citadelSpriteFrame(imp,.5,true),'imp');
assert.equal(citadelSpriteFrame({...imp,windup:.5},.5,true),'imp_attack');
assert.equal(citadelSpriteFrame({...imp,hp:0},.5,false),'imp_death');
assert.equal(citadelSpriteFrame({type:'nulo'},0,false),'nulo_a');assert.equal(citadelSpriteFrame({type:'nulo'},4,false),'nulo_b');assert.equal(citadelSpriteFrame({type:'nulo'},4,true),'nulo_a');
for(const n of ['imp-passo-a','imp-passo-b','echovore-passo-a','echovore-passo-b','orbe-movimento-a','orbe-movimento-b','nulo-transmissao-a','nulo-transmissao-b','reator-pulso','gerador-pulso']){
 const path=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6);
}
const long='A '.repeat(70)+'FINAL';assert(wrapCitadelText(long).every(line=>line.length<=66));assert.equal(wrapCitadelText(long).join(' '),long.trim());
assert(wrapCitadelText('X'.repeat(150)).every(line=>line.length<=66));
for(const a of Object.keys(ARCHETYPE_READINGS)) {
 const p={archetype:a,inventory:['preservado'],flags:{}};
 const texts=CITADEL_NULL_MONITORS.map(m=>inspectCitadelMonitor(p,m));assert.equal(crtCount(p),3);
 assert(texts.every(t=>t.changed));assert.equal(getQuestState(p,'cidadela_transmissoes_crt').status,'completed');assert(p.flags.cidadela_crts_completos);
 const xp=JSON.stringify(p.archetypeProgress);const repeat=inspectCitadelMonitor(p,CITADEL_NULL_MONITORS[0]);assert(!repeat.changed);assert.equal(JSON.stringify(p.archetypeProgress),xp);
 assert.match(repeat.followup,new RegExp(a==='mare_astral'?'MARÉ':a==='nucleo_dez_forma'?'NÚCLEO':a==='lamina_dominio_anciao'?'DOMÍNIO':'BIO-FORJA'));
 assert.deepEqual(p.inventory,['preservado']);
}
// Percurso e interação reais, com save parcial e releitura pós-vitória.
g.enemies=[];state.player.invulnerable=100000;
for(const monitor of CITADEL_NULL_MONITORS)assert(canMove(map,state.progress.flags,monitor.x,monitor.y,.1));
function visit(m){walkTo(m.x,m.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,'crt');interact();}
visit(CITADEL_NULL_MONITORS[1]);assert.equal(crtCount(state.progress),1);assert.equal(g.radioQueue.length,2); // nível local e leitura do arquétipo
input.pressed.add('p');step();const waiting=g.messageTime;step(50);assert.equal(g.messageTime,waiting,'pausa preserva falas');input.pressed.add('p');step();
step(215);assert.match(g.message,/SINTONIA LOCAL/);step(185);assert.match(g.message,/MARÉ:/);assert.equal(g.radioQueue.length,0);
assert(loadSaveIntoState(1));assert.equal(crtCount(state.progress),1);assert.equal(getQuestState(state.progress,'cidadela_transmissoes_crt').status,'active');
await loadMap('cidadela_404');clearCitadelRuntime();step();getCitadelRuntime().angle=0;
for(const i of [2,0])visit(CITADEL_NULL_MONITORS[i]);
assert.equal(crtCount(state.progress),3);assert(state.progress.flags.cidadela_crts_completos);
const xp=JSON.stringify(state.progress.archetypeProgress);visit(CITADEL_NULL_MONITORS[0]);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
assert.equal(state.progress.activeQuest.id,'embarque_dimensional');assert.equal(state.progress.activeQuest.status,'active');
assert(loadSaveIntoState(1));assert.equal(getQuestState(state.progress,'cidadela_transmissoes_crt').status,'completed');
state.progress.flags.cidadela_estavel=true;state.progress.flags.cidadela_final_visto=true;await loadMap('cidadela_404');clearCitadelRuntime();step();getCitadelRuntime().angle=0;
visit(CITADEL_NULL_MONITORS[0]);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
console.log('Cidadela: CRTs, arquétipos, fila de diálogo, releitura, animação e save OK.');
