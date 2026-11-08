import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { checkGate, isGateOpen } from '../js/game/gates.js';
import { tryModuleInteraction, getModuleInteractionPrompt } from '../js/game/module-interactions.js';
import { checkInteractions, findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { initDialogue, closeDialogue, isDialogueOpen } from '../js/ui/dialogue.js';
import { canStandAt } from '../js/game/collision.js';
import { getSave } from '../js/game/save.js';
const els=Object.fromEntries(['dialogueBox','dialogueSpeaker','dialogueText','dialogueHint','dialogueChoices'].map(id=>[id,{dataset:{},classList:{add(){},remove(){}},addEventListener(){},textContent:'',innerHTML:''}]));
globalThis.document={getElementById:id=>els[id]};globalThis.window={addEventListener(){}};
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
initDialogue();state.progress={archetype:'motor_bio_forja',abilities:['bio_dash','bio_diagnostic'],flags:{collected_bio_estacao_condutor:true,collected_bio_estacao_regulador:true},inventory:['bio_estacao_condutor','bio_estacao_regulador']};
state.save.loaded=true;state.save.activeSlot=1;
await loadMap('ilha_estacao_bio');let first=state.objects.find(o=>o.id==='bio_reparo_condutor'), second=state.objects.find(o=>o.id==='bio_reparo_regulador');
function moveNear(o){state.player.x=o.x-1.1;state.player.y=o.y; assert(canStandAt(state.world.currentMap,state.player.x,state.player.y,.28,state.player));}
moveNear(second);assert(!checkGate(second.gate));assert.equal(getInteractionPrompt(findNearestInteraction()),'REPARE O CONDUTOR PRIMEIRO');assert(!tryModuleInteraction());
// Mesmo com um diagnóstico antigo/inconsistente, a ordem exige o primeiro reparo.
state.progress.flags.bio_reparo_regulador_diagnostico=true;assert(!checkGate(second.gate));delete state.progress.flags.bio_reparo_regulador_diagnostico;
moveNear(first);state.progress.archetype='mare_astral';assert(!checkGate(first.gate));assert(!tryModuleInteraction());state.progress.archetype='motor_bio_forja';assert.equal(getModuleInteractionPrompt(),'DIAGNOSTICAR CONDUTOR');assert(!checkGate(first.gate));await checkInteractions(true);assert(isDialogueOpen());assert(!isGateOpen(first));closeDialogue();
assert(tryModuleInteraction());assert(state.progress.flags.bio_reparo_condutor_diagnostico);assert(getSave(1).progress.flags.bio_reparo_condutor_diagnostico);closeDialogue();assert.equal(state.player.ability.scanning,0);
await checkInteractions(true);assert(isGateOpen(first));assert.equal(first.sprite,'bio_condutor_ativo');assert(first.bloqueia);assert(!canStandAt(state.world.currentMap,first.x,first.y,.28,state.player));closeDialogue();assert(getSave(1).progress.flags.gate_bio_reparo_condutor);
moveNear(second);assert.equal(getModuleInteractionPrompt(),'DIAGNOSTICAR REGULADOR');assert(tryModuleInteraction());closeDialogue();await checkInteractions(true);assert(isGateOpen(second));assert.equal(second.sprite,'bio_regulador_ativo');assert(second.bloqueia);closeDialogue();
assert(getSave(1).progress.flags.gate_bio_reparo_regulador);assert(state.progress.flags.collected_bio_estacao_condutor);assert(state.progress.flags.collected_bio_estacao_regulador);
await loadMap('ilha_estacao_bio');first=state.objects.find(o=>o.id==='bio_reparo_condutor');second=state.objects.find(o=>o.id==='bio_reparo_regulador');assert(isGateOpen(first)&&isGateOpen(second));assert(first.bloqueia&&second.bloqueia);assert.equal(first.sprite,'bio_condutor_ativo');assert.equal(second.sprite,'bio_regulador_ativo');
console.log('Bio: diagnóstico R, reparo E, sequência, colisão e persistência OK.');
