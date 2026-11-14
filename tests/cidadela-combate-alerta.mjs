import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {citadelEchoAlert,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
const names=['imp-lateral-aviso','imp-costas-aviso','imp-lateral-dano','orbe-lateral-aviso','orbe-costas-aviso','orbe-lateral-dano','echo-lateral-aviso','echo-costas-aviso','echo-lateral-dano','eco-alerta'];
for(const n of names){for(const dir of ['source-art','sprites'])assert(existsSync(`assets/${dir}/cidadela-404/combate-${n}.png`));assert.equal(readFileSync(`assets/sprites/cidadela-404/combate-${n}.png`)[25],6);}
assert.equal(citadelEchoAlert(74.99),false);assert.equal(citadelEchoAlert(75),true);assert.equal(citadelEchoAlert(100,{cidadela_estavel:true}),false);
const calls=[];const noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage'||k==='fillText')return (...a)=>calls.push([k,...a]);if(k==='measureText')return text=>({width:text.length*5});return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};globalThis.window={matchMedia:()=>({matches:true})};
let alertImage;globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(v.endsWith('combate-eco-alerta.png'))alertImage=this;else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();const input={keys:{},pressed:new Set(),mouseDeltaX:0};updateCitadel(.033,state,input);const g=getCitadelRuntime();g.boss.dead=true;g.enemies=[];Object.assign(state.player,{x:4.5,y:5.5});
const render=()=>{calls.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const texts=()=>calls.filter(c=>c[0]==='fillText').map(c=>c[1]);const image=n=>calls.some(c=>c[0]==='drawImage'&&c[1]?.src?.endsWith(n));
g.echo=74.9;render();assert(texts().includes('ECHOVORE 74%'));assert(!image('combate-eco-alerta.png'));
g.echo=75;g.echoLock=10;render();assert(texts().includes('ECHOVORE 75% • ALTO'));assert(image('refino-hud-eco.png'),'ícone anterior enquanto o novo carrega');assert.equal(g.echo,75,'o HUD não altera ressonância');
alertImage.onload();render();assert(image('combate-eco-alerta.png'));state.progress.flags.cidadela_estavel=true;render();assert(!texts().some(t=>t.includes('• ALTO')));assert(!image('combate-eco-alerta.png'));delete state.progress.flags.cidadela_estavel;
// O aviso continua descrevendo carga alta durante bloqueio, sem prometer invocação imediata.
g.echo=100;g.echoLock=1;updateCitadel(.033,state,input);assert.equal(g.enemies.length,0);assert.equal(g.echo,100);
g.echoLock=0;updateCitadel(.033,state,input);assert.equal(g.enemies.filter(e=>e.type==='echo').length,1);assert.equal(g.echo,0);assert(g.echoLock>0);
// Limite de entidades retém a carga para nova tentativa, sem mudar a regra.
g.echo=100;g.echoLock=0;g.enemies=Array.from({length:9},()=>({type:'imp',hp:55,x:10.5,y:10.5,cooldown:99}));updateCitadel(.033,state,input);assert.equal(g.enemies.filter(e=>e.type==='echo').length,0);assert.equal(g.echo,100);assert(g.echoLock>0);
console.log('Cidadela: sprites de combate e alerta textual de ressonância OK.');
