import assert from 'node:assert/strict';
import {prepararMareCromatica,iniciarMareCromatica,lerMareCromatica,avancarMareCromatica,registrarMareCromatica,objetivoCromatico} from '../js/game/mare-cromatica.js';
import {applyAttackDamage} from '../js/game/combat.js';
import {state} from '../js/game/state.js';
const old={archetype:'mare_astral',flags:{docas_neblina_alcancada:true,docas_chave:true},mareCromatica:{iniciada:true,restante:12,fragmentos:['costa'],fitas:['casa'],paineis:['origem'],sincronizacao:2,estacaoAberta:true,colapsos:2}};
assert(prepararMareCromatica(old));let d=lerMareCromatica(old);
assert.equal(d.restante,600);assert.equal(d.iniciada,false);assert.deepEqual(d.fragmentos,['costa']);assert.deepEqual(d.fitas,['casa']);assert.deepEqual(d.paineis,['origem']);assert.equal(d.sincronizacao,2);assert(d.estacaoAberta);assert(old.flags.docas_chave);
for(let i=0;i<1000;i++)assert.equal(avancarMareCromatica(old,.1),false);assert.equal(lerMareCromatica(old).restante,600);assert(!registrarMareCromatica(old,'fragmentos','estacao'));assert.match(objetivoCromatico(old),/INICIE A INCURSÃO NO BARCO/);
state.progress=old;state.world.currentMap={meta:{cromatica:true}};let e={cromaticaEnemy:true,health:50};assert.deepEqual(applyAttackDamage(e,{total:30}),{dealt:0,defeated:false});assert.equal(e.health,50);
assert(iniciarMareCromatica(old));assert(!iniciarMareCromatica(old));assert.equal(lerMareCromatica(old).restante,600);avancarMareCromatica(old,.1);const running=lerMareCromatica(old).restante;assert(running<600);assert(!prepararMareCromatica(old));assert.equal(lerMareCromatica(old).restante,running);assert.equal(applyAttackDamage(e,{total:30}).dealt,30);
const encerrada={archetype:'mare_astral',mareCromatica:{iniciada:true,desfecho:'total',restante:25,fragmentos:['costa']}};assert(prepararMareCromatica(encerrada));d=lerMareCromatica(encerrada);assert.equal(d.desfecho,'total');assert.equal(d.restante,25);assert(!iniciarMareCromatica(encerrada));
const falha={archetype:'mare_astral',flags:{cromatica_desfecho:'colapso'},mareCromatica:{iniciada:true,desfecho:'colapso',restante:0,fragmentos:['estacao'],fitas:['vigilia'],paineis:['origem'],colapsos:1}};prepararMareCromatica(falha);d=lerMareCromatica(falha);assert.equal(d.desfecho,null);assert.equal(d.restante,600);assert.equal(d.colapsos,1);assert.deepEqual(d.fragmentos,['estacao']);assert.deepEqual(d.fitas,['vigilia']);assert.deepEqual(d.paineis,[]);assert(!falha.flags.cromatica_desfecho);
console.log('Docas: migração única, espera, início explícito, combate e preservação de progresso OK.');

// Persistência: reler após iniciar não deve rearmar os dez minutos.
const memory=new Map();globalThis.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)??null,removeItem:k=>memory.delete(k)};
const {createNewSave,saveGame,loadSaveIntoState}=await import('../js/game/save.js');
createNewSave(1,'Teste');state.save.loaded=true;state.save.activeSlot=1;state.save.profileName='Teste';state.world.currentMapId='mare_cromatica_docas';state.world.currentSpawnId='inicio';
state.progress=old;assert(saveGame());state.progress={};assert(loadSaveIntoState(1));
assert.equal(lerMareCromatica(state.progress).restante,running);assert(lerMareCromatica(state.progress).iniciada);assert(!prepararMareCromatica(state.progress));assert.equal(lerMareCromatica(state.progress).restante,running);
console.log('Docas: save e reload mantêm cronômetro ativo sem reiniciar.');
