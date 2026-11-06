// Execute: node --experimental-default-type=module tests/progressao.mjs
import assert from 'node:assert/strict';
import { ARCHETYPE_KITS, KIT_SLOTS } from '../js/data/archetype-kits.js';
import { ensureArchetypeProgress, getSlotLevel } from '../js/game/progression.js';
import { getArchetypeAbilities, updateAbilities } from '../js/game/abilities.js';
import { input } from '../js/engine/input.js';
import { getSave, loadSaveIntoState, saveGame } from '../js/game/save.js';
import { state } from '../js/game/state.js';

const records = new Map();
globalThis.localStorage = {
  getItem: key => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
};
for (const [id, kit] of Object.entries(ARCHETYPE_KITS)) {
  const progress = { archetype: id, abilities: [kit.q, kit.r], flags: { anterior: true } };
  ensureArchetypeProgress(progress);
  assert.deepEqual(getArchetypeAbilities(id), [kit.q, kit.r]);
  assert.deepEqual(Object.keys(progress.archetypeProgress), [id]);
  for (const slot of KIT_SLOTS) assert.equal(getSlotLevel(progress, id, slot), 1);
  assert.equal(progress.flags.anterior, true);
}

const legacy = {
  version: 1, meta: { profileName: 'OPERADOR' }, player: { facing: 'left' },
  progress: { archetype: 'motor_bio_forja', abilities: ['bio_dash', 'bio_diagnostic'], inventory: ['fragmento'], flags: { gate_teleferico_quebrado: true } },
  world: { lastMapId: 'ilha_praia_inicial', lastSpawnId: 'inicio' },
};
records.set('BLOCO404_SAVE_SLOT_1', JSON.stringify(legacy));
const migrated = getSave(1);
assert.deepEqual(JSON.parse(records.get('BLOCO404_SAVE_SLOT_1')), legacy, 'leitura não deve sobrescrever save anterior');
assert.equal(migrated.progress.flags.gate_teleferico_quebrado, true);
assert.deepEqual(migrated.progress.abilities, legacy.progress.abilities);
assert.equal(getSlotLevel(migrated.progress, 'motor_bio_forja', 'ultimate'), 1);
loadSaveIntoState(1);
state.progress.archetypeProgress.motor_bio_forja.slots.q.level = 3;
assert(saveGame());
assert.equal(getSlotLevel(getSave(1).progress, 'motor_bio_forja', 'q'), 3);
assert.deepEqual(getSave(1).progress.inventory, ['fragmento']);
assert.equal(getSave(1).progress.flags.gate_teleferico_quebrado, true);
assert.equal(getSlotLevel(state.progress, 'mare_astral', 'q'), null);

state.progress.archetype = 'mare_astral';
state.progress.abilities = getArchetypeAbilities('mare_astral');
input.pressed.add('q');
updateAbilities(0.016);
assert.equal(state.player.ability.lastMessage, 'PASSO DE CORRENTE');
input.pressed.clear();
for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(0.03);
input.pressed.add('r');
updateAbilities(0.016);
assert.match(state.player.ability.lastMessage, /CORRENTE/);
input.pressed.clear();
console.log('Progressão: kits, níveis, Ultimate e compatibilidade de saves OK.');
