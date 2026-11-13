// Acessibilidade, geometria e combate do adaptador FPS.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { KEYS, wallAt, canMove, updateCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';

// Checa toda a geometria com BFS, inclusive retorno e impossibilidade de
// contornar eclusas. É intencional não teleportar o jogador neste teste.
function reachable(start, flags) {
  const queue=[start], seen=new Set();
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i], id=`${x},${y}`;
    if(seen.has(id)||wallAt(map,flags,x+.5,y+.5)) continue;
    seen.add(id);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push([x+dx,y+dy]);
  }
  return seen;
}
const flags={};
for(let i=0;i<KEYS.length;i++) {
  const seen=reachable([2,6],flags), key=KEYS[i];
  assert(seen.has(`${Math.floor(key.x)},${Math.floor(key.y)}`),`registro ${key.id} alcançável`);
  if(i+1<KEYS.length) assert(!seen.has(`${Math.floor(KEYS[i+1].x)},${Math.floor(KEYS[i+1].y)}`),'eclusa não tem desvio');
  flags[key.flag]=true;
}
assert(reachable([23,6],flags).has('2,6'),'retorno à saída atravessa as três eclusas abertas');
for(const [x,y] of [[2.5,6.5],[9.7,6.5],[16.7,6.5],[23.7,6.5]]) assert(canMove(map,flags,x,y),'checkpoint livre');

for(const name of ['canhao-mare','canhao-nucleo','canhao-dominio','canhao-bio','terminal-memoria','portal-retorno','predador-echovore','monitor-nulo']) {
  const p=`assets/sprites/cidadela-404/${name}.png`; assert(existsSync(p)); assert.equal(readFileSync(p)[25],6,`${name}: RGBA`);
}
for(const name of ['parede-metal','parede-tijolo']) assert(existsSync(`assets/sprites/cidadela-404/${name}.png`));

state.progress={archetype:'mare_astral',inventory:[],flags:{}};
state.world.currentMap=map;state.world.fpsPauseRequested=false;state.world.fpsPaused=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,ultimate:{cooldown:0}});
clearCitadelRuntime();const input={keys:{},pressed:new Set(),mouseDeltaX:0};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
step();const g=getCitadelRuntime();
// Sem atividade enquanto pausado ou consultando registros.
g.enemies=[];g.shots.push({x:5,y:6.5,dx:-1,dy:0,life:5,damage:8});
input.pressed.add('p');step();assert.equal(g.panel,'pause');assert(state.world.fpsPaused);
const time=g.time, sx=g.shots[0].x, hp=state.player.health;input.keys.w=true;step(90);
assert.equal(g.time,time);assert.equal(g.shots[0].x,sx);assert.equal(state.player.health,hp);
input.keys.w=false;input.pressed.add('l');step();assert.equal(g.panel,'journal');
input.pressed.add('l');step();assert.equal(g.panel,null);assert(!state.world.fpsPaused);
state.world.fpsPauseRequested=true;input.pressed.add('escape');step();assert.equal(g.panel,'pause','perda de captura e Escape no mesmo quadro não despausam');
input.pressed.add('p');step();assert.equal(g.panel,null);
// Saturação não afirma que gerou um inimigo quando o limite está cheio;
// a carga é preservada e a síntese é retomada assim que houver espaço.
g.enemies=Array.from({length:9},()=>({type:'imp',x:28,y:6.5,hp:55,cooldown:99,slow:0}));g.echo=100;g.echoLock=0;
step();assert.equal(g.enemies.length,9);assert.equal(g.echo,100);assert(g.echoLock>0);
g.enemies=[];g.echoLock=0;step();assert.equal(g.enemies.length,1);assert.equal(g.enemies[0].type,'echo');assert.equal(g.echo,0);g.enemies=[];
// Echovore bloqueia a recarga, não o uso das balas restantes.
g.ammo=4;g.reload=0;g.fire=0;g.jam=2;input.keys.space=true;step();input.keys.space=false;assert.equal(g.ammo,3);
input.pressed.add('t');step();assert.equal(g.ammo,3);assert.equal(g.reload,0);g.jam=0;
// Medkit só é consumido quando cura, uma vez por sessão.
Object.assign(state.player,{x:4.5,y:9.5});g.shots=[];
step();assert(!g.supplies[0].used);state.player.health-=30;step();assert(g.supplies[0].used);assert(state.player.health>hp-30);
const healthAfter=state.player.health;state.player.health-=5;step();assert(state.player.health<healthAfter,'suprimento não reaparece');
// Um inimigo anuncia a preparação antes de gerar um projétil.
Object.assign(state.player,{x:3.5,y:6.5});g.shots=[];g.enemies=[{type:'imp',x:5.5,y:6.5,hp:55,cooldown:0,slow:0}];
step();assert(g.enemies[0].windup>0);assert.equal(g.shots.length,0);
step(15);assert.equal(g.shots.length,0);step(10);assert.equal(g.shots.length,1);
// Retorno por morte não nasce dentro dos pilares adicionados.
state.progress.flags.cidadela_chave_azul=true;state.player.health=0;state.player.deathTimer=.001;g.enemies=[];g.shots=[];
step();assert.equal(state.player.x,9.7);assert(state.player.health>0);assert(canMove(map,state.progress.flags,state.player.x,state.player.y));
console.log('Cidadela: rotas, artes RGBA, pausa, registros, suprimento e aviso de ataque OK.');
