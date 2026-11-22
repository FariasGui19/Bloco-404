// node --experimental-default-type=module tests/cidadela-fps.mjs
import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';
import { KEYS, MODULES, checkpointIndex, wallAt, canMove, visible, bossOpen, updateCitadel, getCitadelRuntime, clearCitadelRuntime, renderCitadel } from '../js/game/cidadela-fps.js';
const store = new Map();
globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
const noop=()=>{};
const context=new Proxy({}, {get:()=>noop, set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const input={keys:{},pressed:new Set(),mouseDeltaX:0};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
assert.equal(map.meta.camera,'retro-fps');
for(const [i,x] of [8,15,22].entries()) {
  assert.equal(wallAt(map,{},x+.5,6.5),2);
  assert.equal(wallAt(map,{[KEYS[i].flag]:true},x+.5,6.5),0);
}
assert(!canMove(map,{},8.5,6.5));
assert(!visible(map,{},7.5,6.5,9.5,6.5));
assert(visible(map,{cidadela_chave_azul:true},7.5,6.5,9.5,6.5));
assert(!bossOpen({cycle:1})); assert(bossOpen({cycle:5}));
for(const archetype of Object.keys(MODULES)) {
  state.progress={archetype, flags:{metroCalibrado:true,frequencia666Registrada:true,freq666_limiar_estavel:true,freq666_limiar_preparado:true}, inventory:['objeto_teste'], activeQuest:{id:'embarque_dimensional',status:'active',stage:'limiar_preparado'}};
  state.player.health=null;state.player.maxHealth=null;state.player.energy=100;state.player.ultimate={cooldown:0};
  state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';
  await loadMap('cidadela_404','inicio');clearCitadelRuntime();step();
  assert.equal(state.world.currentDimension,'cidadela_404');
  assert.equal(state.player.x,2.5); assert.equal(checkpointIndex(state.progress.flags),0);
  const g=getCitadelRuntime();
  // Movimento e Q usam a câmera da dimensão, sem reescrever o kit.
  const originalAbilities=JSON.stringify(state.progress.abilities ?? []);
  input.keys.w=true; step(10); input.keys.w=false; assert(state.player.x>2.5);
  const energy=state.player.energy; g.echo=95; input.pressed.add('q'); step();
  assert(state.player.energy<energy); assert(g.echoLock>0); assert(g.enemies.some(e=>e.type==='echo'));
  assert.equal(JSON.stringify(state.progress.abilities ?? []),originalAbilities);
  input.pressed.add('r');step();assert(g.scan>0,'radar ativo em todos os módulos');
  if(archetype==='motor_bio_forja'||archetype==='lamina_dominio_anciao') assert(g.shield>0);
  state.player.energy=100; input.pressed.add('f');step();assert.equal(state.player.ultimate.cooldown,0,'F bloqueado antes do nível 3');
  state.progress.archetypeProgress={[archetype]:{level:3}};
  input.pressed.add('f');step();assert(state.player.ultimate.cooldown>0,'F desbloqueado usa recarga compartilhada');assert(state.player.energy<100);
  state.progress.archetypeProgress[archetype].level=1;state.player.ultimate.cooldown=0;
  // Cada registro abre apenas sua eclusa, salva e não depende da cor.
  for(const [i,k] of KEYS.entries()) {
    Object.assign(state.player,{x:k.x,y:k.y});input.pressed.add('e');step();
    assert(state.progress.flags[k.flag]);assert.equal(checkpointIndex(state.progress.flags),i+1);
    assert.equal(wallAt(map,state.progress.flags,[8,15,22][i]+.5,6.5),0);
  }
  assert.deepEqual(state.progress.inventory,['objeto_teste']);
  // Tiros não atravessam a blindagem; depois causam dano no núcleo aberto.
  Object.assign(state.player,{x:25.5,y:6.5,invulnerable:1000});g.angle=0;g.enemies=[];g.boss.cycle=1;
  input.keys.space=true;step();assert.equal(g.boss.hp,280);
  g.boss.cycle=5;step(8);assert(g.boss.hp<280);
  // Recarga é real e não termina antes do bloqueio do Echovore.
  g.ammo=0;g.reload=1;g.jam=1.5;input.keys.space=false;step(30);assert(g.reload>.9);assert.equal(g.ammo,0);
  step(50);assert(g.reload<1);step(50);assert.equal(g.ammo,12);
  // Vitória e XP exatamente uma vez, inclusive após recarregar o save.
  g.boss.hp=1;g.boss.cycle=5;g.fire=0;input.keys.space=true;step();input.keys.space=false;
  assert(state.progress.flags.cidadela_estavel);assert(state.progress.flags.cidadela_recompensa);
  assert.equal(state.progress.activeQuest.status,'completed');
  assert.equal(state.progress.completedQuests.filter(x=>x==='embarque_dimensional').length,1);
  const xp=JSON.stringify(state.progress.archetypeProgress); assert(saveGame());
  state.progress={};assert(loadSaveIntoState(1));assert.equal(state.world.currentMapId,'cidadela_404');
  await loadMap('cidadela_404');clearCitadelRuntime();step();
  assert(getCitadelRuntime().boss.dead);assert.equal(getCitadelRuntime().enemies.length,0);
  assert.equal(JSON.stringify(state.progress.archetypeProgress),xp);assert.deepEqual(state.progress.inventory,['objeto_teste']);
  assert.equal(state.player.x,23.7,'checkpoint posterior à terceira eclusa');
  // Exercita inclusive impactos sem Image, como antes do carregamento ou offline.
  const runtime=getCitadelRuntime();runtime.angle=0;
  runtime.impacts=[{x:state.player.x+1,y:state.player.y,color:'metal',life:.2},
    {x:state.player.x+1.2,y:state.player.y,color:'shield',life:.2}];
  renderCitadel({width:1280,height:720,getContext:()=>context},state);
  await loadMap('estacao_limiar_666','vindo_da_cidadela');
  assert.equal(state.player.x,7.5);assert.equal(state.progress.archetype,archetype);
}
console.log('Cidadela FPS: portões, quatro módulos, recarga, núcleo, save, recompensa e retorno OK.');
