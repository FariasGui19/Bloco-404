// Exercita os estados reais de ação e os sprites usados pelo renderer.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime,weaponVisualFrame } from '../js/game/cidadela-fps.js';
const names=['base-canhao-mare-retorno','base-canhao-nucleo-retorno','base-canhao-dominio-retorno','base-canhao-bio-retorno','base-habilidade-mare','base-habilidade-nucleo','base-habilidade-dominio','base-habilidade-bio','base-dano-visor','base-travessia-anel'];
for(const n of names){const path=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6,`${n} precisa ter alfa`);}
assert.equal(weaponVisualFrame(.23),'fire');assert.equal(weaponVisualFrame(.14),'return');assert.equal(weaponVisualFrame(0),'idle');assert.equal(weaponVisualFrame(.2,true),'idle');
const draws=[];const noop=()=>{};
const ctx=new Proxy({}, {get(_t,key){if(key==='drawImage')return (...args)=>draws.push(args[0]?.src ?? null);return noop;},set(){return true;}});
const motion={matches:false};globalThis.window={matchMedia:()=>motion};
globalThis.document={createElement:()=>({width:96,height:128,getContext:()=>ctx})};
globalThis.Image=class {constructor(){this.width=128;this.height=128;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
const canvas={width:960,height:540,getContext:()=>ctx};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:1000,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};const press=k=>{input.pressed.add(k);step();};step();const g=getCitadelRuntime();g.enemies=[];g.boss.dead=true;
const render=()=>{draws.length=0;renderCitadel(canvas,state);};
press('space');assert.equal(g.ammo,11);assert.equal(g.fire,.23);render();assert(draws.some(s=>s?.endsWith('canhao-mare-recuo.png')));
step(3);assert(g.fire<=.14&&g.fire>0);render();assert(draws.some(s=>s?.endsWith('base-canhao-mare-retorno.png')),'segundo quadro usa arte de retorno');
step(5);assert.equal(g.fire,0);render();assert(draws.some(s=>s?.endsWith('canhao-mare.png')));
press('q');render();assert(draws.some(s=>s?.endsWith('base-habilidade-mare.png')));motion.matches=true;render();assert(draws.some(s=>s?.endsWith('base-habilidade-mare.png')),'símbolo estático com movimento reduzido');
for(const [id,mode] of [['mare_astral','mare'],['nucleo_dez_forma','nucleo'],['lamina_dominio_anciao','dominio'],['motor_bio_forja','bio']]) {
 state.progress.archetype=id;g.fire=.1;g.fx=.8;g.fxKind='q';motion.matches=false;render();
 assert(draws.some(s=>s?.endsWith(`base-canhao-${mode}-retorno.png`)),`${mode}: retorno da arma`);
 assert(draws.some(s=>s?.endsWith(`base-habilidade-${mode}.png`)),`${mode}: emblema da habilidade`);
}
state.progress.archetype='mare_astral';motion.matches=true;
g.fire=.22;render();assert(!draws.some(s=>s?.endsWith('canhao-mare-recuo.png')));assert(draws.some(s=>s?.endsWith('canhao-mare.png')));motion.matches=false;g.fire=0;g.dash=0;
// A fase deriva de distância percorrida, e não avança ao colidir ou pausar.
Object.assign(state.player,{x:4.5,y:5.5});g.angle=0;g.walkPhase=0;g.walkBlend=0;input.keys.w=true;step(8);assert(g.walkPhase>0);assert(g.walkBlend>0);const old=g.walkPhase;input.keys.w=false;step(8);assert.equal(g.walkPhase,old);assert.equal(g.walkBlend,0,'arma se acomoda após parar');
Object.assign(state.player,{x:7.79,y:5.5});g.walkPhase=1;g.walkBlend=0;input.keys.w=true;step(10);assert.equal(g.walkPhase,1);assert.equal(g.walkBlend,0,'não simula passos contra parede');
Object.assign(state.player,{x:4.5,y:5.5});step(3);press('p');const paused=[g.walkPhase,g.walkBlend,g.fire,g.fx];step(40);assert.deepEqual([g.walkPhase,g.walkBlend,g.fire,g.fx],paused);input.keys.w=false;press('p');
// Indicador só surge em dano real, nunca em um tiro bloqueado por guarda.
Object.assign(state.player,{health:80,invulnerable:0});g.guard=1;g.damage=0;g.shots=[{x:state.player.x,y:state.player.y,dx:0,dy:0,damage:10,life:1}];step();assert.equal(g.damage,0);render();assert(!draws.some(s=>s?.endsWith('base-dano-visor.png')));
g.guard=0;state.player.invulnerable=0;g.shots=[{x:state.player.x,y:state.player.y,dx:0,dy:0,damage:10,life:1}];step();assert.equal(g.damage,.35);render();assert.equal(draws.filter(s=>s?.endsWith('base-dano-visor.png')).length,2);
motion.matches=true;render();assert.equal(draws.filter(s=>s?.endsWith('base-dano-visor.png')).length,2,'aviso de dano também existe com movimento reduzido');motion.matches=false;
state.player.health=0;state.player.deathTimer=.01;g.walkPhase=2;g.walkBlend=1;step();assert.equal(g.walkPhase,0);assert.equal(g.walkBlend,0);assert.equal(g.damage,0);
console.log('Base FPS: quadros, habilidades, deslocamento real, dano, pausa e acessibilidade OK.');
