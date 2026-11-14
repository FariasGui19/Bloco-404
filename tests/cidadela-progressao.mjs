import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { CITADEL_MILESTONES,CITADEL_LOCAL_KITS } from '../js/data/cidadela-progressao.js';
import { getDimensionProgress,syncDimensionProgress } from '../js/game/dimension-progress.js';
import { map,CITADEL_ARCHIVES } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { updateCitadel,getCitadelRuntime,clearCitadelRuntime,KEYS } from '../js/game/cidadela-fps.js';
const ids=Object.keys(CITADEL_LOCAL_KITS);
for(const id of ids) {
  const flags=Object.fromEntries(CITADEL_MILESTONES.slice(0,14).map(x=>[x,true]));
  const progress={archetype:id,flags,inventory:['tesouro'],archetypeProgress:{[id]:{level:2,xp:9}},tools:{custom:true},dimensionProgress:{outra_dimensao:{preservado:true}}};
  const before=JSON.stringify(progress);assert.equal(getDimensionProgress(progress).score,0);assert.equal(JSON.stringify(progress),before,'ler não altera save');
  const migrated=syncDimensionProgress(progress);assert(migrated.changed);assert.equal(migrated.after.rank,4);assert.equal(migrated.after.score,14);
  const saved=JSON.stringify(progress);assert(!syncDimensionProgress(progress).changed);assert.equal(JSON.stringify(progress),saved,'sincronizar de novo não duplica');
  assert.deepEqual(progress.inventory,['tesouro']);assert.equal(progress.archetypeProgress[id].xp,9);assert.deepEqual(progress.tools,{custom:true});assert(progress.dimensionProgress.outra_dimensao.preservado);
  flags.cidadela_coisa_qualquer=true;assert(!syncDimensionProgress(progress).changed,'flag não registrada não dá marco');
  flags[CITADEL_MILESTONES[0]]=false;assert.equal(getDimensionProgress(progress).score,14,'marcos salvos são monotônicos');
  assert.equal(getDimensionProgress(progress,'outro_mundo'),null);
}
// Saves antigos com missão concluída, mas sem flag de recompensa, migram
// somente marcos locais, sem modificar diário, XP ou recompensas.
{
 const p={archetype:'mare_astral',flags:{},questLog:{cidadela_rede_escuta:{status:'completed',claimed:true,counters:[1,1,1,1]},cidadela_vozes_estatica:{status:'completed',claimed:true,counters:[1,1,1,1]}},inventory:['original']};
 const log=JSON.stringify(p.questLog);syncDimensionProgress(p);assert.equal(getDimensionProgress(p).score,2);assert.equal(JSON.stringify(p.questLog),log);assert.deepEqual(p.inventory,['original']);assert(!syncDimensionProgress(p).changed);
 p.archetype='motor_bio_forja';assert.equal(getDimensionProgress(p).score,0,'outro kit mantém registro próprio');syncDimensionProgress(p);assert.equal(getDimensionProgress(p).score,2,'conquistas do mundo são compartilhadas na migração');p.archetype='mare_astral';assert.equal(getDimensionProgress(p).score,2);
}
for(const [score,rank,next] of [[0,1,4],[3,1,4],[4,2,9],[8,2,9],[9,3,14],[13,3,14],[14,4,null],[19,4,null],[22,4,null],[23,4,null]]) {
 const p={archetype:'mare_astral',flags:Object.fromEntries(CITADEL_MILESTONES.slice(0,score).map(x=>[x,true]))};
 syncDimensionProgress(p);const actual=getDimensionProgress(p);assert.equal(actual.score,score);assert.equal(actual.rank,rank);assert.equal(actual.next,next);
}
for(const name of ['mare-corrente','mare-sonar','nucleo-vetor','nucleo-carga','dominio-corte','dominio-guarda','bio-blindagem','bio-reparo','emblema','nexo']) {
 const path=`assets/sprites/cidadela-404/progressao-${name}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6);
}
const input={keys:{},pressed:new Set(),mouseDeltaX:0,fpsFireHeld:false};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
const press=key=>{input.pressed.add(key);step();};
function start(id,score) {
 // Não marca vitória para testar também a reação do Echovore.
 const flags=Object.fromEntries(CITADEL_MILESTONES.filter(x=>x!=='cidadela_estavel').slice(0,score).map(x=>[x,true]));
 state.progress={archetype:id,inventory:[],flags,archetypeProgress:{[id]:{level:1,xp:0}},tools:{}};
 state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;state.save.loaded=false;
 Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:100,ultimate:{cooldown:0},sinceDamage:0});
 input.keys={};input.pressed.clear();input.fpsFireHeld=false;clearCitadelRuntime();step();
 Object.assign(state.player,{x:4.5,y:5.5,energy:100,sinceDamage:0});const g=getCitadelRuntime();g.angle=0;g.enemies=[];g.boss.dead=true;return g;
}
for(const id of ids) {
 let g=start(id,4),p=state.player;assert.equal(g.localProgress.rank,2);
 const target={type:'imp',x:7.75,y:5.5,hp:100,cooldown:99,slow:0};g.enemies=[target];press('q');
 if(id==='mare_astral') assert(g.shield>=1.2,'maré protege no Q');
 if(id==='nucleo_dez_forma') assert(g.dash>.4 && g.shield>=1,'vetor melhora Q');
 if(id==='lamina_dominio_anciao') assert.equal(target.hp,30,'corte estendido e dano');
 if(id==='motor_bio_forja') assert.equal(g.shield,3.5,'escudo ampliado');
 g=start(id,9);press('shift');assert.equal(g.boost,2.4,'S3 reduz recarga de impulso');
 g=start(id,14);p=state.player;assert.equal(g.localProgress.rank,4);
 const e={type:'imp',x:6.5,y:5.5,hp:100,cooldown:99,slow:0};g.enemies=[e];p.health=50;
 if(id==='motor_bio_forja') {press('q');assert.equal(p.health,58,'reparo cura só durante Q');assert.equal(g.perkIcon,'bio-reparo');}
 if(id==='mare_astral') {press('r');assert(e.slow>3.4);assert(g.echo>11.9 && g.echo<12);assert.equal(g.perkIcon,'mare-sonar');}
 if(id==='lamina_dominio_anciao') {press('r');assert(g.guard>=.8);assert.equal(g.perkIcon,'dominio-guarda');}
 if(id==='nucleo_dez_forma') {
   press('r');assert.equal(g.vectorCharge,5);g.fire=0;press('space');assert.equal(e.hp,60,'carga soma 12 ao tiro');assert.equal(g.vectorCharge,0);
   g.fire=0;press('space');assert.equal(e.hp,32,'carga não se repete');
   Object.assign(p,{x:25.5,y:6.5});g.boss.dead=false;g.boss.hp=280;g.boss.cycle=1;g.enemies=[];g.vectorCharge=5;g.fire=0;press('space');assert.equal(g.boss.hp,280,'blindagem continua válida');
 }
 assert.deepEqual(state.progress.tools,{});assert.equal(state.progress.archetypeProgress[id].xp,0,'sintonia não é XP global');
}
// Guarda bloqueia dano e interferência; escudo reduz dano, morte limpa efeitos
// temporários sem apagar marcos, mesmo após uma tentativa de fenda falhar.
{
 const g=start('lamina_dominio_anciao',14),p=state.player; p.health=80;p.invulnerable=0;press('r');
 g.shots.push({x:p.x,y:p.y,dx:0,dy:0,damage:20,jam:true,counter:'lamina_dominio_anciao',life:2});step();assert.equal(p.health,80);assert.equal(g.jam,0);
 g.guard=0;g.shield=1;p.invulnerable=0;g.shots.push({x:p.x,y:p.y,dx:0,dy:0,damage:20,life:2});step();assert.equal(p.health,72);
 const score=g.localProgress.score;g.vectorCharge=4;g.guard=1;g.shield=1;g.training=true;g.enemies=[];p.health=0;p.deathTimer=.01;step();assert.equal(g.vectorCharge,0);assert.equal(g.guard,0);assert.equal(g.shield,0);assert(!g.training);assert.equal(g.localProgress.score,score);assert(p.health>0);
}
// Registros reais, pausa, save e migração sem repetições.
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
globalThis.document={getElementById:()=>null};state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='SINTONIA';
state.progress={archetype:'mare_astral',flags:{},inventory:['guardado'],activeQuest:{id:'embarque_dimensional',status:'active'}};
await loadMap('cidadela_404');clearCitadelRuntime();input.keys={};step();let g=getCitadelRuntime();g.enemies=[];g.boss.dead=true;state.player.invulnerable=10000;
for(const k of KEYS){Object.assign(state.player,{x:k.x,y:k.y});press('e');}
assert.equal(g.localProgress.score,3);assert.equal(g.localProgress.rank,1);
Object.assign(state.player,{x:CITADEL_ARCHIVES[0].x,y:CITADEL_ARCHIVES[0].y});press('e');assert.equal(g.localProgress.rank,2);assert.equal(g.localProgress.score,4);
press('e');assert.equal(g.localProgress.score,4,'reler não soma');
input.fpsFireHeld=true;press('k');assert.equal(g.panel,'dimension');assert(state.world.fpsPaused);assert(!input.fpsFireHeld);const t=g.time;step(20);assert.equal(g.time,t);press('k');assert(!g.panel);
assert(loadSaveIntoState(1));assert.equal(getDimensionProgress(state.progress).score,4);assert.deepEqual(state.progress.inventory,['guardado']);assert.equal(state.progress.activeQuest.status,'active');
await loadMap('cidadela_404');clearCitadelRuntime();step();g=getCitadelRuntime();assert.equal(g.localProgress.rank,2);
// Uma vitória de simulação conta uma vez, mas não dá XP global repetível.
state.progress.flags.cidadela_estavel=true;const xp=JSON.stringify(state.progress.archetypeProgress);g.enemies=[];g.training=true;step();assert(state.progress.flags.cidadela_treino_concluido);const count=g.localProgress.score;
g.training=true;step();assert.equal(g.localProgress.score,count);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);assert(loadSaveIntoState(1));assert(state.progress.flags.cidadela_treino_concluido);
console.log('Sintonia local: marcos, migração, quatro kits, recargas, pause e save OK.');
