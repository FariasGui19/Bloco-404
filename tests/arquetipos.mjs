// Execute: node --experimental-default-type=module tests/arquetipos.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { updateAbilities, getArchetypeAbilities } from '../js/game/abilities.js';
import { isGateOpen } from '../js/game/gates.js';
import { getBlockingObject } from '../js/game/collision.js';
import { checkInteractions } from '../js/game/interactions.js';
import { closeDialogue } from '../js/ui/dialogue.js';

const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, {
  dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: ''
}]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };

state.save.loaded = false;
state.save.activeSlot = null;
state.progress.flags = {};
await loadMap('ilha_praia_inicial');
let rocha = state.objects.find(o => o.id === 'rocha_rachada');
function choose(id) {
  state.progress.archetype = id;
  state.progress.abilities = getArchetypeAbilities(id);
  state.player.x = rocha.x - 1.5;
  state.player.y = rocha.y;
  state.player.facing = 'right';
  state.player.energy = 100;
  state.player.ability = { active: null, cooldowns: {}, dash: null, effect: null, reveal: null, lastMessage: null, messageTimer: 0 };
}
function press(key) {
  input.pressed.clear();
  input.pressed.add(key);
  const result = updateAbilities(0);
  input.pressed.clear();
  return result;
}
for (const [archetype, q, r] of [
  ['lamina_dominio_anciao', 'golpe_ruptura', 'postura_dominio'],
  ['mare_astral', 'passo_corrente', 'senso_corrente'],
  ['nucleo_dez_forma', 'forma_veloz', 'eco_scan'],
]) {
  choose(archetype);
  if (archetype === 'lamina_dominio_anciao') {
    await checkInteractions(true);
    assert(!isGateOpen(rocha), 'E não deve abrir a rocha sem Q');
    assert.match(elements.dialogueText.textContent, /USE \[Q\]/);
    closeDialogue();
  }
  press('r');
  assert.equal(state.player.ability.effect.id, r);
  assert.equal(state.player.ability.reveal.targetId, 'rocha_rachada');
  assert.equal(state.player.energy, 92);
  assert(!isGateOpen(rocha), 'scan não abre obstáculos');
  press('r');
  assert.equal(state.player.energy, 92, 'recarga impede novo gasto');
  press('q');
  assert.equal(state.player.ability.effect.id, q);
  if (archetype === 'lamina_dominio_anciao') {
    assert(isGateOpen(rocha), 'ruptura abre rocha elegível');
    assert(state.progress.flags.gate_rocha_rachada);
    // Preparar a rocha para testar a percepção dos próximos arquétipos.
    state.progress.flags = {};
    await loadMap('ilha_praia_inicial');
    rocha = state.objects.find(o => o.id === 'rocha_rachada');
  } else {
    assert.equal(state.player.ability.active, q);
    for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(0.03);
    assert.equal(state.player.ability.dash, null);
    assert.equal(state.player.ability.active, null);
  }
}

// A Maré pode domar a caverna com Q quando está perto e voltada para ela.
choose('mare_astral');
const caverna = state.objects.find(o => o.id === 'caverna_alagada');
state.player.x = caverna.x - 1.5;
state.player.y = caverna.y;
press('q');
assert(isGateOpen(caverna));
await loadMap('ilha_praia_inicial');
assert(isGateOpen(state.objects.find(o => o.id === 'caverna_alagada')));

// A barreira de impulso da missão só deve ser atravessável por Bio-Forja.
state.objects = [{ id: 'barreira', x: 4, y: 4, bloqueia: true, dashPassable: true,
  hitbox: { offsetX: -0.5, offsetY: -0.5, width: 1, height: 1 } }];
state.player.ability.dash = { timeLeft: 1 };
state.player.ability.active = 'forma_veloz';
assert.equal(getBlockingObject(4, 4, 0.25, state.player)?.id, 'barreira');
state.player.ability.active = 'bio_dash';
assert.equal(getBlockingObject(4, 4, 0.25, state.player), null);
console.log('Arquétipos: Q/R, efeitos, energia, gate e colisões OK.');
