// node --experimental-default-type=module tests/cidadela-animacao.mjs
import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime, enemyVisualFrame } from '../js/game/cidadela-fps.js';

state.progress={archetype:'mare_astral',flags:{},inventory:[]};
state.world.currentMap=map; state.world.isLoading=false; state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,ultimate:{cooldown:0}});
clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
step();const g=getCitadelRuntime();
// Um toque rápido não pode se perder entre quadros.
input.pressed.add('space');step();assert.equal(g.ammo,11);g.ammo=12;g.fire=0;g.impacts=[];
Object.assign(state.player,{x:4.5,y:5.5,invulnerable:100});g.angle=0;
const imp={type:'imp',x:6.5,y:5.5,hp:55,cooldown:0,slow:0};g.enemies=[imp];
step();assert.equal(enemyVisualFrame(imp),'attack','preparação muda pose antes do projétil');
assert.equal(g.shots.length,0);
step(23);assert(g.shots.length>0,'projétil sai após preparação');assert.equal(enemyVisualFrame(imp),'attack','pose permanece no disparo');
step(8);assert.equal(enemyVisualFrame(imp),'idle','pose de ataque termina');
// Um tiro real cria impacto e pose de dano; a morte persiste por um curto intervalo.
g.fire=0;input.keys.space=true;step();input.keys.space=false;
assert.equal(imp.hp,27);assert.equal(enemyVisualFrame(imp),'hurt');assert(g.impacts.length>0);
step(8);assert.equal(enemyVisualFrame(imp),'idle');
g.fire=0;input.keys.space=true;step();input.keys.space=false;
assert.equal(enemyVisualFrame(imp),'death');assert(g.enemies.includes(imp));
step(25);assert(!g.enemies.includes(imp),'corpo removido depois da animação');
// Disparo sem alvo deixa impacto na parede ou eclusa visível.
g.impacts=[];g.fire=0;input.keys.space=true;step();input.keys.space=false;
assert(g.impacts.some(i=>i.x>7 && i.x<8), 'tiro instantâneo alcança a eclusa fechada');
// Projétil contra parede cria impacto temporário, sem acumular objetos.
g.shots=[{x:7.9,y:5.5,dx:3,dy:0,life:1,damage:8}];step(2);
assert.equal(g.shots.length,0);assert(g.impacts.length>0);step(12);assert.equal(g.impacts.length,0);
// Pausa congela efeitos e não avança seus tempos.
g.impacts.push({x:4,y:6,color:'red',life:.2});input.pressed.add('p');step();const life=g.impacts[0].life;step(10);assert.equal(g.impacts[0].life,life);
input.pressed.add('p');step();assert(g.impacts[0].life<life);
// Núcleo exige mira próxima, inclusive se a blindagem estiver aberta.
state.progress.flags.cidadela_chave_vermelha=true;Object.assign(state.player,{x:25.5,y:6.5});g.boss.cycle=5;g.boss.hp=280;g.enemies=[];g.fire=0;g.angle=.12;
input.keys.space=true;step();input.keys.space=false;assert.equal(g.boss.hp,280,'erro lateral não acerta o núcleo');
g.fire=0;g.angle=0;input.keys.space=true;step();input.keys.space=false;assert.equal(g.boss.hp,245,'mira central acerta núcleo exposto');
console.log('Cidadela: animações de preparação, disparo, dano, morte, impacto, pausa e mira do núcleo OK.');
