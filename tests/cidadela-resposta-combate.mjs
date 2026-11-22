import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {weaponVisualFrame,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';
import {toggleCitadelAudio} from '../js/game/cidadela-audio.js';
const names=['imp-lateral-disparo','imp-costas-disparo','orbe-lateral-disparo','orbe-costas-disparo','echo-lateral-disparo','echo-costas-disparo','recarga-mare','recarga-nucleo','recarga-dominio','recarga-bio'];
for(const n of names){for(const dir of ['source-art','sprites'])assert(existsSync(`assets/${dir}/cidadela-404/resposta-${n}.png`));assert.equal(readFileSync(`assets/sprites/cidadela-404/resposta-${n}.png`)[25],6,`${n}: RGBA`);}
assert.equal(weaponVisualFrame(0,false,1,1),'blocked');assert.equal(weaponVisualFrame(.2,false,1,1),'fire');assert.equal(weaponVisualFrame(0,false,0,1),'idle');assert.equal(weaponVisualFrame(0,true,1,1),'idle');
const draws=[],texts=[],noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>draws.push(a);if(k==='fillText')return (...a)=>texts.push(a[0]);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};const waiting=[];
globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(['resposta-imp-lateral-disparo.png','resposta-recarga-mare.png'].some(n=>v.endsWith(n)))waiting.push(this);else this.onload?.();}get src(){return this._src;}};
const sound=[];globalThis.localStorage={getItem:()=>null,setItem:()=>{}};globalThis.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createOscillator(){return {frequency:{setValueAtTime(v){sound.push(v);},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=()=>{updateCitadel(.033,state,input);input.pressed.clear();};const press=k=>{input.pressed.add(k);step();};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const e={type:'imp',x:6.5,y:5.5,hp:55,cooldown:99,slow:0,facing:Math.PI/2,windup:0,attack:.2,moving:false};g.enemies=[e];g.shots=[];
const render=()=>{draws.length=texts.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>draws.filter(a=>a[0]?.src?.endsWith(n));const load=n=>waiting.find(i=>i.src.endsWith(n)).onload();
render();assert(drawn('combate-imp-lateral-aviso.png').length,'fallback direcional enquanto arte carrega');load('resposta-imp-lateral-disparo.png');
for(const [type,stem] of [['imp','imp'],['orb','orbe'],['echo','echo']]){
 Object.assign(e,{type,hp:55,windup:0,attack:.2,hurt:.1,facing:Math.PI/2,moving:true});const before=[e.hp,e.attack,g.shots.length];render();assert(drawn(`resposta-${stem}-lateral-disparo.png`).length);assert.deepEqual([e.hp,e.attack,g.shots.length],before,'visual não emite projétil');
 e.facing=-Math.PI/2;render();assert(drawn(`resposta-${stem}-lateral-disparo.png`)[0][1]>63,'perfil espelhado');e.facing=0;render();assert(drawn(`resposta-${stem}-costas-disparo.png`).length);
 e.windup=.3;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'preparação prevalece');e.windup=0;motion.matches=true;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'quadro estático com movimento reduzido');assert(!drawn(`resposta-${stem}-costas-disparo.png`).length);motion.matches=false;
 e.hp=0;e.death=.6;render();assert(!drawn(`resposta-${stem}-costas-disparo.png`).length,'queda prevalece');
}
// O quadro lateral também ocorre após um disparo real da IA, não apenas
// em um estado de render simulado.
Object.assign(e,{type:'imp',x:6.5,y:5.5,hp:55,death:0,cooldown:2,slow:0,windup:.02,attack:0,facing:Math.PI/2,moving:false});g.shots=[];step();assert.equal(g.shots.length,1);assert(e.attack>0);render();assert(drawn('resposta-imp-lateral-disparo.png').length,'disparo real seleciona o quadro lateral');g.shots=[];
Object.assign(p,{x:9.5,y:5.5});g.angle=Math.PI;Object.assign(e,{type:'imp',x:6.5,y:5.5,hp:55,death:0,attack:.2,windup:0,facing:Math.PI});render();assert(!drawn('resposta-imp-costas-disparo.png').length,'parede oculta reação');
g.enemies=[];Object.assign(p,{x:4.5,y:5.5});g.angle=0;assert(toggleCitadelAudio());sound.length=0;
// A recarga solicitada sob bloqueio é mantida, sem som de início antecipado.
g.ammo=7;g.reload=0;g.jam=.3;g.fire=0;press('t');assert.equal(g.reload,1.5);assert.equal(g.ammo,7);assert(g.message.includes('FILA'));assert(!sound.includes(180),'sem som de início sob bloqueio');render();assert(drawn('canhao-mare.png').length,'fallback de recarga bloqueada');assert(texts.some(t=>t.includes('BLOQUEADA')));load('resposta-recarga-mare.png');render();assert(drawn('resposta-recarga-mare.png').length);
const held=g.reload;press('t');assert.equal(g.reload,held,'repetir T não reinicia');press('p');const frozen=[g.reload,g.jam];for(let i=0;i<5;i++)step();assert.deepEqual([g.reload,g.jam],frozen);press('p');assert.equal(g.reload,held);while(g.jam>0)step();assert(sound.includes(180),'som opcional toca quando recarga realmente retoma');assert.equal(g.ammo,7);while(g.reload>0)step();assert.equal(g.ammo,12);assert(sound.includes(320),'som opcional de conclusão');
// Só a fração livre do quadro conta no fim do bloqueio.
g.ammo=5;g.reload=1;g.jam=.01;g.fire=0;step();assert(Math.abs(g.reload-(1-(.033-.01)))<1e-9);assert.equal(g.ammo,5);
// Recarga tática na fila é cancelável ao disparar as balas restantes.
g.reload=0;g.ammo=4;g.jam=1;g.fire=0;press('t');assert.equal(g.reload,1.5);press('space');assert.equal(g.reload,0);assert.equal(g.ammo,3);assert(g.jam>0);
// Uma tentativa de disparo vazio também agenda a recarga, sem duplicar.
g.ammo=0;g.fire=0;g.reload=0;g.jam=.3;press('space');assert.equal(g.ammo,0);assert.equal(g.reload,1.5);press('space');assert.equal(g.reload,1.5);while(g.jam>0)step();while(g.reload>0)step();assert.equal(g.ammo,12);
g.ammo=12;g.reload=0;g.jam=1;press('t');assert.equal(g.reload,0,'munição cheia não agenda recarga');
for(const [id,mode] of [['mare_astral','mare'],['nucleo_dez_forma','nucleo'],['lamina_dominio_anciao','dominio'],['motor_bio_forja','bio']]){
 state.progress.archetype=id;g.fire=0;g.ammo=5;g.reload=1;g.jam=1;render();assert(drawn(`resposta-recarga-${mode}.png`).length);assert(texts.some(t=>t.includes('REC BLOQUEADA')));motion.matches=true;render();assert(!drawn(`resposta-recarga-${mode}.png`).length);assert(texts.some(t=>t.includes('REC BLOQUEADA')));motion.matches=false;
}
// Morte limpa fila e bloqueio no checkpoint sem persistir estado temporário.
state.progress.archetype='mare_astral';g.ammo=0;g.reload=1.5;g.jam=2;p.health=0;p.deathTimer=.001;step();assert.equal(g.reload,0);assert.equal(g.jam,0);assert.equal(g.ammo,12);
console.log('Cidadela: reação direcional e fila segura de recarga bloqueada OK.');
