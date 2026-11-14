import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { citadelSpriteFrame,clearCitadelRuntime,getCitadelRuntime,updateCitadel,renderCitadel } from '../js/game/cidadela-fps.js';
const names=['refino-imp-dano','refino-orbe-dano','refino-echo-dano','refino-imp-queda','refino-orbe-queda','refino-echo-queda','refino-hud-vida','refino-hud-municao','refino-hud-energia','refino-hud-eco'];
for(const n of names) {const p=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(p));assert.equal(readFileSync(p)[25],6,`${n} precisa ter transparência`);}
for(const type of ['imp','orb','echo']) {
 const e={type,hp:20,hurt:.15};
 assert.equal(citadelSpriteFrame(e,0),`${type}_hurt`);
 assert.equal(citadelSpriteFrame(e,0,true),`${type}_hurt`,'dano permanece legível');
 assert.equal(citadelSpriteFrame({...e,windup:.4},0),`${type}_attack`,'aviso de ataque tem prioridade');
 assert.equal(citadelSpriteFrame({...e,hp:0,death:.7},0),`${type}_fall`);
 assert.equal(citadelSpriteFrame({...e,hp:0,death:.3},0),`${type}_death`);
 assert.equal(citadelSpriteFrame({...e,hp:0,death:.7},0,true),`${type}_death`,'sem animação de queda');
}
const draws=[];const noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a[0]?.src ?? a[0]);return noop;},set(){return true;}});
const canvases=[];globalThis.document={createElement:()=>{const c={width:0,height:0,getContext:()=>ctx};canvases.push(c);return c;}};
globalThis.Image=class {constructor(){this.width=128;this.height=128;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
globalThis.window={matchMedia:()=>({matches:false})};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();const input={keys:{},pressed:new Set(),mouseDeltaX:0};updateCitadel(.033,state,input);
const g=getCitadelRuntime();g.boss.dead=true;Object.assign(state.player,{x:4.5,y:5.5});g.angle=0;
const render=()=>{draws.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};
for(const [type,name] of [['imp','imp'],['orb','orbe'],['echo','echo']]) {
 g.enemies=[{type,x:5.5,y:5.5,hp:20,hurt:.1}];render();assert(draws.some(s=>typeof s==='string'&&s.endsWith(`refino-${name}-dano.png`)));
 g.enemies[0].hp=0;g.enemies[0].death=.7;render();assert(draws.some(s=>typeof s==='string'&&s.endsWith(`refino-${name}-queda.png`)));
}
for(const n of ['vida','municao','energia','eco'])assert(draws.some(s=>typeof s==='string'&&s.endsWith(`refino-hud-${n}.png`)));
assert(canvases.some(c=>c.width===480&&c.height===270),'mundo mantém resolução original');
assert(canvases.some(c=>c.width===960&&c.height===540),'interface desenhada em 2x');
console.log('Cidadela: HUD 2x, pictogramas e quadros de dano e queda OK.');
