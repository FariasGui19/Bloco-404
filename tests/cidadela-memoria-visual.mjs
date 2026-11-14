import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {map,CITADEL_ARCHIVES} from '../js/data/worlds/cidadela-404/cidadela.js';
import {archiveContext} from '../js/game/cidadela-narrativa.js';
import {state} from '../js/game/state.js';
import {updateCitadel,renderCitadel,clearCitadelRuntime,getCitadelRuntime,nearestInteraction,enemyDeathAlpha} from '../js/game/cidadela-fps.js';
const names=['imp-lateral-colapso','imp-costas-colapso','orbe-lateral-colapso','orbe-costas-colapso','echo-lateral-colapso','echo-costas-colapso','arquivo-origem','arquivo-retorno','arquivo-memoria','arquivo-lido'];
for(const n of names){for(const dir of ['source-art','sprites'])assert(existsSync(`assets/${dir}/cidadela-404/memoria-${n}.png`));assert.equal(readFileSync(`assets/sprites/cidadela-404/memoria-${n}.png`)[25],6,`${n}: RGBA`);}
for(const a of CITADEL_ARCHIVES)assert(archiveContext(a.id).startsWith('NEXO:'));assert.equal(archiveContext('desconhecido'),'');
assert.equal(enemyDeathAlpha(.38),1);assert.equal(enemyDeathAlpha(.16),.5);assert.equal(enemyDeathAlpha(0),0);assert.equal(enemyDeathAlpha(.01,true),1);
const calls=[],texts=[],noop=()=>{};const ctx=new Proxy({}, {get(_t,k){if(k==='drawImage')return (...a)=>calls.push(a);if(k==='fillText')return (...a)=>texts.push(a);if(k==='measureText')return text=>({width:text.length*5});return noop;},set(){return true;}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};const motion={matches:false};globalThis.window={matchMedia:()=>motion};
const waiting=[];globalThis.Image=class{constructor(){this.width=128;this.height=128;}set src(v){this._src=v;if(['memoria-imp-lateral-colapso.png','memoria-arquivo-origem.png','memoria-arquivo-lido.png'].some(n=>v.endsWith(n)))waiting.push(this);else this.onload?.();}get src(){return this._src;}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{},inventory:['preservado']};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;Object.assign(state.player,{health:null,maxHealth:null,energy:100,invulnerable:999,ultimate:{cooldown:0}});clearCitadelRuntime();
const input={keys:{},pressed:new Set(),mouseDeltaX:0};const step=()=>{updateCitadel(.033,state,input);input.pressed.clear();};const press=key=>{input.pressed.add(key);step();};step();const g=getCitadelRuntime(),p=state.player;g.boss.dead=true;g.angle=0;Object.assign(p,{x:4.5,y:5.5});
const enemy={type:'imp',x:6.5,y:5.5,hp:0,death:.3,facing:Math.PI/2};g.enemies=[enemy];const render=()=>{calls.length=0;texts.length=0;renderCitadel({width:960,height:540,getContext:()=>ctx},state);};const drawn=n=>calls.filter(a=>a[0]?.src?.endsWith(n));const load=n=>waiting.find(i=>i.src.endsWith(n)).onload();
render();assert(drawn('imp-colapso.png').length,'fallback frontal durante carregamento');load('memoria-imp-lateral-colapso.png');
for(const [type,stem] of [['imp','imp'],['orb','orbe'],['echo','echo']]){
 Object.assign(enemy,{type,hp:0,death:.3,facing:Math.PI/2,moving:true,windup:.5});render();assert(drawn(`memoria-${stem}-lateral-colapso.png`).length,'colapso sobrepõe ataque e movimento');
 enemy.facing=-Math.PI/2;render();assert(drawn(`memoria-${stem}-lateral-colapso.png`)[0][1]>63,'lado espelhado');
 enemy.facing=0;render();assert(drawn(`memoria-${stem}-costas-colapso.png`).length,'colapso de costas');
 motion.matches=true;enemy.death=.6;render();assert(drawn(`memoria-${stem}-costas-colapso.png`).length,'colapso estático em movimento reduzido');assert(!drawn(`fecho-${stem}-costas-queda.png`).length);motion.matches=false;
 enemy.death=.6;render();assert(drawn(`fecho-${stem}-costas-queda.png`).length,'fase intermediária preservada');
 enemy.facing=Math.PI;enemy.death=.3;render();assert(drawn(type==='orb'?'orbe-colapso.png':type==='echo'?'echovore-colapso.png':'imp-colapso.png').length,'vista frontal anterior preservada');
}
Object.assign(p,{x:9.5,y:5.5});g.angle=Math.PI;Object.assign(enemy,{type:'imp',x:6.5,y:5.5,facing:0,death:.3});render();assert(!drawn('memoria-imp-costas-colapso.png').length,'parede oculta colapso');g.enemies=[];
const flags=state.progress.flags;flags.cidadela_chave_azul=true;flags.cidadela_chave_amarela=true;
function visit(a){Object.assign(p,{x:a.x,y:a.y+(a.id==='retorno'?-1:1)});g.angle=a.id==='retorno'?Math.PI/2:-Math.PI/2;assert.equal(nearestInteraction(map,flags,p)?.id,a.id);}
const first=CITADEL_ARCHIVES[0];visit(first);render();assert(drawn('prop-terminal.png').length,'terminal anterior enquanto arte não carrega');assert(!drawn('memoria-arquivo-lido.png').length);load('memoria-arquivo-origem.png');render();assert(drawn('memoria-arquivo-origem.png').length);
press('e');assert(flags[first.flag]);assert(g.message.includes(first.log));assert(g.radioQueue.includes(archiveContext(first.id)));render();assert(drawn('acabamento-interacao.png').length,'ícone anterior enquanto lido carrega');assert(texts.some(t=>String(t[0]).includes('REVER')));load('memoria-arquivo-lido.png');render();assert(drawn('memoria-arquivo-lido.png').length,'ícone de arquivo lido no aviso');
const xpFirst=JSON.stringify(state.progress.archetypeProgress);const queued=g.radioQueue.length;press('e');assert.equal(JSON.stringify(state.progress.archetypeProgress),xpFirst);assert.equal(g.radioQueue.length,queued,'rever não acumula leituras na fila');
const second=CITADEL_ARCHIVES[1];visit(second);render();assert(drawn('memoria-arquivo-retorno.png').length);press('e');assert(flags[second.flag]);
const third=CITADEL_ARCHIVES[2];visit(third);render();assert(drawn('memoria-arquivo-memoria.png').length);g.radioQueue=Array(6).fill('OCUPADO');press('e');assert(flags[third.flag]);assert(flags.cidadela_arquivo_recompensa);assert(g.message.includes(third.log),'o último log aparece mesmo com rádio cheio');assert(g.message.includes('ARQUIVO COMPLETO'));const xp=JSON.stringify(state.progress.archetypeProgress);press('e');assert.equal(JSON.stringify(state.progress.archetypeProgress),xp,'recompensa única');assert.deepEqual(state.progress.inventory,['preservado']);
motion.matches=true;render();assert(drawn('memoria-arquivo-memoria.png').length);assert(drawn('memoria-arquivo-lido.png').length);
console.log('Cidadela: colapso direcional e arquivos visuais/narrativos OK.');
