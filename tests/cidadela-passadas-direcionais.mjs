import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {enemyWalkFrame,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
const names=['passada-imp-lateral','passada-imp-lateral-a','passada-imp-lateral-b','passada-imp-costas','passada-echo-lateral-a','passada-echo-lateral-b','passada-echo-costas','passada-orbe-lateral-a','passada-orbe-lateral-b','passada-orbe-costas'];
for(const n of names){const p=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(p));assert.equal(readFileSync(p)[25],6,`${n}: PNG com alfa`);}
assert.equal(enemyWalkFrame({walkPhase:.9},500),'a');assert.equal(enemyWalkFrame({walkPhase:1.1},0),'b');
assert.equal(enemyWalkFrame({},0),'a');assert.equal(enemyWalkFrame({},.5),'b');
const calls=[];const noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>calls.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
const waiting=[];globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(v.endsWith('passada-imp-lateral.png')||v.endsWith('passada-orbe-lateral-b.png')||v.endsWith('combate-imp-lateral-aviso.png'))waiting.push(this);else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const enemy={type:'imp',x:6.5,y:5.5,hp:55,cooldown:99,slow:0,facing:Math.PI/2,moving:false,walkPhase:0};g.enemies=[enemy];
const render=()=>{calls.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>calls.filter(a=>a[0]?.src?.endsWith(n));
render();assert(drawn('vida-imp-lateral.png').length,'perfil antigo enquanto o novo não carrega');
waiting.find(i=>i.src.endsWith('passada-imp-lateral.png')).onload();render();assert(drawn('passada-imp-lateral.png').length,'perfil novo após carregar');
enemy.windup=.5;render();assert(drawn('imp-ataque.png').length,'aviso frontal durante carregamento');waiting.find(i=>i.src.endsWith('combate-imp-lateral-aviso.png')).onload();enemy.windup=0;
for(const [type,stem] of [['imp','imp'],['orb','orbe'],['echo','echo']]) {
 Object.assign(enemy,{type,moving:true,walkPhase:.1,facing:Math.PI/2,windup:0,attack:0,hurt:0,hp:100});render();assert(drawn(`passada-${stem}-lateral-a.png`).length,`${type}: passada lateral A`);
 enemy.facing=-Math.PI/2;render();const mirrored=drawn(`passada-${stem}-lateral-a.png`);assert(mirrored.length && mirrored[0][1]>63,`${type}: espelho preservado`);
 enemy.facing=Math.PI/2;enemy.walkPhase=1.1;render();
 if(type==='orb'){assert(drawn('vida-orbe-lateral.png').length,'fallback da passada pendente');waiting.find(i=>i.src.endsWith('passada-orbe-lateral-b.png')).onload();render();}
 assert(drawn(`passada-${stem}-lateral-b.png`).length,`${type}: passada lateral B`);
 enemy.facing=0;enemy.walkPhase=0;render();assert(drawn(`vida-${stem}-costas.png`).length,`${type}: repouso de costas`);
 enemy.walkPhase=1.1;render();assert(drawn(`passada-${stem}-costas.png`).length,`${type}: passada de costas`);
 motion.matches=true;render();assert(drawn(`vida-${stem}-costas.png`).length,'movimento reduzido mantém orientação sem passada');assert(!drawn(`passada-${stem}-costas.png`).length);motion.matches=false;
 enemy.facing=Math.PI/2;enemy.windup=.5;render();assert(drawn(`combate-${stem}-lateral-aviso.png`).length,'aviso prevalece');assert(!drawn(`passada-${stem}-lateral-b.png`).length);
 enemy.facing=0;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'aviso de costas');
 motion.matches=true;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'aviso permanece em movimento reduzido');motion.matches=false;
 enemy.facing=-Math.PI/2;render();assert(drawn(`combate-${stem}-lateral-aviso.png`)[0][1]>63,'aviso lateral espelhado');
 enemy.facing=Math.PI/2;enemy.windup=0;enemy.hurt=.1;render();assert(drawn(`combate-${stem}-lateral-dano.png`).length,'dano prevalece');
 enemy.facing=0;render();assert(drawn(`fecho-${stem}-costas-dano.png`).length,'dano visto de costas');
 enemy.hurt=0;enemy.hp=0;enemy.death=.6;render();assert(drawn(`fecho-${stem}-costas-queda.png`).length,'queda prevalece');
}
// A fase muda apenas quando a IA realmente caminha, e não durante pausas,
// ataques ou ausência de linha de visão; não afeta vida, munição ou posição.
Object.assign(enemy,{type:'imp',x:6.5,y:5.5,hp:55,cooldown:99,slow:0,windup:0,attack:0,hurt:0,death:0,walkPhase:0});Object.assign(p,{x:3.5,y:5.5});const hp=enemy.hp,ammo=g.ammo;step(5);assert(enemy.moving);assert(enemy.walkPhase>0);assert.equal(enemy.hp,hp);assert.equal(g.ammo,ammo);
input.pressed.add('p');step();const paused=[enemy.x,enemy.y,enemy.walkPhase];step(30);assert.deepEqual([enemy.x,enemy.y,enemy.walkPhase],paused,'fase e posição congelam na pausa');input.pressed.add('p');step();
Object.assign(enemy,{x:7.79,y:5.5,walkPhase:1.2});Object.assign(p,{x:9.5,y:5.5});step(10);assert(!enemy.moving);assert.equal(enemy.walkPhase,1.2,'parede sem visão não fabrica passos');
console.log('Cidadela: passadas direcionais, fallback, pausa e distância real OK.');
