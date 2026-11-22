// node --experimental-default-type=module tests/prologo-save.mjs
import assert from 'node:assert/strict';
import { createNewSave, loadSaveIntoState, saveGame } from '../js/game/save.js';
import { state } from '../js/game/state.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const fresh = createNewSave(1, 'Teste');
assert.equal(fresh.progress.flags.prologoPendente, true);
loadSaveIntoState(1);
assert.equal(state.progress.flags.prologoPendente, true, 'interrupção conserva prólogo pendente');
state.progress.flags.prologoPendente = false;
saveGame();
loadSaveIntoState(1);
assert.equal(state.progress.flags.prologoPendente, false, 'pular ou terminar não repete');
const legacy = createNewSave(2, 'Antigo');
delete legacy.progress.flags.prologoPendente;
legacy.progress.flags.metroCalibrado = true;
legacy.progress.activeQuest = { id: 'embarque_dimensional', status: 'active' };
storage.set('BLOCO404_SAVE_SLOT_2', JSON.stringify(legacy));
loadSaveIntoState(2);
assert.equal(state.progress.flags.prologoPendente, undefined, 'saves antigos não recebem abertura de novo');
assert(state.progress.flags.metroCalibrado);
assert.equal(state.progress.activeQuest.id, 'embarque_dimensional');
console.log('Prólogo: novo save, interrupção, conclusão e compatibilidade com save antigo OK.');
