// node --experimental-default-type=module tests/lore-frequencia.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { getArchetypeAbilities, updateAbilities } from '../js/game/abilities.js';
import { input } from '../js/engine/input.js';
import { closeDialogue } from '../js/ui/dialogue.js';
import { reachFirstRoute, recordFrequencySignal } from '../js/game/frequencia-quest.js';
import { BOOT_SCENES, SIGNAL_SCENES } from '../js/ui/cutscene.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '', appendChild() {} });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id], createElement: element };
globalThis.window = { addEventListener() {} };
state.save.loaded = false; state.save.activeSlot = null;
for (const scene of [...BOOT_SCENES, ...SIGNAL_SCENES]) if (scene.image) assert(existsSync(scene.image), scene.image);

// Nenhum save antigo ou missão diferente perde seu progresso.
const unrelated = { flags: { metroCalibrado: true }, activeQuest: { id: 'outra', title: 'OUTRA' } };
reachFirstRoute(unrelated, 'ilha_enseada_ecos');
assert.equal(unrelated.activeQuest.title, 'OUTRA');
assert(recordFrequencySignal(unrelated));
assert.equal(unrelated.activeQuest.id, 'outra');
assert(!recordFrequencySignal(unrelated));
assert(!recordFrequencySignal({ flags: {} }));
const future = { flags: { metroCalibrado: true, frequencia666Registrada: true }, activeQuest: { id: 'embarque_dimensional', stage: 'cidadela', status: 'active' } };
reachFirstRoute(future, 'ilha_praia_inicial');
assert.equal(future.activeQuest.stage, 'cidadela', 'não regride etapas futuras');

for (const archetype of ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma']) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [], activeQuest: { id: 'embarque_dimensional', status: 'active' } };
  await loadMap('ilha_enseada_ecos', 'vindo_da_praia');
  const terminal = state.objects.find(o => o.id === 'terminal_frequencia_666');
  assert(terminal);
  assert.equal(state.world.currentMap.walkMask[12][14], '.');
  Object.assign(state.player, { x: terminal.x, y: terminal.y + 1, energy: 100, ability: { cooldowns: {}, dash: null } });
  const pressR = () => { input.pressed.add('r'); updateAbilities(0); input.pressed.clear(); };
  pressR();
  assert(!state.progress.flags.frequencia666Registrada, `${archetype}: metrô necessário`);
  closeDialogue();
  state.progress.flags.metroCalibrado = true;
  reachFirstRoute(state.progress, 'ilha_enseada_ecos');
  assert.equal(state.progress.activeQuest.stage, 'investigar_sinal');
  pressR();
  assert(state.progress.flags.frequencia666Registrada, `${archetype}: R registra sinal`);
  assert.equal(state.progress.activeQuest.stage, 'sinal_registrado');
  assert.equal(state.progress.activeQuest.status, 'active');
  closeDialogue();
  await loadMap('ilha_praia_inicial', 'inicio');
  assert.equal(state.progress.activeQuest.stage, 'sinal_registrado', 'voltar não regride a história');
}
console.log('Lore: sinal para os quatro módulos, pré-requisito, persistência e continuidade OK.');
