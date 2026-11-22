// node tests/carga-viva.mjs
// Área de Carga 0.11.7: bay vivo por arquétipo, trava R→Q, fragmento além
// da trava e missão do metrô atualizada no momento certo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';
import { openGate } from '../js/game/gates.js';
import { recordAirportDiagnosis, recordCargoDiagnosis } from '../js/game/metro-quest.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
state.save.loaded = false;
state.save.activeSlot = null;

const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
for (const fn of ['drawCargoEcoUnderlay', 'drawCargoEcoFloorOverlay', 'drawCargoEcoHudCallouts']) {
  assert(renderer.includes(`function ${fn}`), `${fn} existe`);
  assert(renderer.includes(`${fn}(map, state)`), `${fn} é chamado pelo drawWorld`);
}

const cases = [
  ['lamina_dominio_anciao', 'hub_camara_dominio', 'golpe_ruptura', 'dom_sala_lacre_frequencia', 'Lâmina'],
  ['mare_astral', 'hub_camara_mare', 'passo_corrente', 'mare_sala_fluxo_contido', 'Corrente'],
  ['nucleo_dez_forma', 'hub_camara_nucleo', 'forma_veloz', 'nucleo_sala_malha_cinetica', 'Pulso Veloz'],
];
for (const [archetype, room, action, sprite, keyword] of cases) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [], activeQuest: { id: 'calibracao_de_eco', status: 'active' } };
  recordAirportDiagnosis(state.progress);
  assert(state.progress.activeQuest.description.includes(keyword), `missão do aeroporto fala a língua do ${archetype}`);
  await loadMap(room, 'vindo_do_aeroporto');
  const map = state.world.currentMap;
  assert.equal(map.meta.estiloSala, 'carga_eco');
  assert.equal(map.meta.cargoKey, room.replace('hub_camara_', ''));
  const obstacle = state.objects[0];
  assert.equal(obstacle.sprite, sprite, 'trava usa arte pintada do arquétipo, não placeholder');
  assert.equal(obstacle.gate.requiredAction, action);
  assert(obstacle.gate.anyOf.some(r => r.arquetipo === archetype));
  const frag = state.collectibles.find(c => c.id === 'fragmento_sincronizacao');
  assert.equal(frag.requiresFlag, `gate_${obstacle.id}`, 'fragmento só aparece depois da trava');
  assert(state.objects.some(o => o.id === `manifesto_carga_${map.meta.cargoKey}`), 'manifesto vivo no bay');
  // Abrir a trava puxa a missão para collect_fragment na hora.
  state.progress.flags[obstacle.gate.scanFlag] = true;
  openGate(obstacle);
  assert.equal(state.progress.activeQuest.stage, 'collect_fragment');
  assert.match(state.progress.activeQuest.description, /Fragmento de Sincronização/);
}

// Bio-Forja mantém o painel de segurança + grade de impulso, agora no bay vivo.
state.progress = { archetype: 'motor_bio_forja', abilities: getArchetypeAbilities('motor_bio_forja'), flags: {}, inventory: [], activeQuest: { id: 'calibracao_de_eco', status: 'active' } };
recordAirportDiagnosis(state.progress);
await loadMap('hub_aeroporto_carga', 'vindo_do_aeroporto');
assert.equal(state.world.currentMap.meta.estiloSala, 'carga_eco');
assert.equal(state.world.currentMap.meta.cargoKey, 'bio');
const grade = state.objects.find(o => o.id === 'grade_impulso_fragmento');
assert(grade?.dashPassable, 'grade de impulso continua atravessável só com dash');
assert.equal(grade.sprite, 'bio_sala_grade_contencao');
assert.equal(grade.dashPassableRequiresFlag, 'cargoSecurityDiagnosed');
const panel = state.objects.find(o => o.id === 'painel_seguranca_carga');
assert.equal(panel.moduleSystem.id, 'cargo_security_panel');
recordCargoDiagnosis(state.progress);
assert.equal(state.progress.activeQuest.stage, 'collect_fragment');
assert.match(state.progress.activeQuest.description, /Propulsor/);

console.log('Carga viva: bays por arquétipo, travas R→Q, fragmento além da trava e missão dinâmica OK.');
