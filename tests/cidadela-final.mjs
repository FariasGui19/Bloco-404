import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';
import { CITADEL_END_SCENES, isCutsceneOpen } from '../js/ui/cutscene.js';
const el=()=>({dataset:{},style:{},classList:{add(){},remove(){}},textContent:'',innerHTML:'',children:[],
 addEventListener(type,fn){this[type]=fn},appendChild(n){this.children.push(n)},setAttribute(){},focus(){},remove(){}});
let modal;
globalThis.document={activeElement:el(),createElement:()=>{
 const n=el(), parts=Object.fromEntries(['art','eyebrow','title','text','note','count','next','skip'].map(k=>[`.cutscene-${k}`,el()]));
 n.querySelector=k=>parts[k];n.parts=parts;return n;
},body:{appendChild(n){modal=n}}};
globalThis.window={addEventListener(){},removeEventListener(){}};
for (const s of CITADEL_END_SCENES) assert(existsSync(s.image));
state.save.loaded=false;state.save.activeSlot=null;
state.world.currentMap=map;state.progress={archetype:'mare_astral',flags:{cidadela_chave_azul:true,cidadela_chave_amarela:true,cidadela_chave_vermelha:true},inventory:[],activeQuest:{id:'embarque_dimensional',stage:'limiar_preparado',status:'active'}};
state.player.health=null;state.player.maxHealth=null;state.player.energy=100;state.player.ultimate={cooldown:0};
const input={keys:{},pressed:new Set(),mouseDeltaX:0};
clearCitadelRuntime();updateCitadel(.033,state,input);const g=getCitadelRuntime();g.enemies=[];
Object.assign(state.player,{x:25.5,y:6.5});g.boss.cycle=5;g.boss.hp=1;input.keys.space=true;updateCitadel(.033,state,input);input.keys.space=false;
assert(state.progress.flags.cidadela_estavel);assert(isCutsceneOpen());assert(!state.progress.flags.cidadela_final_visto);
assert.equal(state.progress.activeQuest.status,'completed');assert.equal(g.panel,'pause');
modal.parts['.cutscene-skip'].click();await Promise.resolve();
assert(!isCutsceneOpen());assert(state.progress.flags.cidadela_final_visto);
clearCitadelRuntime();updateCitadel(.033,state,input);assert(!isCutsceneOpen(),'não repete desfecho visto');
// Uma interrupção antes do fim conserva a vitória e reapresenta a cena.
delete state.progress.flags.cidadela_final_visto;clearCitadelRuntime();updateCitadel(.033,state,input);
assert(isCutsceneOpen());modal.parts['.cutscene-skip'].click();await Promise.resolve();assert(state.progress.flags.cidadela_final_visto);
console.log('Desfecho: cena pulável, retomada após interrupção e vitória única OK.');
