// Testa mecânicas locais sem alterar os kits nem a progressão de outras dimensões.
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { updateCitadel,getCitadelRuntime,clearCitadelRuntime } from '../js/game/cidadela-fps.js';
const input={keys:{},pressed:new Set(),mouseDeltaX:0,fpsFireHeld:false};
const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};
function start(id,tool=null) {
  state.progress={archetype:id,inventory:[],flags:{},archetypeProgress:{[id]:{level:3,xp:0}},tools:tool?{[id]:tool}:{}};
  state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
  Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:0,ultimate:{cooldown:0}});
  input.keys={};input.pressed.clear();input.fpsFireHeld=false;clearCitadelRuntime();step();
  Object.assign(state.player,{x:4.5,y:5.5,invulnerable:0});const g=getCitadelRuntime();g.angle=0;g.enemies=[];g.boss.dead=true;return g;
}
function press(key){input.pressed.add(key);step();}
for(const id of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']) {
  const g=start(id), p=state.player, energy=p.energy;
  // Shift lateral mantém a direção mesmo ao soltar D; Q continua independente.
  input.keys.d=true;press('shift');input.keys.d=false;
  const x=p.x,y=p.y;step(4);assert(p.y>y+.4,`${id}: impulso lateral`);assert(Math.abs(p.x-x)<.01);
  assert(g.boost>0 && g.q===0,'impulso não consome recarga de Q');
  step(6);press('q');assert(g.q>0 && p.energy<energy,'Q pode ser usado durante recarga de Shift');
  // Proteção, interrupção e pausa não modificam os kits persistidos.
  assert.deepEqual(state.progress.tools,{});
}
// As quatro versões de Q preservam identidades e custam energia de fato.
for(const id of ['mare_astral','nucleo_dez_forma','lamina_dominio_anciao','motor_bio_forja']) {
  const g=start(id),p=state.player,e={type:'imp',x:6,y:5.5,hp:100,cooldown:99,slow:0};g.enemies=[e];
  const energy=p.energy;press('q');assert(p.energy<energy && g.q>0);
  if(id==='mare_astral') assert(e.slow>2.9 && g.dash>0,'maré desacelera e avança');
  if(id==='nucleo_dez_forma') assert(g.dash>.3,'núcleo tem impulso mais longo');
  if(id==='lamina_dominio_anciao') assert.equal(e.hp,45,'domínio corta à frente');
  if(id==='motor_bio_forja') assert(g.shield>2.4 && g.dash>0,'forja protege e avança');
}
{
  const g=start('lamina_dominio_anciao','espada_de_dominio'),p=state.player;
  Object.assign(p,{x:7.5,y:5.5});const e={type:'imp',x:9.5,y:5.5,hp:100,cooldown:99,slow:0};g.enemies=[e];
  press('q');assert.equal(e.hp,100,'corte não atravessa eclusa');press('f');assert.equal(e.hp,100,'ultimate não atravessa eclusa');
}
{
  const g=start('mare_astral');g.ammo=7;press('t');assert(g.reload>0);assert.equal(g.ammo,7,'recarga tática preserva munição');
  g.jam=2;g.fire=0;press('space');assert.equal(g.ammo,6);assert.equal(g.reload,0,'disparo cancela recarga mesmo bloqueada');
  g.jam=0;g.fire=0;press('t');step(50);assert.equal(g.ammo,12);assert.equal(g.reload,0);
  g.ammo=0;g.reload=0;g.jam=1;g.fire=0;press('space');assert.equal(g.ammo,0);assert.equal(g.reload,0,'bloqueio não cria munição');
}
{
  const g=start('lamina_dominio_anciao','espada_de_dominio');
  const front={type:'imp',x:6,y:5.5,hp:100,cooldown:99,slow:0},back={type:'imp',x:3,y:5.5,hp:100,cooldown:99,slow:0};g.enemies=[front,back];
  press('f');assert.equal(front.hp,58,'sobrecarga em linha acerta à frente');assert.equal(back.hp,100,'sobrecarga em linha não acerta atrás');
  assert.equal(g.ultBuff.basicDamagePct,.15);assert(g.ultBuff.timeLeft>0);g.fire=0;press('space');assert.equal(front.hp,26,'bônus de tiro aplicado');
  assert(state.player.ultimate.cooldown>0);const energy=state.player.energy;press('f');assert(state.player.energy>=energy,'recarga impede gasto duplicado');
}
{
  const g=start('lamina_dominio_anciao','escudo_de_dominio'),p=state.player;press('f');assert(g.guard>2.9);
  const incoming=()=>({x:p.x-.18,y:p.y,dx:3,dy:0,life:1,damage:20,jam:true,counter:'lamina_dominio_anciao'});
  const hp=p.health;g.shots=[incoming()];step();assert.equal(p.health,hp);assert.equal(g.jam,0,'guarda bloqueia contramedida');
  g.guard=0;g.shield=0;p.invulnerable=0;g.shots=[incoming()];step();assert(p.health<hp);assert(g.jam>0,'após a guarda o pulso funciona');
}
{
  const g=start('mare_astral');const p=state.player;
  for(const kind of ['imp','orb','echo']) {
    g.shots=[];g.enemies=[{type:kind,x:6,y:5.5,hp:100,cooldown:3,slow:0,windup:.01}];step();
    assert.equal(g.shots[0]?.kind,kind,`projétil conserva origem ${kind}`);
  }
  g.enemies=[];g.ammo=12;g.fire=0;input.fpsFireHeld=true;step(35);input.fpsFireHeld=false;
  assert(g.ammo<10,'botão segurado repete disparos');
  input.fpsFireHeld=true;press('p');assert.equal(input.fpsFireHeld,false,'pausa cancela botão segurado');
}
{
  const g=start('mare_astral','passo_abissal'),p=state.player;
  const front={type:'imp',x:6,y:5.5,hp:100,cooldown:99,slow:0},back={type:'imp',x:3,y:5.5,hp:100,cooldown:99,slow:0};
  g.enemies=[front,back];press('f');assert(front.hp<100);assert.equal(back.hp,100,'avanço não atinge atrás');
  assert(g.dash>0);const x=p.x;step(3);assert(p.x>x+.4,'ferramenta de avanço desloca');assert.equal(g.ultBuff.moveSpeedPct,.25);
}
{
  const g=start('mare_astral','senso_de_corrente'),p=state.player;press('f');
  const energy=p.energy;step(20);assert(p.energy-energy>4.4,'sobrecarga aplica regeneração de energia escolhida');
  assert.equal(g.ultBuff.energyRegen,2);
}
{
  const g=start('motor_bio_forja'),p=state.player;p.health=20;press('f');
  const hp=p.health;assert(g.shield>0);step(20);assert(p.health>hp+1.8,'forja cura durante o bônus');
  p.health=0;p.deathTimer=.001;step();assert.equal(g.ultBuff,null,'morte remove bônus de sessão');assert.equal(g.shield,0);
}
{
  const g=start('mare_astral');state.progress.flags.cidadela_chave_vermelha=true;
  Object.assign(state.player,{x:21.5,y:6.5});g.boss.dead=false;g.boss.hp=0;step();
  assert(g.boss.dead && state.progress.flags.cidadela_estavel,'vitória resolvida fora da arena');
}
for(const name of ['disparo-mare','disparo-nucleo','disparo-dominio','disparo-bio','selo-mare','selo-nucleo','selo-dominio','selo-bio','projetil-echo','projetil-orbe']) {
  const path=`assets/sprites/cidadela-404/${name}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6,`${name}: RGBA`);
}
console.log('Cidadela: impulso direcional, recarga, rajada, ferramentas, guarda e projéteis OK.');
