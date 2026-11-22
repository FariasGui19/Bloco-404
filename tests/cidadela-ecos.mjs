// Atravessa os setores reais a pé e testa a leitura em risco, save e retorno.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ECHOES,CITADEL_ECHO_TERMINAL } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { loadSaveIntoState } from '../js/game/save.js';
import { getQuestState } from '../js/game/quests.js';
import { memoryEchoCount,interactMemoryEcho,useEchoTerminal } from '../js/game/cidadela-ecos.js';
import { getDimensionProgress } from '../js/game/dimension-progress.js';
import { updateCitadel,clearCitadelRuntime,getCitadelRuntime,nearestInteraction,wallAt,canMove,KEYS } from '../js/game/cidadela-fps.js';
for(const name of ['eco-ressonante','eco-liberado','ancora-silencio','ancora-ativa','gravador-perdido','mapa-sinal','terminal-ecos','terminal-ecos-ativo','luz-emergencia','rele-memoria']) {
  const path=`assets/sprites/cidadela-404/${name}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6,`${name}: PNG com alfa`);
}
for(const id of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']) {
 const p={archetype:id,flags:{},inventory:[]};
 assert(!interactMemoryEcho(p,CITADEL_ECHOES[0],false).changed);assert.equal(memoryEchoCount(p),0);
 for(const e of [CITADEL_ECHOES[2],CITADEL_ECHOES[0],CITADEL_ECHOES[1]]) assert(interactMemoryEcho(p,e,true).changed);
 assert.equal(getQuestState(p,'cidadela_ecos_entre_tempos').status,'completed');
 const snapshot=JSON.stringify(p);assert(!interactMemoryEcho(p,CITADEL_ECHOES[0],false).changed);assert.equal(JSON.stringify(p),snapshot);
 const g={echo:80,echoTerminalCooldown:0},player={energy:90,maxEnergy:100};
 useEchoTerminal(p,g,player);assert.equal(player.energy,100);assert.equal(g.echo,45);assert.equal(g.echoTerminalCooldown,45);
 player.energy=20;useEchoTerminal(p,g,player);assert.equal(player.energy,20,'recarga impede repetição imediata');
 g.echoTerminalCooldown=0;g.echo=0;player.energy=100;useEchoTerminal(p,g,player);assert.equal(g.echoTerminalCooldown,0,'não desperdiça recarga');
}
const store=new Map();globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
globalThis.document={getElementById:()=>null};state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='ECOS';
state.progress={archetype:'mare_astral',inventory:['guardado'],flags:{},activeQuest:{id:'embarque_dimensional',status:'active'}};
await loadMap('cidadela_404');clearCitadelRuntime();Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:100000,ultimate:{cooldown:0}});
const input={keys:{},pressed:new Set(),mouseDeltaX:0};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
const press=k=>{input.pressed.add(k);step();};step();let g=getCitadelRuntime();g.enemies=[];g.angle=0;
for(const e of [CITADEL_ECHO_TERMINAL,...CITADEL_ECHOES]) assert(canMove(map,{cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true},e.x,e.y,.2));
function pathTo(tx,ty) {
 const queue=[[Math.floor(state.player.x),Math.floor(state.player.y)]],parent=new Map([[queue[0].join(','),null]]);let end;
 for(let i=0;i<queue.length;i++) {const [x,y]=queue[i];if(x===tx&&y===ty){end=[x,y];break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!parent.has(k)&&!wallAt(map,state.progress.flags,nx+.5,ny+.5)){parent.set(k,[x,y]);queue.push([nx,ny]);}}}
 assert(end,`eco alcançável: ${tx},${ty}`);const path=[];while(end){path.push(end);end=parent.get(end.join(','));}return path.reverse();
}
function walkTo(x,y) {for(const [cx,cy] of pathTo(Math.floor(x),Math.floor(y))) for(const [axis,target] of [['x',cx+.5],['y',cy+.5]]){let n=0;while(Math.abs(state.player[axis]-target)>.05 && n++<40){input.keys={};const d=target-state.player[axis];input.keys[axis==='x'?(d>0?'w':'s'):(d>0?'d':'a')]=true;step();}assert(n<40);}input.keys={};}
function visit(o,kind=o.kind){walkTo(o.x,o.y);assert.equal(nearestInteraction(map,state.progress.flags,state.player)?.kind,kind);}
visit(CITADEL_ECHO_TERMINAL);press('e');assert.match(g.message,/ECOS 0\/3/);
visit(CITADEL_ECHOES[0]);press('e');assert.match(g.message,/USE \[R\]/);assert.equal(memoryEchoCount(state.progress),0);
press('r');assert(g.scan>0);press('e');assert.equal(memoryEchoCount(state.progress),1);assert(g.localProgress.achieved.includes(CITADEL_ECHOES[0].flag));
const count=g.localProgress.score;press('e');assert.equal(g.localProgress.score,count);
assert(loadSaveIntoState(1));assert.equal(memoryEchoCount(state.progress),1);assert.equal(getQuestState(state.progress,'cidadela_ecos_entre_tempos').status,'active');
await loadMap('cidadela_404');clearCitadelRuntime();step();g=getCitadelRuntime();g.enemies=[];g.angle=0;state.player.invulnerable=100000;
// Abre as eclusas normalmente, com radar disponível em cada setor.
for(let i=1;i<3;i++) {visit(KEYS[i-1],'key');press('e');visit(CITADEL_ECHOES[i]);if(g.scan>0)step(130);press('r');press('e');assert(state.progress.flags[CITADEL_ECHOES[i].flag]);}
assert.equal(memoryEchoCount(state.progress),3);assert.equal(getQuestState(state.progress,'cidadela_ecos_entre_tempos').status,'completed');assert(state.progress.flags.cidadela_ecos_concluidos);
const xp=JSON.stringify(state.progress.archetypeProgress);visit(CITADEL_ECHOES[2]);press('e');assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
visit(CITADEL_ECHO_TERMINAL);g.echo=80;state.player.energy=10;press('e');assert(g.echo<46 && g.echo>44);assert(state.player.energy>34);assert(g.echoTerminalCooldown>44);press('e');assert.match(g.message,/RECARREGANDO/);
press('p');const cooldown=g.echoTerminalCooldown;step(50);assert.equal(g.echoTerminalCooldown,cooldown,'pausa congela a recarga');press('p');
assert(loadSaveIntoState(1));assert.equal(memoryEchoCount(state.progress),3);assert.equal(getQuestState(state.progress,'cidadela_ecos_entre_tempos').status,'completed');assert.deepEqual(state.progress.inventory,['guardado']);assert.equal(state.progress.activeQuest.status,'active');assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);
assert.equal(getDimensionProgress(state.progress).achieved.filter(x=>x.startsWith('cidadela_eco_')).length,3);
console.log('Ecos: percurso, radar, missão, quatro arquétipos, terminal, pausa e saves OK.');
