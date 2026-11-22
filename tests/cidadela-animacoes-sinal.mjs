import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map,CITADEL_ECHOES } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { citadelSpriteFrame,bossAttackSpriteFrame,citadelPulseFrame,updateCitadel,clearCitadelRuntime,getCitadelRuntime } from '../js/game/cidadela-fps.js';
import { interactMemoryEcho } from '../js/game/cidadela-ecos.js';
const names=['imp-ataque-b','orbe-ataque-b','echovore-ataque-b','vigilante-ataque-b','fenda-aviso','terminal-escuta-pulso-a','terminal-escuta-pulso-b','portal-pulso-a','portal-pulso-b','eco-ressonante-pulso'];
for(const n of names){const path=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6,`${n} deve ter alfa`);}
for(const type of ['imp','orb','echo']) {
 const e={type,hp:10,windup:.5,moving:true};
 assert.equal(citadelSpriteFrame(e,0),`${type}_attack`);
 assert.equal(citadelSpriteFrame(e,.5),`${type}_attack_b`);
 assert.equal(citadelSpriteFrame(e,.5,true),`${type}_attack`,'aviso permanece estático');
 assert.equal(citadelSpriteFrame({...e,hp:0},.5),`${type}_death`,'colapso tem prioridade');
}
assert.equal(bossAttackSpriteFrame(.5),'boss_attack_b');assert.equal(bossAttackSpriteFrame(.5,true),'boss_attack');
assert.equal(citadelPulseFrame('breach_open',1,0,0,true),'breach_warning','aviso não depende de movimento');
assert.equal(citadelPulseFrame('breach_open',0,0,0,false),null);
assert.equal(citadelPulseFrame('exit',0,0,0,false),'exit_pulse_a');assert.equal(citadelPulseFrame('exit',0,0,2,false),'exit_pulse_b');
assert.equal(citadelPulseFrame('echo_terminal_on',0,0,2,false),'echo_terminal_pulse_b');
assert.equal(citadelPulseFrame('memory_echo_pending',0,1,0,false),'memory_pulse');assert.equal(citadelPulseFrame('memory_echo_pending',0,0,0,false),null);
for(const type of ['exit','echo_terminal_on','memory_echo_pending','generator'])assert.equal(citadelPulseFrame(type,0,2,0,true),null);
const readings=[];
for(const id of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']) {
 const p={archetype:id,flags:{}};const r=interactMemoryEcho(p,CITADEL_ECHOES[0],true);assert(r.changed&&r.reading);readings.push(r.reading);
 assert(!interactMemoryEcho(p,CITADEL_ECHOES[0],true).changed);
}
assert.equal(new Set(readings).size,4,'cada arquétipo interpreta o eco');
state.save.loaded=false;state.progress={archetype:'mare_astral',inventory:[],flags:{}};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:1000,ultimate:{cooldown:0}});
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};const press=k=>{input.pressed.add(k);step();};
clearCitadelRuntime();step();const g=getCitadelRuntime();g.enemies=[];g.boss.dead=true;
Object.assign(state.player,{x:5.05,y:8.15,energy:20});press('r');g.echo=0;press('e');
assert.equal(g.echoAnchor,12);assert(state.player.energy>28&&state.player.energy<29);assert(g.radioQueue.some(x=>x.includes('30% MENOS ECO')));assert(g.radioQueue.some(x=>x.startsWith('MARÉ:')));
g.echo=0;press('q');assert(g.echo>16.7&&g.echo<16.9,'Q produz 70% do eco durante sinal');
const beforeEnergy=state.player.energy;const beforeBuff=g.echoAnchor;press('e');assert(g.echoAnchor<beforeBuff,'releitura não renova sinal');assert(state.player.energy-beforeEnergy<.2,'releitura não restaura energia');
press('p');const paused=g.echoAnchor;step(100);assert.equal(g.echoAnchor,paused);press('p');assert(g.echoAnchor<paused);
g.echoAnchor=.02;step();assert.equal(g.echoAnchor,0);g.q=0;g.echo=0;state.player.energy=100;press('q');assert(g.echo>23.9&&g.echo<24.1,'efeito expira');
g.echoAnchor=5;state.player.health=0;state.player.deathTimer=.01;step();assert.equal(g.echoAnchor,0,'morte remove efeito temporário');assert(state.progress.flags.cidadela_eco_entrada,'memória permanece');
console.log('Quadros prioritários, avisos acessíveis, leituras e sinal ancorado OK.');
