import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map} from '../js/data/worlds/cidadela-404/cidadela.js';
import {state} from '../js/game/state.js';
import {bossOpen,bossVisualFrame,updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime} from '../js/game/cidadela-fps.js';

const names=['imp-costas-dano','imp-lateral-queda','imp-costas-queda','orbe-costas-dano','orbe-lateral-queda','orbe-costas-queda','echo-costas-dano','echo-lateral-queda','echo-costas-queda','vigilante-aviso'];
for(const n of names){for(const dir of ['source-art','sprites'])assert(existsSync(`assets/${dir}/cidadela-404/fecho-${n}.png`));assert.equal(readFileSync(`assets/sprites/cidadela-404/fecho-${n}.png`)[25],6,`${n} tem alfa`);}
for(const [cycle,expected] of [[1.19,'bossClosed'],[1.2,'boss_warning'],[1.599,'boss_warning'],[1.6,'boss_warning_b'],[1.999,'boss_warning_b'],[2,'boss_attack'],[4.2,'boss_open_a']])assert.equal(bossVisualFrame({cycle},0),expected);
assert.equal(bossVisualFrame({cycle:1.9},0,true),'boss_warning');assert(!bossOpen({cycle:1.9}));assert(bossOpen({cycle:4.2}));
const calls=[],noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>calls.push(a);return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
const waiting=[];globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(['fecho-imp-costas-dano.png','fecho-imp-lateral-queda.png','fecho-vigilante-aviso.png'].some(n=>v.endsWith(n)))waiting.push(this);else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=()=>{updateCitadel(.033,state,input);input.pressed.clear();};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const enemy={type:'imp',x:6.5,y:5.5,hp:55,facing:0,moving:true,hurt:.1};g.enemies=[enemy];
const render=()=>{calls.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>calls.filter(a=>a[0]?.src?.endsWith(n));const load=n=>waiting.find(i=>i.src.endsWith(n)).onload();
render();assert(drawn('refino-imp-dano.png').length,'dano frontal enquanto arte não carregou');load('fecho-imp-costas-dano.png');
for(const [type,stem,death] of [['imp','imp','imp-colapso.png'],['orb','orbe','orbe-colapso.png'],['echo','echo','echovore-colapso.png']]){
 Object.assign(enemy,{type,hp:55,hurt:.1,windup:0,attack:0,death:0,facing:0,moving:true});render();assert(drawn(`fecho-${stem}-costas-dano.png`).length,'reação direcional de costas');
 motion.matches=true;render();assert(drawn(`fecho-${stem}-costas-dano.png`).length,'reação permanece com movimento reduzido');motion.matches=false;
 enemy.windup=.3;render();assert(drawn(`combate-${stem}-costas-aviso.png`).length,'aviso tem prioridade sobre dano');
 Object.assign(enemy,{hp:0,death:.6,facing:Math.PI/2});render();
 if(type==='imp'){assert(drawn('refino-imp-queda.png').length,'fallback frontal na queda ainda não carregada');load('fecho-imp-lateral-queda.png');render();}
 assert(drawn(`fecho-${stem}-lateral-queda.png`).length,'queda lateral tem prioridade mesmo durante aviso');
 enemy.facing=-Math.PI/2;render();assert(drawn(`fecho-${stem}-lateral-queda.png`)[0][1]>63,'lateral espelhada');
 enemy.facing=0;render();assert(drawn(`fecho-${stem}-costas-queda.png`).length,'queda de costas');
 motion.matches=true;render();assert(drawn(`memoria-${stem}-costas-colapso.png`).length,'movimento reduzido mantém colapso direcional estático');motion.matches=false;
 enemy.death=.38;render();assert(drawn(`memoria-${stem}-costas-colapso.png`).length,'colapso final permanece na mesma janela');
}
// As novas imagens também respeitam o z-buffer das paredes.
Object.assign(p,{x:9.5,y:5.5});g.angle=Math.PI;Object.assign(enemy,{type:'imp',x:6.5,y:5.5,hp:0,death:.6,facing:0,windup:0});render();assert(!drawn('fecho-imp-costas-queda.png').length,'parede encobre queda');
Object.assign(p,{x:4.5,y:5.5});g.angle=0;
// O relógio de queda já existente continua congelado na pausa.
Object.assign(enemy,{type:'imp',hp:0,death:.6,windup:0});input.pressed.add('p');step();const frozen=enemy.death;for(let i=0;i<8;i++)step();assert.equal(enemy.death,frozen);input.pressed.add('p');step();assert(enemy.death<frozen);
// A nova preparação continua blindada, mantém aviso anterior enquanto carrega
// e não modifica o HP, o ciclo ou qualquer regra de combate no render.
g.enemies=[];state.progress.flags.cidadela_chave_vermelha=true;Object.assign(p,{x:24,y:6.5});Object.assign(g.boss,{dead:false,x:28,y:6.5,hp:280,cycle:1.8,hurt:0,cooldown:99});render();assert(drawn('vida-vigilante-aviso.png').length,'fallback do aviso');load('fecho-vigilante-aviso.png');const before=[g.boss.hp,g.boss.cycle,g.boss.cooldown];render();assert(drawn('fecho-vigilante-aviso.png').length);assert.deepEqual([g.boss.hp,g.boss.cycle,g.boss.cooldown],before);motion.matches=true;render();assert(drawn('vida-vigilante-aviso.png').length,'preparação estática em movimento reduzido');
console.log('Cidadela: dano de costas, queda direcional e aviso final do Vigilante OK.');
