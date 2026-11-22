import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_WORKSHOP } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { getQuestState } from '../js/game/quests.js';
import { getDimensionProgress } from '../js/game/dimension-progress.js';
import { interactWorkshop,workshopPhase,workshopCount,toggleWorkshopTrial } from '../js/game/cidadela-vigilia.js';
import { wallAt,canMove,nearestInteraction,updateCitadel,clearCitadelRuntime,getCitadelRuntime } from '../js/game/cidadela-fps.js';
for(const name of ['controle-off','controle-on','pulso-aviso','pulso-ativo','terminal','nucleo-apagado','nucleo-vivo','tubos','bancada','sentinela']){const path=`assets/sprites/cidadela-404/vigilia-${name}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6);}
assert.equal(map.layout.length,22);for(const x of [4,5,19,20]){assert.equal(wallAt(map,{},x+.5,11.5),2);assert.equal(wallAt(map,{cidadela_estavel:true},x+.5,11.5),0);}
// Nenhum caminho chega ao anexo sem vitória, nem com as três chaves.
{
 const flags={cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true};const q=[[2,6]],seen=new Set();
 while(q.length){const [x,y]=q.shift(),key=`${x},${y}`;if(seen.has(key)||wallAt(map,flags,x+.5,y+.5))continue;seen.add(key);for(const[dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])q.push([x+dx,y+dy]);}
 assert(!seen.has('5,16')&&!seen.has('25,16'),'as duas entradas exigem vitória');
}
{
 const p={flags:{cidadela_vigilia_concluida:true}},g={breach:{},training:false,workshopTrial:null};assert.match(toggleWorkshopTrial(p,g).message,/FENDA/);assert(!g.workshopTrial);g.breach=null;g.training=true;assert.match(toggleWorkshopTrial(p,g).message,/SIMULAÇÃO/);assert(!g.workshopTrial);
}
assert.equal(workshopPhase(0),'safe');assert.equal(workshopPhase(2.99),'safe');assert.equal(workshopPhase(3),'warning');assert.equal(workshopPhase(4),'active');assert.equal(workshopPhase(5),'safe');
for(const id of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']){
 const p={archetype:id,flags:{},inventory:[]},sw=CITADEL_WORKSHOP.switches[0];assert(!interactWorkshop(p,sw,0).changed);p.flags.cidadela_estavel=true;
 assert(!interactWorkshop(p,sw,3).changed);assert(!p.flags[sw.flag]);assert(interactWorkshop(p,sw,0).changed);const xp=JSON.stringify(p.archetypeProgress);assert(!interactWorkshop(p,sw,0).changed);assert.equal(JSON.stringify(p.archetypeProgress),xp);
}
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};globalThis.document={getElementById:()=>null};
state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='OFICINA';state.progress={archetype:'mare_astral',inventory:['preservado'],flags:{cidadela_estavel:true,cidadela_final_visto:true,cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true},activeQuest:{id:'embarque_dimensional',status:'completed'}};
await loadMap('cidadela_404');clearCitadelRuntime();Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:100000,ultimate:{cooldown:0}});
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};const press=k=>{input.pressed.add(k);step();};step();let g=getCitadelRuntime();g.angle=0;
for(const o of [...CITADEL_WORKSHOP.switches,CITADEL_WORKSHOP.terminal,CITADEL_WORKSHOP.core,...CITADEL_WORKSHOP.decor])assert(canMove(map,state.progress.flags,o.x,o.y,.15),`objeto ${o.id??o.kind??o.type} fora do piso`);
function pathTo(tx,ty){const q=[[Math.floor(state.player.x),Math.floor(state.player.y)]],parent=new Map([[q[0].join(','),null]]);let end;
 for(let i=0;i<q.length;i++){const[x,y]=q[i];if(x===tx&&y===ty){end=[x,y];break;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!parent.has(k)&&!wallAt(map,state.progress.flags,nx+.5,ny+.5)){parent.set(k,[x,y]);q.push([nx,ny]);}}}assert(end,`sem rota ${tx},${ty}`);const path=[];while(end){path.push(end);end=parent.get(end.join(','));}return path.reverse();}
function walkTo(x,y){for(const[cx,cy]of pathTo(Math.floor(x),Math.floor(y)))for(const[axis,target]of[['x',cx+.5],['y',cy+.5]]){let n=0;while(Math.abs(state.player[axis]-target)>.05&&n++<40){input.keys={};const d=target-state.player[axis];input.keys[axis==='x'?(d>0?'w':'s'):(d>0?'d':'a')]=true;step();}assert(n<40,`bloqueado ${cx},${cy}`);}input.keys={};}
function visit(o){walkTo(o.x,o.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,o.kind);}
const first=CITADEL_WORKSHOP.switches[0];visit(first);while(workshopPhase(g.time+.033,first.offset)!=='warning')step();press('e');assert(!state.progress.flags[first.flag]);assert.match(g.message,/AGUARDE/);
press('p');const paused=g.time;step(50);assert.equal(g.time,paused);press('p');while(workshopPhase(g.time+.033,first.offset)!=='safe')step();press('e');assert(state.progress.flags[first.flag]);assert.equal(workshopCount(state.progress),1);assert.equal(getQuestState(state.progress,'cidadela_oficina_vigilia').status,'active');
assert(loadSaveIntoState(1));assert(state.progress.flags[first.flag]);assert.equal(workshopCount(state.progress),1);await loadMap('cidadela_404');clearCitadelRuntime();step();g=getCitadelRuntime();g.angle=0;state.player.invulnerable=100000;
for(const sw of CITADEL_WORKSHOP.switches.slice(1)){visit(sw);let n=0;while(workshopPhase(g.time+.033,sw.offset)!=='safe'&&n++<200)step();assert(n<200);press('e');assert(state.progress.flags[sw.flag]);}
visit(CITADEL_WORKSHOP.terminal);press('e');assert(state.progress.flags.cidadela_vigilia_concluida);assert.equal(getQuestState(state.progress,'cidadela_oficina_vigilia').status,'completed');assert(g.localProgress.achieved.includes('cidadela_vigilia_concluida'));
const xp=JSON.stringify(state.progress.archetypeProgress);press('e');assert.equal(JSON.stringify(state.progress.archetypeProgress),xp,'terminal não paga duas vezes');
const sentinel={kind:'workshop_trial',x:18.3,y:20.2};visit(sentinel);press('e');assert(g.workshopTrial);assert.equal(g.workshopTrial.done.length,0);press('e');assert(!g.workshopTrial,'sentinela cancela');
press('e');assert(g.workshopTrial);state.player.health=0;state.player.deathTimer=.01;step();assert(!g.workshopTrial,'morte cancela ensaio');assert.equal(workshopCount(state.progress),3);
state.player.invulnerable=100000;visit(sentinel);press('e');assert(g.workshopTrial);
for(const [i,sw] of CITADEL_WORKSHOP.switches.entries()) {visit(sw);let n=0;while(workshopPhase(g.time+.033,sw.offset)!=='safe'&&n++<200)step();assert(n<200);press('e');if(i<2)assert.equal(g.workshopTrial.done.length,i+1);}
assert(!g.workshopTrial);assert.match(g.message,/ENSAIO CONCLUÍDO/);assert.equal(workshopCount(state.progress),3);assert.equal(JSON.stringify(state.progress.archetypeProgress),xp,'ensaio repetível não paga XP');
assert(loadSaveIntoState(1));assert.equal(workshopCount(state.progress),3);assert.equal(getQuestState(state.progress,'cidadela_oficina_vigilia').status,'completed');assert(getDimensionProgress(state.progress).achieved.includes('cidadela_vigilia_concluida'));assert.deepEqual(state.progress.inventory,['preservado']);
await loadMap('cidadela_404');clearCitadelRuntime();step();g=getCitadelRuntime();g.angle=0;state.player.invulnerable=100000;walkTo(2.5,6.5);state.world.portalLockUntil=0;press('e');await new Promise(r=>setTimeout(r,900));assert.equal(state.world.currentMapId,'estacao_limiar_666');
// Dano da zona depende da fase, da distância e da linha de visão; defesa e morte.
state.progress.flags[first.flag]=false;await loadMap('cidadela_404');clearCitadelRuntime();step();g=getCitadelRuntime();g.enemies=[];
Object.assign(state.player,{x:first.emitter.x,y:first.emitter.y,health:80,invulnerable:0,sinceDamage:0});g.time=4.05;step();assert.equal(state.player.health,70);assert.equal(state.player.lastDamageSource,'pulso_oficina');
state.player.invulnerable=0;g.workshopHit=0;g.guard=1;step();assert.equal(state.player.health,70,'guarda bloqueia pulso');g.guard=0;g.shield=1;step();assert.equal(state.player.health,66,'escudo reduz pulso');
state.player.invulnerable=0;g.workshopHit=0;g.shield=0;state.player.health=1;step();assert.equal(state.player.health,0);state.player.deathTimer=.01;step();assert(state.player.health>0);assert(state.progress.flags.cidadela_vigilia_ponte,'morte preserva circuito concluído');
console.log('Oficina: acessos, ciclos, percurso a pé, combate, pausas, missão, save e retorno OK.');
