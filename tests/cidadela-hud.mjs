import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { clearCitadelRuntime,updateCitadel,renderCitadel,getCitadelRuntime,wrapCitadelText } from '../js/game/cidadela-fps.js';
const calls=[];let font='';
const noop=()=>{};
const ctx=new Proxy({}, {get(_t,key){if(key==='font')return font;if(key==='fillText')return (...args)=>calls.push({args,font});return noop;},set(_t,key,value){if(key==='font')font=value;return true;}});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
state.progress={archetype:'mare_astral',flags:{},inventory:[]};state.world.currentMap=map;state.world.isLoading=false;state.world.fpsPauseRequested=false;
Object.assign(state.player,{health:null,maxHealth:null,energy:100,ultimate:{cooldown:0}});
clearCitadelRuntime();updateCitadel(.033,state,{keys:{},pressed:new Set(),mouseDeltaX:0});
const g=getCitadelRuntime();g.message='NEXO: UMA LINHA LONGA QUE PRECISA PERMANECER LEGÍVEL SEM SER COMPRIMIDA. O RETORNO ESTÁ ABERTO E O SINAL PERMANECE INDEFINIDO.';g.messageTime=5;
renderCitadel({width:960,height:540,getContext:()=>ctx},state);
const commands=calls.filter(c=>String(c.args[0]).includes('WASD MOVE')||String(c.args[0]).includes('R RADAR · T REC'));
assert.equal(commands.length,2);for(const c of commands){assert.match(c.font,/9px/);assert.equal(c.args.length,3,'não comprime texto com maxWidth');assert(c.args[0].length<=80);}
for(const line of wrapCitadelText(g.message)) {
 const entry=calls.find(c=>c.args[0]===line);assert(entry);assert.match(entry.font,/10px/);assert.equal(entry.args.length,3);assert(line.length<=66);
}
console.log('Cidadela: HUD sem compressão de comandos e rádio em linhas legíveis OK.');
