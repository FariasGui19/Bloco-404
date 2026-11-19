import assert from 'node:assert/strict';
import {state} from '../js/game/state.js';
import {lerMareCromatica,prepararRetornoDocas} from '../js/game/mare-cromatica.js';
const memory=new Map();globalThis.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)??null,removeItem:k=>memory.delete(k)};
const {createNewSave,loadSaveIntoState,saveGame}=await import('../js/game/save.js');
function fixture(slot, archetype='mare_astral', ending='colapso'){
 const s=createNewSave(slot,'Teste');s.world.lastMapId='ilha_enseada_ecos';s.world.lastSpawnId='inicio';
 s.progress.archetype=archetype;s.progress.flags={docas_neblina_alcancada:true,cromatica_desfecho:ending,docas_chave:true};
 s.progress.mareCromatica={versaoCronometro:1,iniciada:true,restante:0,desfecho:ending,fragmentos:['costa'],fitas:['casa'],paineis:['origem'],colapsos:1};
 memory.set('BLOCO404_SAVE_SLOT_'+slot,JSON.stringify(s));
}
fixture(1);fixture(2,'outro');fixture(3,'mare_astral','total');
let s=loadSaveIntoState(1);assert.equal(s.world.lastMapId,'mare_cromatica_docas');let d=lerMareCromatica(state.progress);assert.equal(d.restante,600);assert.equal(d.iniciada,false);assert.equal(d.desfecho,null);assert.deepEqual(d.fragmentos,['costa']);assert.deepEqual(d.fitas,['casa']);assert.deepEqual(d.paineis,[]);assert.equal(d.colapsos,1);assert(state.progress.flags.docas_chave);assert(saveGame());
s=loadSaveIntoState(1);assert.equal(s.world.lastMapId,'mare_cromatica_docas');assert.equal(lerMareCromatica(state.progress).desfecho,null);
s=loadSaveIntoState(2);assert.equal(s.world.lastMapId,'ilha_enseada_ecos');assert.equal(lerMareCromatica(state.progress).desfecho,'colapso');
s=loadSaveIntoState(3);assert.equal(s.world.lastMapId,'ilha_enseada_ecos');assert.equal(lerMareCromatica(state.progress).desfecho,'total');assert.equal(prepararRetornoDocas(state.progress),false);
console.log('Recuperação de save isolada, persistente e sem apagar descobertas OK.');
