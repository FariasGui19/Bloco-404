// Exercita a escolha real do anel e o portal de retorno com transições reais.
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { checkInteractions } from '../js/game/interactions.js';
import { advanceDialogue, hasDialogueChoices, closeDialogue } from '../js/ui/dialogue.js';
import { isCutsceneOpen } from '../js/ui/cutscene.js';
import { updateCitadel, clearCitadelRuntime } from '../js/game/cidadela-fps.js';
const el=()=>({dataset:{},style:{},classList:{add(){},remove(){}},textContent:'',innerHTML:'',children:[],
 addEventListener(type,fn){this[type]=fn},appendChild(n){this.children.push(n)},setAttribute(){},focus(){},remove(){}});
const elements=Object.fromEntries(['dialogueBox','dialogueSpeaker','dialogueText','dialogueHint','dialogueChoices','mapTransitionOverlay','transitionText','transitionSubText'].map(id=>[id,el()]));
let modal;
globalThis.document={activeElement:el(),getElementById:id=>elements[id]??null,createElement:tag=>{
 const n=el(); if(tag==='section') {const parts=Object.fromEntries(['art','eyebrow','title','text','note','count','next','skip'].map(k=>[`.cutscene-${k}`,el()]));n.querySelector=k=>parts[k];n.parts=parts;} return n;
},body:{appendChild(n){modal=n}}};
globalThis.window={addEventListener(){},removeEventListener(){}};
state.save.loaded=false;state.save.activeSlot=null;state.world.portalLockUntil=0;
state.progress={archetype:'mare_astral',inventory:['teste'],flags:{metroCalibrado:true,frequencia666Registrada:true,freq666_ancora_origem:true,freq666_ancora_retorno:true,freq666_ancora_memoria:true,freq666_limiar_estavel:true},activeQuest:{id:'embarque_dimensional',stage:'limiar_preparado',status:'active'}};
await loadMap('estacao_limiar_666');Object.assign(state.player,{x:8.5,y:3.5});
await checkInteractions(true);advanceDialogue();assert(hasDialogueChoices());
elements.dialogueChoices.children.at(-2).click({preventDefault(){},stopPropagation(){}});
assert(state.progress.flags.freq666_limiar_preparado); assert(isCutsceneOpen());
modal.parts['.cutscene-skip'].click(); assert(!isCutsceneOpen());
await new Promise(resolve=>setTimeout(resolve,1100));
assert.equal(state.world.currentMapId,'cidadela_404','a escolha carrega a dimensão');
assert.deepEqual(state.progress.inventory,['teste']);
clearCitadelRuntime(); const input={keys:{},pressed:new Set(),mouseDeltaX:0}; updateCitadel(.033,state,input);
await new Promise(resolve=>setTimeout(resolve,600));
input.pressed.add('e');updateCitadel(.033,state,input);
await new Promise(resolve=>setTimeout(resolve,1100));
assert.equal(state.world.currentMapId,'estacao_limiar_666','E no retorno devolve à estação');
assert.equal(state.world.currentSpawnId,'vindo_da_cidadela');
assert.equal(state.progress.archetype,'mare_astral');assert.deepEqual(state.progress.inventory,['teste']);
// Ao voltar após a vitória, o anel reconhece o reator estável e mantém a escolha de revisita.
state.progress.flags.cidadela_estavel=true;Object.assign(state.player,{x:8.5,y:3.5});await checkInteractions(true);
assert.match(elements.dialogueText.textContent,/REATOR DA CIDADELA ESTÁ ESTÁVEL/);advanceDialogue();assert(hasDialogueChoices());
state.world.portalLockUntil=0;
elements.dialogueChoices.children.at(-2).click({preventDefault(){},stopPropagation(){}});
await new Promise(resolve=>setTimeout(resolve,1100));
assert.equal(state.world.currentMapId,'cidadela_404','a escolha após a vitória permite reentrada real');
clearCitadelRuntime();updateCitadel(.033,state,{keys:{},pressed:new Set(),mouseDeltaX:0});
assert(state.progress.flags.cidadela_estavel);assert.deepEqual(state.progress.inventory,['teste']);
console.log('Travessia real e retorno pela Estação 66.6 OK.');
