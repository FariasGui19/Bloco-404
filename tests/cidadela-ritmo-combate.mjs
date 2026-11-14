import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {enemyAttackVisualFrame,abilityVisualFrame,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
const names=['imp-carga','imp-disparo','orbe-carga','orbe-disparo','echo-carga','echo-disparo','habilidade-mare','habilidade-nucleo','habilidade-dominio','habilidade-bio'];
for(const n of names){for(const dir of ['source-art','sprites'])assert(existsSync(`assets/${dir}/cidadela-404/ritmo-${n}.png`));assert.equal(readFileSync(`assets/sprites/cidadela-404/ritmo-${n}.png`)[25],6,`${n}: RGBA`);}
for(const type of ['imp','orb','echo']) {
 const e={type,hp:20,windup:.2,attack:.1};assert.equal(enemyAttackVisualFrame(e),`${type}_charge`);assert.equal(enemyAttackVisualFrame({...e,windup:0}),`${type}_release`);assert.equal(enemyAttackVisualFrame({...e,attack:0,windup:0}),null);assert.equal(enemyAttackVisualFrame(e,true),null);assert.equal(enemyAttackVisualFrame({...e,hp:0}),null);
}
assert.equal(enemyAttackVisualFrame({type:'boss',hp:10,windup:1}),null);
for(const [fx,reduce,expect] of [[0,false,null],[.8,false,'base'],[.56,false,'base'],[.55,false,'mid'],[.4,false,'mid'],[.39,false,'tail'],[.3,true,'base']])assert.equal(abilityVisualFrame(fx,reduce),expect);
const calls=[],noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>calls.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};const waiting=[];
globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(['ritmo-imp-carga.png','ritmo-imp-disparo.png','ritmo-habilidade-mare.png'].some(n=>v.endsWith(n)))waiting.push(this);else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=()=>{updateCitadel(.033,state,input);input.pressed.clear();};const press=k=>{input.pressed.add(k);step();};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const e={type:'imp',x:6.5,y:5.5,hp:55,cooldown:99,slow:0,facing:Math.PI,windup:.5,attack:0,moving:false};g.enemies=[e];g.shots=[];
const render=()=>{calls.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>calls.filter(a=>a[0]?.src?.endsWith(n));const load=n=>waiting.find(i=>i.src.endsWith(n)).onload();
render();assert(drawn('imp-ataque.png').length||drawn('imp-ataque-b.png').length,'preparação anterior enquanto nova arte carrega');load('ritmo-imp-carga.png');render();assert(drawn('ritmo-imp-carga.png').length);
e.windup=0;e.attack=.22;render();assert(drawn('imp-ataque.png').length||drawn('imp-ataque-b.png').length,'disparo anterior enquanto arte carrega');load('ritmo-imp-disparo.png');render();assert(drawn('ritmo-imp-disparo.png').length);
for(const [type,stem] of [['imp','imp'],['orb','orbe'],['echo','echo']]){
 Object.assign(e,{type,hp:55,windup:.5,attack:0,hurt:.1,facing:Math.PI,moving:true});const snapshot=[e.hp,e.windup,e.attack,g.shots.length];render();assert(drawn(`ritmo-${stem}-carga.png`).length,'carga frontal real');assert.deepEqual([e.hp,e.windup,e.attack,g.shots.length],snapshot,'render não altera regras');
 e.windup=0;e.attack=.15;render();assert(drawn(`ritmo-${stem}-disparo.png`).length,'quadro pós-disparo');
 e.windup=.5;e.attack=0;e.facing=Math.PI/2;render();assert(drawn(`combate-${stem}-lateral-aviso.png`).length,'lateral continua direcional');assert(!drawn(`ritmo-${stem}-carga.png`).length);
 e.facing=0;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'costas continua direcional');
 e.facing=Math.PI;motion.matches=true;render();assert(!drawn(`ritmo-${stem}-carga.png`).length,'reduzido usa aviso estático anterior');assert(drawn(type==='imp'?'imp-ataque.png':type==='orb'?'orbe-ataque.png':'echovore-ataque.png').length);motion.matches=false;
 e.hp=0;e.death=.3;render();assert(!drawn(`ritmo-${stem}-carga.png`).length,'colapso prevalece');
}
// IA real: o aviso congela com pausa e só vira quadro de disparo depois de
// emitir o projétil. Ao perder visão, o disparo é cancelado.
Object.assign(e,{type:'imp',x:6.5,y:5.5,hp:55,death:0,cooldown:5,slow:0,windup:.1,attack:0,facing:Math.PI,moving:false});g.shots=[];press('p');const paused=e.windup;for(let i=0;i<8;i++)step();assert.equal(e.windup,paused);assert.equal(g.shots.length,0);press('p');assert(e.windup<paused);for(let i=0;i<5 && e.windup>0;i++)step();assert.equal(e.windup,0);assert(e.attack>0);assert.equal(g.shots.length,1);render();assert(drawn('ritmo-imp-disparo.png').length);
Object.assign(e,{x:6.5,y:5.5,windup:.02,attack:0,cooldown:4,facing:0});Object.assign(p,{x:9.5,y:5.5});g.shots=[];step();assert.equal(g.shots.length,0,'parede cancela o disparo');assert.equal(e.attack,0);render();assert(!drawn('ritmo-imp-disparo.png').length);
// Quadro intermediário para os quatro módulos, sem substituir o início ou fim.
g.enemies=[];Object.assign(p,{x:4.5,y:5.5});g.angle=0;g.fxKind='q';g.fx=.5;render();assert(drawn('base-habilidade-mare.png').length,'fallback do emblema');load('ritmo-habilidade-mare.png');
for(const [archetype,mode] of [['mare_astral','mare'],['nucleo_dez_forma','nucleo'],['lamina_dominio_anciao','dominio'],['motor_bio_forja','bio']]){
 state.progress.archetype=archetype;for(const kind of ['q','ultimate']){g.fxKind=kind;g.fx=.5;render();assert(drawn(`ritmo-habilidade-${mode}.png`).length,`${mode}: quadro intermediário`);g.fx=.8;render();assert(drawn(`base-habilidade-${mode}.png`).length);g.fx=.2;render();assert(drawn(`polimento-habilidade-${mode}.png`).length);motion.matches=true;g.fx=.5;render();assert(drawn(`base-habilidade-${mode}.png`).length);assert(!drawn(`ritmo-habilidade-${mode}.png`).length);motion.matches=false;}
}
console.log('Cidadela: preparação/disparo real e quadros intermediários das habilidades OK.');
