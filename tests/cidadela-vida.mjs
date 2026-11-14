import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {enemyView,bossVisualFrame,bossOpen,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
const names=['vida-imp-lateral','vida-imp-costas','vida-orbe-lateral','vida-orbe-costas','vida-echo-lateral','vida-echo-costas','vida-vigilante-aviso','vida-vigilante-aberto-a','vida-vigilante-aberto-b','vida-vigilante-dano'];
for(const n of names){const p=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(p));assert.equal(readFileSync(p)[25],6,`${n}: RGBA`);}
assert.deepEqual(enemyView(Math.PI,6,5,4,5),{view:'front',flip:false});
assert.deepEqual(enemyView(0,6,5,4,5),{view:'back',flip:false});
assert.deepEqual(enemyView(Math.PI/2,6,5,4,5),{view:'side',flip:false});
assert.deepEqual(enemyView(-Math.PI/2,6,5,4,5),{view:'side',flip:true});
assert.equal(enemyView(undefined,6,5,4,5).view,'front');
assert.equal(bossVisualFrame({cycle:0},0),'bossClosed');assert.equal(bossVisualFrame({cycle:1.4},0),'boss_warning');
assert.equal(bossVisualFrame({cycle:2.5},0),'boss_attack');assert.equal(bossVisualFrame({cycle:2.5},.5),'boss_attack_b');
assert.equal(bossVisualFrame({cycle:5},0),'boss_open_a');assert.equal(bossVisualFrame({cycle:5},1),'boss_open_b');
assert.equal(bossVisualFrame({cycle:5},1,true),'boss_open_a');assert.equal(bossVisualFrame({cycle:5,hurt:.1},1),'boss_hurt');
assert.equal(bossVisualFrame({cycle:1,hurt:.1},1),'bossClosed','blindagem não mostra dano');
const draws=[];const noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
globalThis.Image=class {constructor(){this.width=128;this.height=128;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
const input={keys:{},pressed:new Set(),mouseDeltaX:0};state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const enemy={type:'imp',x:6.5,y:5.5,hp:55,cooldown:99,slow:0,facing:Math.PI/2};g.enemies=[enemy];
step();assert(enemy.facing>Math.PI/2 && enemy.facing<Math.PI,'vira gradualmente quando vê o jogador');
input.pressed.add('p');step();const paused=enemy.facing;step(20);assert.equal(enemy.facing,paused);input.pressed.add('p');step();
// Sem visão, conserva direção; IA não é teleportada e não recebe dano.
Object.assign(p,{x:9.5,y:5.5});const hp=enemy.hp;const old=enemy.facing;step(10);assert.equal(enemy.facing,old);assert.equal(enemy.hp,hp);Object.assign(p,{x:4.5,y:5.5});
const render=()=>{draws.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};
const spriteDraw=n=>draws.filter(a=>a[0]?.src?.endsWith(n));
for(const [type,stem] of [['imp','imp'],['orb','orbe'],['echo','echo']]) {
 Object.assign(enemy,{type,hp:100,windup:0,attack:0,hurt:0,death:0,moving:true,facing:Math.PI/2});render();
 let calls=spriteDraw(`vida-${stem}-lateral.png`);assert(calls.length);assert(calls[0][1]<64,'lateral normal');
 enemy.facing=-Math.PI/2;render();calls=spriteDraw(`vida-${stem}-lateral.png`);assert(calls.length);assert(calls[0][1]>63,'lateral espelhada');
 enemy.facing=0;render();assert(spriteDraw(`vida-${stem}-costas.png`).length);motion.matches=true;render();assert(spriteDraw(`vida-${stem}-costas.png`).length,'orientação também funciona com movimento reduzido');motion.matches=false;
 enemy.windup=.5;render();assert(!spriteDraw(`vida-${stem}-costas.png`).length,'aviso de ataque prevalece');enemy.windup=0;
}
g.enemies=[];state.progress.flags.cidadela_chave_vermelha=true;Object.assign(p,{x:24,y:6.5});Object.assign(g.boss,{dead:false,x:28,y:6.5,hp:280,cycle:1.4,hurt:0,cooldown:99});
render();assert(spriteDraw('vida-vigilante-aviso.png').length);assert(!bossOpen(g.boss));
g.boss.cycle=5;g.time=0;render();assert(spriteDraw('vida-vigilante-aberto-a.png').length);g.time=1;render();assert(spriteDraw('vida-vigilante-aberto-b.png').length);
motion.matches=true;render();assert(spriteDraw('vida-vigilante-aberto-a.png').length);motion.matches=false;
g.fire=0;g.ammo=12;input.pressed.add('space');step();assert.equal(g.boss.hp,245,'dano continua igual no núcleo exposto');assert(g.boss.hurt>0,'dano real inicia reação');render();assert(spriteDraw('vida-vigilante-dano.png').length);const prior=g.boss.hurt;step();assert(g.boss.hurt<prior);
input.pressed.add('p');step();const hurt=g.boss.hurt;step(10);assert.equal(g.boss.hurt,hurt,'pausa congela resposta do chefe');input.pressed.add('p');step();step(10);assert.equal(g.boss.hurt,0,'reação termina normalmente');
console.log('Cidadela: orientações aproximadas, espelho, avisos e reação do Vigilante OK.');
