import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime,weaponVisualFrame} from '../js/game/cidadela-fps.js';
const names=['acabamento-recarga-mare','acabamento-recarga-nucleo','acabamento-recarga-dominio','acabamento-recarga-bio','acabamento-suprimento','acabamento-escudo','acabamento-bloqueio','acabamento-interacao','acabamento-impacto-metal','acabamento-impacto-escudo'];
for(const n of names){const path=`assets/sprites/cidadela-404/${n}.png`;assert(existsSync(path));assert.equal(readFileSync(path)[25],6,`${n}: RGBA`);}
assert.equal(weaponVisualFrame(.2,false,1,0),'fire','disparo tem prioridade');
assert.equal(weaponVisualFrame(0,false,1,0),'reload');assert.equal(weaponVisualFrame(0,false,1,1),'idle');
assert.equal(weaponVisualFrame(0,true,1,0),'idle','redução de movimento');
assert.equal(weaponVisualFrame(0,false,1.5,0),'idle');assert.equal(weaponVisualFrame(0,false,.2,0),'idle');
const draws=[],texts=[],rects=[];const noop=()=>{};
const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a[0]?.src);if(k==='fillText')return (...a)=>texts.push(a[0]);if(k==='fillRect')return (...a)=>rects.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
const canvas={width:960,height:540,getContext:()=>ctx};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=(n=1)=>{for(let i=0;i<n;i++){updateCitadel(.033,state,input);input.pressed.clear();}};const press=k=>{input.pressed.add(k);step();};step();
const g=getCitadelRuntime(),p=state.player;g.enemies=[];g.boss.dead=true;Object.assign(p,{x:4.5,y:5.5});g.angle=0;g.ammo=7;
const render=()=>{draws.length=texts.length=rects.length=0;renderCitadel(canvas,state);};const has=n=>draws.some(s=>s?.endsWith(n));
press('t');assert.equal(g.reload,1.5);step(15);assert(g.reload<1.3 && g.reload>.3);const beforeJam=g.reload;render();assert(has('acabamento-recarga-mare.png'));assert(texts.some(t=>t.includes('RECARGA')));assert(rects.some(r=>r[1]===244&&r[3]===2),'barra de progresso');
g.jam=1;step(8);assert.equal(g.reload,beforeJam,'bloqueio congela recarga');render();assert(has('acabamento-bloqueio.png'));assert(!has('acabamento-recarga-mare.png'));assert(texts.some(t=>t.includes('BLOQUEADA')));
press('p');const pause=[g.reload,g.jam];step(20);assert.deepEqual([g.reload,g.jam],pause,'pausa congela bloqueio e recarga');press('p');
g.fire=0;press('space');assert.equal(g.ammo,6);assert.equal(g.reload,0,'disparo interrompe recarga com munição mesmo sob bloqueio');assert.equal(g.impacts.at(-1).color,'metal','tiro sem alvo produz impacto na parede');
step(35);g.jam=0;g.fire=0;g.ammo=0;press('space');assert(g.reload>0);step(50);assert.equal(g.ammo,12,'recarga vazia completa uma única vez');
for(const [id,mode] of [['mare_astral','mare'],['nucleo_dez_forma','nucleo'],['lamina_dominio_anciao','dominio'],['motor_bio_forja','bio']]){
 state.progress.archetype=id;g.fire=0;g.reload=.8;g.jam=0;render();assert(has(`acabamento-recarga-${mode}.png`));motion.matches=true;render();assert(!has(`acabamento-recarga-${mode}.png`));assert(texts.some(t=>t.includes('RECARGA')));motion.matches=false;
}
state.progress.archetype='mare_astral';g.reload=0;g.guard=2;g.shield=4;g.vectorCharge=2;g.echoAnchor=3;render();assert(has('acabamento-escudo.png'));assert(texts.some(t=>t.includes('GUARDA')&&t.includes('ESCUDO')&&t.includes('VETOR')&&t.includes('SINAL')),'proteção e vetor aparecem juntos');
Object.assign(p,{x:2.5,y:6.5});g.guard=0;g.shield=0;g.vectorCharge=0;g.echoAnchor=0;render();assert(has('acabamento-interacao.png'));assert(texts.some(t=>t.includes('RETORNAR')));
// Reação do chefe blindado, sem dano ou marcador de acerto.
Object.assign(p,{x:24,y:6.5});state.progress.flags.cidadela_chave_vermelha=true;g.angle=0;Object.assign(g.boss,{x:28,y:6.5,hp:280,dead:false,cycle:0,cooldown:10});g.fire=0;g.ammo=12;g.hit=0;g.impacts=[];press('space');assert.equal(g.boss.hp,280);assert.equal(g.hit,0);assert.equal(g.impacts.at(-1).color,'shield');render();assert(has('acabamento-impacto-escudo.png'));
// Suprimento permanece no mapa quando a vida está cheia, é usado só ao curar.
Object.assign(p,{x:4.5,y:9.5,health:p.maxHealth});g.boss.dead=true;g.supplies=[{x:p.x+.4,y:p.y}];g.angle=0;g.impacts=[];render();assert(has('acabamento-suprimento.png'));step();assert(!g.supplies[0].used);p.health=1;step();assert(g.supplies[0].used);render();assert(!has('acabamento-suprimento.png'));
console.log('Cidadela: recarga, bloqueio, pausa, proteções, interação, impactos e suprimentos OK.');
