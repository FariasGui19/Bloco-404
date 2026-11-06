// Execute: node --experimental-default-type=module tests/metro-quest.mjs
import assert from 'node:assert/strict';
import { recordAirportDiagnosis, recordCargoDiagnosis, installMetroFragment } from '../js/game/metro-quest.js';
import { ACTION_SPRITES } from '../js/data/action-sprites.js';
import { ARCHETYPE_KITS } from '../js/data/archetype-kits.js';

for (const archetype of Object.keys(ARCHETYPE_KITS)) {
  const progress = { archetype, flags: { gate_teleferico_quebrado: true }, inventory: ['fragmento_sincronizacao', 'chave'], activeQuest: { id: 'calibracao_de_eco', status: 'active' }, completedQuests: [] };
  recordAirportDiagnosis(progress);
  assert.equal(progress.flags.airportTerminalDiagnosed, true);
  assert.equal(progress.activeQuest.stage, 'find_fragment');
  recordCargoDiagnosis(progress);
  assert.equal(progress.flags.cargoSecurityDiagnosed, true);
  assert.equal(progress.activeQuest.stage, 'collect_fragment');
  installMetroFragment(progress);
  assert.equal(progress.flags.metroUnlocked, true);
  assert.equal(progress.flags.metroCalibrado, true);
  assert.equal(progress.flags.gate_teleferico_quebrado, true);
  assert.deepEqual(progress.inventory, ['chave']);
  assert.deepEqual(progress.completedQuests, ['calibracao_de_eco']);
  assert.equal(progress.activeQuest.id, 'embarque_dimensional');
  installMetroFragment(progress);
  assert.deepEqual(progress.completedQuests, ['calibracao_de_eco']);
}
const other = { flags: { existe: true }, activeQuest: { id: 'outra' }, inventory: ['outro'] };
recordAirportDiagnosis(other);
recordCargoDiagnosis(other);
installMetroFragment(other);
assert.equal(other.activeQuest.id, 'outra');
assert.deepEqual(other.inventory, ['outro']);

assert.equal(ACTION_SPRITES.golpe_ruptura.sprite, 'player_dominio_reference');
assert.equal(ACTION_SPRITES.passo_corrente.sprite, 'player_mare_reference');
assert.equal(ACTION_SPRITES.forma_veloz.column, 2);
assert.equal(ACTION_SPRITES.postura_dominio, undefined, 'R deve manter o sprite atual');
assert.equal(ACTION_SPRITES.senso_corrente, undefined, 'R deve manter o sprite atual');
console.log('Missão do metrô e seleção de poses provisórias OK.');
